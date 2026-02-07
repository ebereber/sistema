import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import { createClient } from "@/lib/supabase/server";

// ─── Types ─────────────────────────────────────────────

export interface TransferItemInput {
  productId: string;
  quantity: number;
}

export interface CreateTransferInput {
  sourceLocationId: string;
  destinationLocationId: string;
  items: TransferItemInput[];
  notes?: string;
  transferDate?: string;
  markAsReceived: boolean;
}

export interface ReceiveItemInput {
  itemId: string;
  quantityReceived: number;
}

export interface TransferFilters {
  search?: string;
  status?: string[];
  page?: number;
  pageSize?: number;
}

function generateTransferNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `T-${date}-${hash}`;
}

// ─── Create Transfer ──────────────────────────────────

export async function createTransfer(input: CreateTransferInput) {
  const supabase = await createClient();
  const user = await getServerUser();
  if (!user?.organization_id) throw new Error("Not authenticated");
  const organizationId = user.organization_id;
  const userId = user.id;
  const transferNumber = generateTransferNumber();

  if (input.sourceLocationId === input.destinationLocationId) {
    throw new Error("Origen y destino no pueden ser la misma ubicación");
  }

  if (input.items.length === 0) {
    throw new Error("Debe agregar al menos un producto");
  }

  // 1. Create the transfer
  const { data: transfer, error: transferError } = await supabase
    .from("transfers")
    .insert({
      transfer_number: transferNumber,
      source_location_id: input.sourceLocationId,
      destination_location_id: input.destinationLocationId,
      status: input.markAsReceived ? "completed" : "in_transit",
      notes: input.notes || null,
      transfer_date: input.transferDate || new Date().toISOString(),
      created_by: userId,
      organization_id: organizationId,
    })
    .select("id")
    .single();

  if (transferError || !transfer) {
    console.error("Error creating transfer:", transferError);
    throw new Error("Error al crear la transferencia");
  }

  // 2. Create transfer items
  const itemsToInsert = input.items.map((item) => ({
    transfer_id: transfer.id,
    product_id: item.productId,
    quantity: item.quantity,
    quantity_received: input.markAsReceived ? item.quantity : 0,
  }));

  const { error: itemsError } = await supabase
    .from("transfer_items")
    .insert(itemsToInsert);

  if (itemsError) {
    console.error("Error creating transfer items:", itemsError);
    // Cleanup: delete the transfer
    await supabase.from("transfers").delete().eq("id", transfer.id);
    throw new Error("Error al crear los items de transferencia");
  }

  // 3. Decrease stock from source location for ALL items
  for (const item of input.items) {
    const { error: stockError } = await supabase.rpc("decrease_stock", {
      p_product_id: item.productId,
      p_location_id: input.sourceLocationId,
      p_quantity: item.quantity,
    });

    if (stockError) {
      console.error("Error decreasing stock:", stockError);
    }

    // Register stock movement (out from source)
    await supabase.from("stock_movements").insert({
      product_id: item.productId,
      location_from_id: input.sourceLocationId,
      location_to_id: input.destinationLocationId,
      quantity: item.quantity,
      reason: "transfer_out",
      reference_type: "transfer",
      reference_id: transfer.id,
      created_by: userId,
    });
  }

  // 4. If marked as received, also increase stock at destination
  if (input.markAsReceived) {
    for (const item of input.items) {
      const { error: stockError } = await supabase.rpc(
        "increase_stock_from_purchase",
        {
          p_product_id: item.productId,
          p_location_id: input.destinationLocationId,
          p_quantity: item.quantity,
        },
      );

      if (stockError) {
        console.error("Error increasing stock at destination:", stockError);
      }
    }
  }

  return transfer.id;
}

// ─── Receive Transfer (partial or complete) ───────────

export async function receiveTransfer(
  transferId: string,
  receivedItems: ReceiveItemInput[],
) {
  const supabase = await createClient();
  const user = await getServerUser();
  if (!user?.organization_id) throw new Error("Not authenticated");
  const organizationId = user.organization_id;
  const userId = user.id;

  // Get transfer with items
  const { data: transfer, error: transferError } = await supabase
    .from("transfers")
    .select(
      `
      *,
      items:transfer_items(id, product_id, quantity, quantity_received)
    `,
    )
    .eq("id", transferId)
    .eq("organization_id", organizationId)
    .single();

  if (transferError || !transfer) {
    throw new Error("Transferencia no encontrada");
  }

  if (transfer.status !== "in_transit") {
    throw new Error("La transferencia no está en tránsito");
  }

  // Process each received item
  for (const received of receivedItems) {
    const item = transfer.items.find((i) => i.id === received.itemId);
    if (!item) continue;

    // Calculate new quantity to add (only the delta)
    const previouslyReceived = item.quantity_received;
    const newTotalReceived = Math.min(received.quantityReceived, item.quantity);
    const delta = newTotalReceived - previouslyReceived;

    if (delta <= 0) continue; // No new items received for this product

    // Update transfer_item quantity_received
    const { error: updateError } = await supabase
      .from("transfer_items")
      .update({ quantity_received: newTotalReceived })
      .eq("id", received.itemId);

    if (updateError) {
      console.error("Error updating transfer item:", updateError);
      continue;
    }

    // Increase stock at destination for the delta only
    const { error: stockError } = await supabase.rpc(
      "increase_stock_from_purchase",
      {
        p_product_id: item.product_id,
        p_location_id: transfer.destination_location_id,
        p_quantity: delta,
      },
    );

    if (stockError) {
      console.error("Error increasing stock at destination:", stockError);
    }

    // Register stock movement (in to destination)
    await supabase.from("stock_movements").insert({
      product_id: item.product_id,
      location_from_id: transfer.source_location_id,
      location_to_id: transfer.destination_location_id,
      quantity: delta,
      reason: "transfer_in",
      reference_type: "transfer",
      reference_id: transferId,
      created_by: userId,
    });
  }

  // Check if all items are fully received
  const { data: updatedItems } = await supabase
    .from("transfer_items")
    .select("quantity, quantity_received")
    .eq("transfer_id", transferId);

  const allReceived = updatedItems?.every(
    (item) => item.quantity_received >= item.quantity,
  );

  if (allReceived) {
    await supabase
      .from("transfers")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", transferId);
  }

  return { completed: allReceived };
}

// ─── Cancel Transfer ──────────────────────────────────

export async function cancelTransfer(transferId: string) {
  const supabase = await createClient();
  const user = await getServerUser();
  if (!user?.organization_id) throw new Error("Not authenticated");
  const organizationId = user.organization_id;
  const userId = user.id;

  const { data: transfer, error: transferError } = await supabase
    .from("transfers")
    .select(
      `
      *,
      items:transfer_items(id, product_id, quantity, quantity_received)
    `,
    )
    .eq("id", transferId)
    .eq("organization_id", organizationId)
    .single();

  if (transferError || !transfer) {
    throw new Error("Transferencia no encontrada");
  }

  if (transfer.status === "cancelled") {
    throw new Error("La transferencia ya fue cancelada");
  }

  if (transfer.status === "completed") {
    throw new Error("No se puede cancelar una transferencia completada");
  }

  // Return unreceived stock to source
  for (const item of transfer.items) {
    const unreceived = item.quantity - item.quantity_received;

    if (unreceived > 0) {
      // Return unreceived quantity to source location
      const { error: stockError } = await supabase.rpc(
        "increase_stock_from_purchase",
        {
          p_product_id: item.product_id,
          p_location_id: transfer.source_location_id,
          p_quantity: unreceived,
        },
      );

      if (stockError) {
        console.error("Error returning stock to source:", stockError);
      }

      // Register stock movement (return to source)
      await supabase.from("stock_movements").insert({
        product_id: item.product_id,
        location_from_id: transfer.destination_location_id,
        location_to_id: transfer.source_location_id,
        quantity: unreceived,
        reason: "transfer_cancelled",
        reference_type: "transfer",
        reference_id: transferId,
        created_by: userId,
      });
    }
  }

  // Update transfer status
  const { error: updateError } = await supabase
    .from("transfers")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", transferId);

  if (updateError) {
    throw new Error("Error al cancelar la transferencia");
  }
}

// ─── Get Transfer by ID ──────────────────────────────

export async function getTransferById(transferId: string) {
  const supabase = await createClient();
  const organizationId = await getOrganizationId();

  const { data, error } = await supabase
    .from("transfers")
    .select(
      `
      *,
      source_location:locations!transfers_source_location_id_fkey(id, name),
      destination_location:locations!transfers_destination_location_id_fkey(id, name),
      creator:users!transfers_created_by_fkey(id, name),
      items:transfer_items(
        id,
        product_id,
        quantity,
        quantity_received,
        product:products(id, name, sku, image_url)
      )
    `,
    )
    .eq("id", transferId)
    .eq("organization_id", organizationId)
    .single();

  if (error || !data) {
    throw new Error("Transferencia no encontrada");
  }

  return data;
}

// ─── List Transfers ──────────────────────────────────

export async function getTransfers(filters: TransferFilters = {}) {
  const supabase = await createClient();
  const organizationId = await getOrganizationId();
  const { search, status, page = 1, pageSize = 20 } = filters;

  let query = supabase
    .from("transfers")
    .select(
      `
      *,
      source_location:locations!transfers_source_location_id_fkey(id, name),
      destination_location:locations!transfers_destination_location_id_fkey(id, name),
      items:transfer_items(id, product_id, quantity, quantity_received, product:products(name))
    `,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (status && status.length > 0) {
    query = query.in("status", status);
  }

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching transfers:", error);
    throw new Error("Error al obtener transferencias");
  }

  return {
    transfers: data || [],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

// ─── Get Products by Location (for the create form) ──

export async function getProductsByLocation(locationId: string) {
  const supabase = await createClient();
  const organizationId = await getOrganizationId();

  const { data, error } = await supabase
    .from("stock")
    .select(
      `
      quantity,
      product:products!inner(
        id, name, sku, barcode, image_url, active, organization_id
      )
    `,
    )
    .eq("location_id", locationId)
    .gt("quantity", 0);

  if (error) {
    console.error("Error fetching products by location:", error);
    throw new Error("Error al obtener productos");
  }

  // Filter by organization and active, flatten structure
  return (data || [])
    .filter(
      (row) =>
        row.product &&
        row.product.organization_id === organizationId &&
        row.product.active,
    )
    .map((row) => ({
      id: row.product.id,
      name: row.product.name,
      sku: row.product.sku,
      barcode: row.product.barcode,
      imageUrl: row.product.image_url,
      availableStock: row.quantity,
    }));
}

// ─── Get Locations ───────────────────────────────────

export async function getLocations() {
  const supabase = await createClient();
  const organizationId = await getOrganizationId();

  const { data, error } = await supabase
    .from("locations")
    .select("id, name, is_main, active")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .order("is_main", { ascending: false })
    .order("name");

  if (error) {
    throw new Error("Error al obtener ubicaciones");
  }

  return data || [];
}

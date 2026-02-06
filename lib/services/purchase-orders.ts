import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Types (regenerar con pnpm supabase gen types... después de crear las tablas)
// ---------------------------------------------------------------------------

export interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id: string;
  location_id: string | null;
  order_date: string;
  expected_delivery_date: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string | null;
  name: string;
  sku: string | null;
  quantity: number;
  quantity_received: number;
  unit_cost: number;
  subtotal: number;
  type: string;
  created_at: string;
}

export interface PurchaseOrderHistoryEntry {
  id: string;
  purchase_order_id: string;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  created_by: string | null;
  created_at: string;
  user: { name: string } | null;
}

export interface PurchaseOrderWithDetails extends PurchaseOrder {
  items: PurchaseOrderItem[];
  history: PurchaseOrderHistoryEntry[];
  supplier: { id: string; name: string } | null;
  location: { id: string; name: string } | null;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface CreatePurchaseOrderItemData {
  product_id: string | null;
  name: string;
  sku: string | null;
  quantity: number;
  unit_cost: number;
  subtotal: number;
  type: "product" | "custom";
}

export interface CreatePurchaseOrderData {
  supplier_id: string;
  location_id: string | null;
  order_date: string;
  expected_delivery_date: string | null;
  notes: string | null;
}

export type UpdatePurchaseOrderData = CreatePurchaseOrderData;

export interface GetPurchaseOrdersFilters {
  search?: string;
  statuses?: string[];
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface GetPurchaseOrdersResult {
  data: (PurchaseOrder & {
    supplier: { id: string; name: string } | null;
    location: { id: string; name: string } | null;
  })[];
  count: number;
}

export interface ReceiveItemInput {
  itemId: string;
  quantityReceived: number;
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createPurchaseOrder(
  data: CreatePurchaseOrderData,
  items: CreatePurchaseOrderItemData[],
): Promise<PurchaseOrder> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Get organization_id
  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  if (!userData?.organization_id) throw new Error("Usuario sin organización");
  const organizationId = userData.organization_id;

  const { data: orderNumber, error: rpcError } = await supabase.rpc(
    "generate_purchase_order_number",
  );
  if (rpcError) throw rpcError;

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);

  const { data: order, error } = await supabase
    .from("purchase_orders")
    .insert({
      order_number: orderNumber as string,
      supplier_id: data.supplier_id,
      location_id: data.location_id,
      order_date: data.order_date,
      expected_delivery_date: data.expected_delivery_date,
      subtotal: total,
      total,
      status: "draft",
      notes: data.notes,
      created_by: user.id,
      organization_id: organizationId,
    })
    .select()
    .single();

  if (error) throw error;

  // Insert items
  if (items.length > 0) {
    const { error: itemsError } = await supabase
      .from("purchase_order_items")
      .insert(
        items.map((item) => ({
          purchase_order_id: order.id,
          product_id: item.product_id,
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          subtotal: item.subtotal,
          type: item.type,
        })),
      );
    if (itemsError) throw itemsError;
  }

  // History: created
  await addHistory(order.id, user.id, "Creada");

  return order;
}

// ---------------------------------------------------------------------------
// Read (list)
// ---------------------------------------------------------------------------

export async function getPurchaseOrders(
  filters?: GetPurchaseOrdersFilters,
): Promise<GetPurchaseOrdersResult> {
  const supabase = createClient();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("purchase_orders")
    .select("*, supplier:suppliers(id, name), location:locations(id, name)", {
      count: "exact",
    })
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters?.search) {
    query = query.or(
      `order_number.ilike.%${filters.search}%,suppliers.name.ilike.%${filters.search}%`,
    );
  }

  if (filters?.statuses && filters.statuses.length > 0) {
    query = query.in("status", filters.statuses);
  }

  if (filters?.dateFrom) {
    query = query.gte("order_date", filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte("order_date", filters.dateTo);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: (data as any[]) || [],
    count: count || 0,
  };
}

// ---------------------------------------------------------------------------
// Read (single with details)
// ---------------------------------------------------------------------------

export async function getPurchaseOrderById(
  id: string,
): Promise<PurchaseOrderWithDetails> {
  const supabase = createClient();
  const { data: order, error } = await supabase
    .from("purchase_orders")
    .select("*, supplier:suppliers(id, name), location:locations(id, name)")
    .eq("id", id)
    .single();

  if (error) throw error;

  const { data: items, error: itemsError } = await supabase
    .from("purchase_order_items")
    .select("*")
    .eq("purchase_order_id", id)
    .order("created_at");

  if (itemsError) throw itemsError;

  const { data: history, error: historyError } = await supabase
    .from("purchase_order_history")
    .select("*, user:users!purchase_order_history_user_fkey(name)")
    .eq("purchase_order_id", id)
    .order("created_at", { ascending: false });

  if (historyError) throw historyError;

  return {
    ...order,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supplier: (order as any).supplier || null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    location: (order as any).location || null,
    items: items || [],
    history: (history || []) as PurchaseOrderHistoryEntry[],
  };
}

// ---------------------------------------------------------------------------
// Update (only draft/confirmed)
// ---------------------------------------------------------------------------

export async function updatePurchaseOrder(
  id: string,
  data: UpdatePurchaseOrderData,
  items: CreatePurchaseOrderItemData[],
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);

  const { error } = await supabase
    .from("purchase_orders")
    .update({
      supplier_id: data.supplier_id,
      location_id: data.location_id,
      order_date: data.order_date,
      expected_delivery_date: data.expected_delivery_date,
      subtotal: total,
      total,
      notes: data.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;

  // Replace items: delete existing + insert new
  const { error: deleteError } = await supabase
    .from("purchase_order_items")
    .delete()
    .eq("purchase_order_id", id);

  if (deleteError) throw deleteError;

  if (items.length > 0) {
    const { error: insertError } = await supabase
      .from("purchase_order_items")
      .insert(
        items.map((item) => ({
          purchase_order_id: id,
          product_id: item.product_id,
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          subtotal: item.subtotal,
          type: item.type,
        })),
      );
    if (insertError) throw insertError;
  }

  await addHistory(id, user.id, "Actualizada");
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

export async function confirmPurchaseOrder(id: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("purchase_orders")
    .update({ status: "confirmed", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "draft");

  if (error) throw error;

  await addHistory(
    id,
    user.id,
    "Actualizada",
    "Estado",
    "Borrador",
    "Confirmada",
  );
}

export async function cancelPurchaseOrder(id: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: order } = await supabase
    .from("purchase_orders")
    .select("status")
    .eq("id", id)
    .single();

  const oldStatus = order?.status || "unknown";

  const { error } = await supabase
    .from("purchase_orders")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;

  await addHistory(
    id,
    user.id,
    "Actualizada",
    "Estado",
    oldStatus,
    "Cancelada",
  );
}

// ---------------------------------------------------------------------------
// Receive products
// ---------------------------------------------------------------------------

export async function receiveProducts(
  orderId: string,
  receivedItems: ReceiveItemInput[],
): Promise<string> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Leer estado ANTES de hacer cambios
  const { data: order } = await supabase
    .from("purchase_orders")
    .select("status")
    .eq("id", orderId)
    .single();

  const oldStatus = order?.status || "confirmed";

  // Actualizar cantidades recibidas
  for (const ri of receivedItems) {
    const { error } = await supabase
      .from("purchase_order_items")
      .update({ quantity_received: ri.quantityReceived })
      .eq("id", ri.itemId);

    if (error) throw error;
  }

  // Re-leer items para determinar estado final
  const { data: items, error: readError } = await supabase
    .from("purchase_order_items")
    .select("quantity, quantity_received")
    .eq("purchase_order_id", orderId);

  if (readError) throw readError;

  const someReceived = (items || []).some((i) => i.quantity_received > 0);
  const allReceived = (items || []).every(
    (i) => i.quantity_received >= i.quantity,
  );

  let newStatus: string;
  if (allReceived) {
    newStatus = "received";
  } else if (someReceived) {
    newStatus = "partial";
  } else {
    newStatus = "confirmed";
  }

  if (oldStatus !== newStatus) {
    const { error: updateError } = await supabase
      .from("purchase_orders")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", orderId);

    if (updateError) throw updateError;

    const statusLabel: Record<string, string> = {
      draft: "Borrador",
      confirmed: "Confirmada",
      partial: "Parcial",
      received: "Recibida",
    };

    await addHistory(
      orderId,
      user.id,
      "Actualizada",
      "Estado",
      statusLabel[oldStatus] || oldStatus,
      statusLabel[newStatus] || newStatus,
    );
  }

  return newStatus;
}

// ---------------------------------------------------------------------------
// History helper
// ---------------------------------------------------------------------------

async function addHistory(
  orderId: string,
  userId: string,
  action: string,
  fieldName?: string,
  oldValue?: string,
  newValue?: string,
): Promise<void> {
  const supabase = createClient();
  await supabase.from("purchase_order_history").insert({
    purchase_order_id: orderId,
    action,
    field_name: fieldName || null,
    old_value: oldValue || null,
    new_value: newValue || null,
    created_by: userId,
  });
}

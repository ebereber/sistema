"use server";

import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import type {
  CreatePurchaseOrderData,
  CreatePurchaseOrderItemData,
  PurchaseOrder,
  ReceiveItemInput,
} from "@/lib/services/purchase-orders";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";

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
  await supabaseAdmin.from("purchase_order_history").insert({
    purchase_order_id: orderId,
    action,
    field_name: fieldName || null,
    old_value: oldValue || null,
    new_value: newValue || null,
    created_by: userId,
  });
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createPurchaseOrderAction(
  data: CreatePurchaseOrderData,
  items: CreatePurchaseOrderItemData[],
): Promise<PurchaseOrder> {
  const user = await getServerUser();
  if (!user) throw new Error("No autenticado");
  const organizationId = await getOrganizationId();

  const { data: orderNumber, error: rpcError } = await supabaseAdmin.rpc(
    "generate_purchase_order_number",
  );
  if (rpcError) throw rpcError;

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);

  const { data: order, error } = await supabaseAdmin
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

  if (items.length > 0) {
    const { error: itemsError } = await supabaseAdmin
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

  await addHistory(order.id, user.id, "Creada");

  revalidateTag("purchase-orders", "minutes");

  return order;
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updatePurchaseOrderAction(
  id: string,
  data: CreatePurchaseOrderData,
  items: CreatePurchaseOrderItemData[],
): Promise<void> {
  const user = await getServerUser();
  if (!user) throw new Error("No autenticado");

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);

  const { error } = await supabaseAdmin
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

  const { error: deleteError } = await supabaseAdmin
    .from("purchase_order_items")
    .delete()
    .eq("purchase_order_id", id);

  if (deleteError) throw deleteError;

  if (items.length > 0) {
    const { error: insertError } = await supabaseAdmin
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

  revalidateTag("purchase-orders", "minutes");
}

// ---------------------------------------------------------------------------
// Confirm (draft → confirmed)
// ---------------------------------------------------------------------------

export async function confirmPurchaseOrderAction(id: string): Promise<void> {
  const user = await getServerUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabaseAdmin
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

  revalidateTag("purchase-orders", "minutes");
}

// ---------------------------------------------------------------------------
// Cancel
// ---------------------------------------------------------------------------

export async function cancelPurchaseOrderAction(id: string): Promise<void> {
  const user = await getServerUser();
  if (!user) throw new Error("No autenticado");

  const { data: order } = await supabaseAdmin
    .from("purchase_orders")
    .select("status")
    .eq("id", id)
    .single();

  const oldStatus = order?.status || "unknown";

  const { error } = await supabaseAdmin
    .from("purchase_orders")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;

  const statusLabel: Record<string, string> = {
    draft: "Borrador",
    confirmed: "Confirmada",
    partial: "Parcial",
    received: "Recibida",
  };

  await addHistory(
    id,
    user.id,
    "Actualizada",
    "Estado",
    statusLabel[oldStatus] || oldStatus,
    "Cancelada",
  );

  revalidateTag("purchase-orders", "minutes");
}

// ---------------------------------------------------------------------------
// Receive products
// ---------------------------------------------------------------------------

export async function receiveProductsAction(
  orderId: string,
  receivedItems: ReceiveItemInput[],
): Promise<string> {
  const user = await getServerUser();
  if (!user) throw new Error("No autenticado");

  // Read status BEFORE changes
  const { data: order } = await supabaseAdmin
    .from("purchase_orders")
    .select("status")
    .eq("id", orderId)
    .single();

  const oldStatus = order?.status || "confirmed";

  // Update received quantities
  for (const ri of receivedItems) {
    const { error } = await supabaseAdmin
      .from("purchase_order_items")
      .update({ quantity_received: ri.quantityReceived })
      .eq("id", ri.itemId);

    if (error) throw error;
  }

  // Re-read items to determine final status
  const { data: items, error: readError } = await supabaseAdmin
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
    const { error: updateError } = await supabaseAdmin
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

  revalidateTag("purchase-orders", "minutes");

  return newStatus;
}

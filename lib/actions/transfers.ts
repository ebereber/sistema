"use server";

import { syncSaleStockToMercadoLibre } from "@/lib/actions/mercadolibre";
import { syncSaleStockToTiendanube } from "@/lib/actions/tiendanube";
import {
  cancelTransfer,
  createTransfer,
  getProductsByLocation,
  receiveTransfer,
  type CreateTransferInput,
  type ReceiveItemInput,
} from "@/lib/services/transfers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";

export async function createTransferAction(input: CreateTransferInput) {
  const transferId = await createTransfer(input);
  revalidateTag("transfers", "minutes");
  revalidateTag("products", "minutes");

  // Sync stock to integrations (fire-and-forget)
  const productIds = input.items.map((i) => i.productId);
  if (productIds.length > 0) {
    syncSaleStockToTiendanube(productIds).catch(() => {});
    syncSaleStockToMercadoLibre(productIds).catch(() => {});
  }

  return transferId;
}

export async function receiveTransferAction(
  transferId: string,
  receivedItems: ReceiveItemInput[],
) {
  const result = await receiveTransfer(transferId, receivedItems);
  revalidateTag("transfers", "minutes");
  revalidateTag("products", "minutes");

  // Get product IDs from transfer items to sync stock
  const { data: transferItems } = await supabaseAdmin
    .from("transfer_items")
    .select("product_id")
    .eq("transfer_id", transferId);

  const productIds = (transferItems || []).map((i) => i.product_id);
  if (productIds.length > 0) {
    syncSaleStockToTiendanube(productIds).catch(() => {});
    syncSaleStockToMercadoLibre(productIds).catch(() => {});
  }

  return result;
}

export async function cancelTransferAction(transferId: string) {
  // Get product IDs before canceling (items may be cleaned up)
  const { data: transferItems } = await supabaseAdmin
    .from("transfer_items")
    .select("product_id")
    .eq("transfer_id", transferId);

  await cancelTransfer(transferId);
  revalidateTag("transfers", "minutes");
  revalidateTag("products", "minutes");

  // Sync stock to integrations (fire-and-forget)
  const productIds = (transferItems || []).map((i) => i.product_id);
  if (productIds.length > 0) {
    syncSaleStockToTiendanube(productIds).catch(() => {});
    syncSaleStockToMercadoLibre(productIds).catch(() => {});
  }
}

export async function getProductsByLocationAction(locationId: string) {
  return getProductsByLocation(locationId);
}

"use server";

import {
  cancelTransfer,
  createTransfer,
  getProductsByLocation,
  receiveTransfer,
  type CreateTransferInput,
  type ReceiveItemInput,
} from "@/lib/services/transfers";
import { revalidateTag } from "next/cache";

export async function createTransferAction(input: CreateTransferInput) {
  const transferId = await createTransfer(input);
  revalidateTag("transfers", "minutes");
  revalidateTag("products", "minutes");
  return transferId;
}

export async function receiveTransferAction(
  transferId: string,
  receivedItems: ReceiveItemInput[],
) {
  const result = await receiveTransfer(transferId, receivedItems);
  revalidateTag("transfers", "minutes");
  revalidateTag("products", "minutes");
  return result;
}

export async function cancelTransferAction(transferId: string) {
  await cancelTransfer(transferId);
  revalidateTag("transfers", "minutes");
  revalidateTag("products", "minutes");
}

export async function getProductsByLocationAction(locationId: string) {
  return getProductsByLocation(locationId);
}

import { meliApiFetch, type MeliAccount } from "@/lib/mercadolibre";
import type { MeliItem, MeliOrder } from "@/types/mercadolibre";

/**
 * Get all item IDs for the account using scroll search.
 * GET /users/{user_id}/items/search?search_type=scan&limit=100
 */
export async function getAllMeliItemIds(
  account: MeliAccount,
): Promise<string[]> {
  const allIds: string[] = [];
  let scrollId: string | null = null;

  while (true) {
    let url = `/users/${account.meli_user_id}/items/search?search_type=scan&limit=100`;
    if (scrollId) {
      url += `&scroll_id=${scrollId}`;
    }

    const response = await meliApiFetch(account, url);
    if (!response.ok) break;

    const data = await response.json();
    const ids: string[] = data.results || [];
    allIds.push(...ids);

    scrollId = data.scroll_id || null;

    if (ids.length === 0) break;
  }

  return allIds;
}

/**
 * Get item details using multiget (up to 20 at a time).
 * GET /items?ids=MLA1,MLA2,...&attributes=...
 */
export async function getMeliItems(
  account: MeliAccount,
  itemIds: string[],
): Promise<MeliItem[]> {
  const items: MeliItem[] = [];

  for (let i = 0; i < itemIds.length; i += 20) {
    const chunk = itemIds.slice(i, i + 20);
    const ids = chunk.join(",");
    const response = await meliApiFetch(
      account,
      `/items?ids=${ids}&attributes=id,title,price,available_quantity,status,pictures,variations,category_id,date_created,seller_custom_field`,
    );
    if (!response.ok) continue;

    const data = await response.json();
    for (const result of data) {
      if (result.code === 200 && result.body) {
        items.push(result.body);
      }
    }
  }

  return items;
}

/**
 * Get single item details.
 */
export async function getMeliItem(
  account: MeliAccount,
  itemId: string,
): Promise<MeliItem | null> {
  const response = await meliApiFetch(account, `/items/${itemId}`);
  if (!response.ok) return null;
  return response.json();
}

/**
 * Fetch a single order from MercadoLibre.
 * GET /orders/{order_id}
 */
export async function getMeliOrder(
  account: MeliAccount,
  orderId: number,
): Promise<MeliOrder | null> {
  const response = await meliApiFetch(account, `/orders/${orderId}`);
  if (!response.ok) return null;
  return response.json();
}

/**
 * Check if a MeLi API error response contains "item.price.not_modifiable".
 */
function isPriceNotModifiable(errorBody: string): boolean {
  return errorBody.includes("item.price.not_modifiable");
}

/**
 * Update stock (and optionally price) for an item on MercadoLibre.
 * - Simple item: PUT /items/{item_id} { available_quantity, price? }
 * - With variation: PUT /items/{item_id}/variations/{variation_id} { available_quantity }
 *   then PUT /items/{item_id} { price } (price is item-level, not variation-level)
 *
 * If price is not modifiable (MeLi catalog items), retries with stock only.
 */
export async function updateMeliItemStock(
  account: MeliAccount,
  meliItemId: string,
  meliVariationId: number | null,
  quantity: number,
  price?: number,
): Promise<void> {
  if (meliVariationId) {
    // Update variation stock
    const varResponse = await meliApiFetch(
      account,
      `/items/${meliItemId}/variations/${meliVariationId}`,
      {
        method: "PUT",
        body: JSON.stringify({ available_quantity: quantity }),
      },
    );
    if (!varResponse.ok) {
      const errorBody = await varResponse.text().catch(() => "");
      throw new Error(
        `MeLi variation stock update failed for ${meliItemId}/${meliVariationId}: ${varResponse.status} ${errorBody}`,
      );
    }
    // Update item-level price if provided
    if (price !== undefined) {
      const priceResponse = await meliApiFetch(
        account,
        `/items/${meliItemId}`,
        {
          method: "PUT",
          body: JSON.stringify({ price }),
        },
      );
      if (!priceResponse.ok) {
        const errBody = await priceResponse.text().catch(() => "");
        if (isPriceNotModifiable(errBody)) {
          console.warn(
            `MeLi: price not modifiable for ${meliItemId} (catalog item), stock updated OK`,
          );
        }
      }
    }
  } else {
    const body: Record<string, unknown> = { available_quantity: quantity };
    if (price !== undefined) {
      body.price = price;
    }
    const response = await meliApiFetch(account, `/items/${meliItemId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      // If price is not modifiable, retry without price
      if (price !== undefined && isPriceNotModifiable(errorBody)) {
        console.warn(
          `MeLi: price not modifiable for ${meliItemId} (catalog item), retrying stock only`,
        );
        const retryResponse = await meliApiFetch(
          account,
          `/items/${meliItemId}`,
          {
            method: "PUT",
            body: JSON.stringify({ available_quantity: quantity }),
          },
        );
        if (!retryResponse.ok) {
          const retryError = await retryResponse.text().catch(() => "");
          throw new Error(
            `MeLi item update failed for ${meliItemId}: ${retryResponse.status} ${retryError}`,
          );
        }
        return;
      }
      throw new Error(
        `MeLi item update failed for ${meliItemId}: ${response.status} ${errorBody}`,
      );
    }
  }
}

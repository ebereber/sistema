import { z } from "zod";

export const DISCOUNT_TYPES = ["percentage", "fixed"] as const;

// Schema for item-level discount
export const itemDiscountSchema = z.object({
  type: z.enum(DISCOUNT_TYPES),
  value: z.number().min(0, "El valor debe ser mayor o igual a 0"),
});

// Schema for cart item
export const cartItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid().nullable(), // null for custom items
  name: z.string(),
  sku: z.string(),
  basePrice: z.number().min(0), // Original price without price list adjustments
  price: z.number().min(0),
  cost: z.number().nullable().default(null),
  quantity: z.number().int().min(1, "La cantidad debe ser al menos 1"),
  taxRate: z.number().min(0).max(100).default(21),
  discount: itemDiscountSchema.optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
});

// Schema for global discount
export const globalDiscountSchema = z.object({
  type: z.enum(DISCOUNT_TYPES),
  value: z.number().min(0, "El valor debe ser mayor o igual a 0"),
});

// Schema for selected customer
export const selectedCustomerSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string(),
  taxId: z.string().optional().nullable(),
  taxCategory: z.string().optional().nullable(),
  priceListId: z.string().uuid().optional().nullable(),
  priceListName: z.string().optional().nullable(),
  priceListAdjustment: z.number().optional().nullable(),
  priceListAdjustmentType: z
    .enum(["AUMENTO", "DESCUENTO"])
    .optional()
    .nullable(),
});

// Types derived from schemas
export type DiscountType = z.infer<typeof itemDiscountSchema>["type"];
export type ItemDiscount = z.infer<typeof itemDiscountSchema>;
export type CartItem = z.infer<typeof cartItemSchema>;
export type GlobalDiscount = z.infer<typeof globalDiscountSchema>;
export type SelectedCustomer = z.infer<typeof selectedCustomerSchema>;

// Cart totals type (not a schema, calculated)
export interface CartTotals {
  subtotal: number;
  itemDiscounts: number;
  globalDiscount: number;
  taxes: number;
  total: number;
}

// Default customer for "Consumidor Final"
export const DEFAULT_CUSTOMER: SelectedCustomer = {
  id: "1c7e2d2d-4ad8-48e3-bd11-f87cafaa2e6d",
  name: "Consumidor Final",
  taxId: "0",
  taxCategory: "Consumidor Final",
  priceListId: null,
  priceListName: null,
  priceListAdjustment: null,
  priceListAdjustmentType: null,
};

/**
 * Calculate discount amount for a single item
 */
export function calculateItemDiscount(
  price: number,
  quantity: number,
  discount: ItemDiscount | null | undefined,
): number {
  if (!discount) return 0;

  const subtotal = price * quantity;
  if (discount.type === "percentage") {
    return subtotal * (discount.value / 100);
  }
  return Math.min(discount.value * quantity, subtotal);
}

/**
 * Calculate item total after discount
 */
export function calculateItemTotal(item: CartItem): number {
  const subtotal = item.price * item.quantity;
  const discountAmount = calculateItemDiscount(
    item.price,
    item.quantity,
    item.discount,
  );
  return subtotal - discountAmount;
}

export interface CartTotals {
  grossSubtotal: number; // suma bruta (con IVA, antes de descuentos)
  subtotal: number; // neto sin IVA (después de descuentos)
  itemDiscounts: number;
  globalDiscount: number;
  taxes: number; // IVA extraído
  total: number; // final después de descuentos
}

export function calculateCartTotals(
  items: CartItem[],
  globalDiscount: GlobalDiscount | null,
): CartTotals {
  // Bruto con IVA (antes de descuentos)
  const grossSubtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  // Descuentos por item
  const itemDiscounts = items.reduce(
    (sum, item) =>
      sum + calculateItemDiscount(item.price, item.quantity, item.discount),
    0,
  );

  const afterItemDiscounts = grossSubtotal - itemDiscounts;

  // Descuento global
  let globalDiscountAmount = 0;
  if (globalDiscount) {
    if (globalDiscount.type === "percentage") {
      globalDiscountAmount = afterItemDiscounts * (globalDiscount.value / 100);
    } else {
      globalDiscountAmount = Math.min(globalDiscount.value, afterItemDiscounts);
    }
  }

  const total = afterItemDiscounts - globalDiscountAmount;

  // Extraer IVA de cada item proporcionalmente
  let taxes = 0;
  if (total > 0 && afterItemDiscounts > 0) {
    const globalDiscountRatio =
      afterItemDiscounts > 0 ? globalDiscountAmount / afterItemDiscounts : 0;

    taxes = items.reduce((sum, item) => {
      const itemGross = item.price * item.quantity;
      const itemDiscountAmt = calculateItemDiscount(
        item.price,
        item.quantity,
        item.discount,
      );
      const afterItemDisc = itemGross - itemDiscountAmt;
      // Distribuir descuento global proporcionalmente
      const afterAllDiscounts = afterItemDisc * (1 - globalDiscountRatio);
      // Extraer IVA
      const rate = item.taxRate / 100;
      const tax = afterAllDiscounts - afterAllDiscounts / (1 + rate);
      return sum + tax;
    }, 0);
  }

  const subtotal = total - taxes;

  return {
    grossSubtotal,
    subtotal,
    itemDiscounts,
    globalDiscount: globalDiscountAmount,
    taxes,
    total,
  };
}

/**
 * Format price in ARS currency
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Generate a unique cart item ID
 */
export function generateCartItemId(): string {
  return crypto.randomUUID();
}

// =====================================================
// Exchange types (for "Crear Cambio" flow)
// =====================================================

export interface ExchangeItem {
  id: string;
  productId: string | null;
  name: string;
  sku: string | null;
  price: number;
  quantity: number; // Cantidad a devolver (editable)
  maxQuantity: number; // Cantidad máxima (de venta original)
  taxRate: number;
  imageUrl: string | null;
}

export interface ExchangeData {
  originalSaleId: string;
  originalSaleNumber: string;
  customerId: string | null;
  customerName: string;
  itemsToReturn: ExchangeItem[];
}

export interface ExchangeTotals {
  returnTotal: number;
  newProductsTotal: number;
  balance: number;
  isInFavorOfCustomer: boolean;
}

export interface ExchangeResult {
  creditNote: {
    id: string;
    saleNumber: string;
    total: number;
  } | null;
  sale: {
    id: string;
    saleNumber: string;
    total: number;
  } | null;
  creditBalance: number;
}

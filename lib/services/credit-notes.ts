import { createClient } from "@/lib/supabase/client";
import { normalizeRelation } from "@/lib/supabase/types";

export interface CreditNoteItem {
  id: string;
  productId: string | null;
  name: string;
  sku: string | null;
  price: number;
  quantity: number; // Cantidad a devolver (editable)
  maxQuantity: number; // Cantidad máxima (de la venta original)
  taxRate: number;
}

export interface OriginalSaleForCreditNote {
  id: string;
  saleNumber: string;
  customerId: string | null;
  customerName: string;
  total: number;
  amount_paid: number;
  items: CreditNoteItem[];
  payments: {
    methodName: string;
    amount: number;
  }[];
}

/**
 * Get sale data for creating a credit note
 */
export async function getSaleForCreditNote(
  saleId: string,
): Promise<OriginalSaleForCreditNote> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("sales")
    .select(
      `
      id,
      sale_number,
      customer_id,
      total,
      amount_paid,
      customer:customers(name),
      items:sale_items(
        id,
        product_id,
        description,
        sku,
        unit_price,
        quantity,
        tax_rate
      ),
      payments(method_name, amount)
    `,
    )
    .eq("id", saleId)
    .single();

  if (error) throw error;

  const customer = normalizeRelation(data.customer);

  return {
    id: data.id,
    saleNumber: data.sale_number,
    customerId: data.customer_id,
    customerName: customer?.name || "Consumidor Final",
    total: data.total,
    amount_paid: Number(data.amount_paid) || 0,
    items: (data.items || []).map((item) => ({
      id: item.id,
      productId: item.product_id,
      name: item.description,
      sku: item.sku,
      price: item.unit_price,
      quantity: 0, // Empieza en 0, usuario selecciona
      maxQuantity: item.quantity,
      taxRate: item.tax_rate,
    })),
    payments: (data.payments || []).map((p) => ({
      methodName: p.method_name,
      amount: p.amount,
    })),
  };
}

export interface CreateCreditNoteData {
  originalSaleId: string;
  customerId: string | null;
  items: {
    productId: string | null;
    description: string;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }[];
  refund: {
    paymentMethodId: string;
    methodName: string;
    amount: number;
  };
  notes: string | null;
  date: Date;
  locationId: string;
}

/**
 * Create a credit note
 */
export async function createCreditNote(data: CreateCreditNoteData) {
  const supabase = createClient();

  // 1. Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuario no autenticado");

  // 1b. Get organization_id
  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  if (!userData?.organization_id) throw new Error("Usuario sin organización");
  const organizationId = userData.organization_id;

  // 2. Calculate totals
  const subtotal = data.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const tax = data.items.reduce(
    (sum, item) => sum + (item.unitPrice * item.quantity * item.taxRate) / 100,
    0,
  );
  const total = subtotal + tax;

  // 3. Generate credit note number
  const { data: saleNumber, error: numberError } = await supabase.rpc(
    "generate_sale_number",
    { location_id_param: data.locationId },
  );
  if (numberError) throw numberError;

  // Modify the number to indicate it's a credit note
  const creditNoteNumber = saleNumber.replace("COM-", "NCX-");

  // 4. Create the credit note
  const { data: creditNote, error: saleError } = await supabase
    .from("sales")
    .insert({
      sale_number: creditNoteNumber,
      customer_id: data.customerId,
      seller_id: user.id,
      location_id: data.locationId,
      created_by: user.id,
      subtotal,
      discount: 0,
      tax,
      total,
      notes: data.notes,
      status: "COMPLETED",
      voucher_type: "NOTA_CREDITO_X",
      sale_date: data.date.toISOString(),
      related_sale_id: data.originalSaleId,
      organization_id: organizationId,
    })
    .select()
    .single();

  if (saleError) throw saleError;

  // 5. Create items
  const itemsToInsert = data.items.map((item) => ({
    sale_id: creditNote.id,
    product_id: item.productId,
    description: item.description,
    sku: item.sku,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    discount: 0,
    tax_rate: item.taxRate,
    total: item.unitPrice * item.quantity * (1 + item.taxRate / 100),
  }));

  const { error: itemsError } = await supabase
    .from("sale_items")
    .insert(itemsToInsert);

  if (itemsError) throw itemsError;

  // 6. Increment stock for returned products
  for (const item of data.items) {
    if (item.productId) {
      const { error: stockError } = await supabase.rpc("increase_stock", {
        p_product_id: item.productId,
        p_location_id: data.locationId,
        p_quantity: item.quantity,
      });

      if (stockError) {
        console.error("Error incrementing stock:", stockError);
      }
    }
  }

  return creditNote;
}

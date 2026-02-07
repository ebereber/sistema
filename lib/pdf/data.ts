import { createClient } from "@/lib/supabase/server";
import type { PaymentReceiptData } from "./payment-receipt";

import { getOrganizationId } from "../auth/get-organization";
import { QuotePdfData } from "./quote";
import { SaleVoucherData } from "./sale-voucher";
import { formatCurrency } from "./shared";
import { type TransferPdfData } from "./transfer";

// ─── Shared: fetch fiscal config ─────────────────────────

async function getEmitterData(organizationId: string) {
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("name, cuit, phone, email, logo_url")
    .eq("id", organizationId)
    .single();

  const logoUrl = org?.logo_url || null;

  const { data: fiscal, error } = await supabase
    .from("fiscal_config")
    .select("*")
    .eq("organization_id", organizationId)
    .single();

  if (error || !fiscal) {
    return {
      razonSocial: org?.name || "Sin configurar",
      domicilioFiscal: "",
      localidad: "",
      provincia: "",
      codigoPostal: "",
      phone: org?.phone || null,
      condicionIva: "Sin configurar",
      cuit: org?.cuit || "",
      iibb: null,
      inicioActividades: null,
      logoUrl,
    };
  }

  return {
    razonSocial: fiscal.razon_social,
    domicilioFiscal: fiscal.domicilio_fiscal || "",
    localidad: fiscal.localidad || "",
    provincia: fiscal.provincia || "",
    codigoPostal: fiscal.codigo_postal || "",
    phone: null, // Add phone to fiscal_config if needed
    condicionIva: fiscal.condicion_iva,
    cuit: fiscal.cuit,
    iibb: fiscal.iibb || null,
    inicioActividades: fiscal.inicio_actividades || null,
    logoUrl,
  };
}

// ─── Sale Voucher Data ───────────────────────────────────

export async function getSaleVoucherData(
  saleId: string,
): Promise<SaleVoucherData> {
  const organizationId = await getOrganizationId();
  const supabase = await createClient();

  const { data: sale, error } = await supabase
    .from("sales")
    .select(
      `
      *,
      customer:customers(id, name, tax_id, tax_category, city),
      items:sale_items(
        id,
        product_id,
        description,
        sku,
        quantity,
        unit_price,
        discount,
        tax_rate,
        total
      )
    `,
    )
    .eq("id", saleId)
    .eq("organization_id", organizationId)
    .single();

  if (error || !sale) {
    console.error("Supabase error:", error);
    throw new Error(`Sale not found: ${saleId}`);
  }

  const emitter = await getEmitterData(organizationId);

  // Get payment method via allocations → customer_payments → methods
  let paymentMethodName: string | undefined;
  const { data: allocation } = await supabase
    .from("customer_payment_allocations")
    .select(
      `
      customer_payment:customer_payments(
        methods:customer_payment_methods(method_name)
      )
    `,
    )
    .eq("sale_id", saleId)
    .limit(1)
    .maybeSingle();

  if (allocation?.customer_payment?.methods[0]) {
    paymentMethodName = allocation.customer_payment.methods[0].method_name;
  }

  return {
    voucherType: sale.voucher_type,
    saleNumber: sale.sale_number,
    saleDate: sale.sale_date,
    dueDate: sale.due_date,
    emitter,
    customer: {
      name: sale.customer?.name || "Consumidor Final",
      taxId: sale.customer?.tax_id || null,
      taxCategory: sale.customer?.tax_category || "Consumidor Final",
      address: null,
      city: sale.customer?.city || null,
    },
    items: sale.items.map((item) => ({
      sku: item.sku,
      description: item.description,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price),
      subtotal: Number(item.total),
    })),
    subtotal: Number(sale.subtotal),
    discount: Number(sale.discount),
    tax: Number(sale.tax),
    total: Number(sale.total),
    paymentMethodName,
  };
}

// ─── Payment Receipt Data ────────────────────────────────

export async function getPaymentReceiptData(
  paymentId: string,
): Promise<PaymentReceiptData> {
  const organizationId = await getOrganizationId();
  const supabase = await createClient();

  // Fetch payment with methods and applied sales
  const { data: payment, error } = await supabase
    .from("customer_payments")
    .select(
      `
      *,
      customer:customers(id, name),
      methods:customer_payment_methods(
        id,
        amount,
        method_name
      ),
      allocations:customer_payment_allocations(
        id,
        amount,
        sale:sales(id, sale_number, total)
      )
    `,
    )
    .eq("id", paymentId)
    .eq("organization_id", organizationId)
    .single();

  if (error || !payment) {
    throw new Error(`Payment not found: ${paymentId}`);
  }

  const emitter = await getEmitterData(organizationId);

  return {
    receiptNumber: payment.payment_number,
    paymentDate: payment.payment_date,
    emitter,
    customer: {
      name: payment.customer?.name || "Sin cliente",
    },
    appliedDocuments: payment.allocations.map((app) => ({
      description: `Factura ${app.sale?.sale_number || "N/A"}`,
      amount: Number(app.amount),
    })),
    paymentMethods: payment.methods.map((method) => ({
      name: method.method_name,
      amount: Number(method.amount),
    })),
    totalAmount: Number(payment.total_amount),
  };
}

// ─── Quote PDF Data ──────────────────────────────────────

interface QuoteItemJson {
  sku: string | null;
  name: string;
  price: number;
  taxRate: number;
  discount: { type: "percentage" | "fixed"; value: number } | null;
  quantity: number;
  basePrice: number;
  productId: string | null;
  imageUrl: string | null;
}

interface QuoteItemsJson {
  cartItems: QuoteItemJson[];
  globalDiscount: { type: "percentage" | "fixed"; value: number } | null;
}

export async function getQuotePdfData(quoteId: string): Promise<QuotePdfData> {
  const organizationId = await getOrganizationId();
  const supabase = await createClient();

  const { data: quote, error } = await supabase
    .from("quotes")
    .select(
      `
      *,
      customer:customers(id, name, tax_id, tax_id_type, tax_category, city)
    `,
    )
    .eq("id", quoteId)
    .eq("organization_id", organizationId)
    .single();

  if (error || !quote) {
    console.error("Supabase error:", error);
    throw new Error(`Quote not found: ${quoteId}`);
  }

  const emitter = await getEmitterData(organizationId);
  const parsed = quote.items as unknown as QuoteItemsJson;
  const cartItems = parsed.cartItems || [];

  const items = cartItems.map((item) => {
    const gross = item.price * item.quantity;
    let discountAmount = 0;
    let discountLabel = "0,00%";

    if (item.discount) {
      if (item.discount.type === "percentage") {
        discountAmount = gross * (item.discount.value / 100);
        discountLabel = `${item.discount.value}%`;
      } else {
        discountAmount = Math.min(item.discount.value * item.quantity, gross);
        discountLabel = formatCurrency(item.discount.value);
      }
    }

    return {
      sku: item.sku === "CUSTOM" ? null : item.sku,
      description: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      discountLabel,
      subtotal: gross - discountAmount,
    };
  });

  return {
    quoteNumber: quote.quote_number,
    createdAt: quote.created_at,
    validUntil: quote.valid_until,
    emitter,
    customer: {
      name: quote.customer?.name || quote.customer_name || "Consumidor Final",
      taxId: quote.customer?.tax_id || null,
      taxIdType: quote.customer?.tax_id_type || "DNI",
      taxCategory: quote.customer?.tax_category || "Consumidor Final",
      city: quote.customer?.city || null,
    },
    items,
    subtotal: Number(quote.subtotal),
    discount: Number(quote.discount),
    total: Number(quote.total),
    notes: quote.notes,
  };
}

export async function getTransferPdfData(
  transferId: string,
): Promise<TransferPdfData> {
  const organizationId = await getOrganizationId();
  const supabase = await createClient();

  const { data: transfer, error } = await supabase
    .from("transfers")
    .select(
      `
      *,
      source_location:locations!transfers_source_location_id_fkey(name),
      destination_location:locations!transfers_destination_location_id_fkey(name),
      items:transfer_items(
        id, product_id, quantity,
        product:products(name, sku)
      )
    `,
    )
    .eq("id", transferId)
    .eq("organization_id", organizationId)
    .single();

  if (error || !transfer) {
    console.error("Supabase error:", error);
    throw new Error(`Transfer not found: ${transferId}`);
  }

  const emitter = await getEmitterData(organizationId);

  const items = (transfer.items || []).map((item) => ({
    sku: item.product?.sku || null,
    description: item.product?.name || "Producto eliminado",
    quantity: item.quantity,
  }));

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    transferNumber: transfer.transfer_number,
    transferDate: transfer.transfer_date,
    emitter,
    sourceLocation: transfer.source_location?.name || "—",
    destinationLocation: transfer.destination_location?.name || "—",
    items,
    totalQuantity,
    notes: transfer.notes,
  };
}

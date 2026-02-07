import { createClient } from "@/lib/supabase/server";
import type { PaymentReceiptData } from "./payment-receipt";

import { getOrganizationId } from "../auth/get-organization";
import { SaleVoucherData } from "./sale-voucher";

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

import { getOrganizationId } from "@/lib/auth/get-organization";
import { getTicketPreferences } from "@/lib/services/settings";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface SaleItem {
  id: string;
  description: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  total: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const organizationId = await getOrganizationId();

  const [{ data: sale }, { data: company }, ticketPrefs] = await Promise.all([
    supabase
      .from("sales")
      .select(
        `
        *,
        customer:customers(id, name, tax_id, tax_category),
        items:sale_items(id, description, sku, quantity, unit_price, discount, tax_rate, total),
        creator:users!created_by(id, name)
      `,
      )
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single(),
    supabase
      .from("fiscal_config")
      .select("*")
      .eq("organization_id", organizationId)
      .single(),
    getTicketPreferences(),
  ]);

  if (!sale) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const width = ticketPrefs.width || "80mm";
  const sep = width === "80mm" ? "-".repeat(48) : "-".repeat(32);
  const dotSep = width === "80mm" ? ".".repeat(48) : ".".repeat(32);
  const fontSize = width === "80mm" ? "12px" : "10px";

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(n);

  const formatDate = (d: string) => new Date(d).toLocaleDateString("es-AR");

  const itemsHtml = sale.items
    .map(
      (item: SaleItem) => `
      <div class="item-row">
        <span class="item-name bold">${item.description}</span>
        <span class="item-total">${fmt(item.total)}</span>
      </div>
      <div class="item-detail">${item.quantity} x ${fmt(item.unit_price)}</div>
    `,
    )
    .join("");

  const companyHtml =
    ticketPrefs.show_company && company
      ? `
      <div class="center bold">${company.razon_social || ""}</div>
      ${company.cuit ? `<div class="center">CUIT: ${company.cuit}</div>` : ""}
      ${company.domicilio_fiscal ? `<div class="center">${company.domicilio_fiscal}</div>` : ""}
      ${company.codigo_postal ? `<div class="center">CP: ${company.codigo_postal}</div>` : ""}
      ${company.condicion_iva ? `<div class="center">${company.condicion_iva}</div>` : ""}
      <div class="separator">${sep}</div>
    `
      : "";

  const customerHtml =
    ticketPrefs.show_customer && sale.customer
      ? `<div class="center">${sale.customer.tax_category === "Consumidor Final" ? "A consumidor final" : sale.customer.name}</div>`
      : "";

  const sellerHtml =
    ticketPrefs.show_seller && sale.creator
      ? `<div>Vendedor: ${sale.creator.name}</div>`
      : "";

  const discountHtml =
    sale.discount > 0
      ? `<div class="item-row"><span>Descuento</span><span>-${fmt(sale.discount)}</span></div>`
      : "";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ticket ${sale.sale_number}</title>
  <style>
    @page { margin: 0; size: ${width} auto; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: ${fontSize};
      width: ${width};
      color: #000;
      background: #fff;
    }
    .ticket { padding: 8px; width: 100%; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .separator { text-align: center; overflow: hidden; }
    .item-row { display: flex; justify-content: space-between; }
    .item-name { max-width: 70%; }
    .item-detail { padding-left: 8px; color: #333; }
    .total-row { display: flex; justify-content: space-between; font-weight: bold; }
    .spacer { height: 8px; }
    @media screen {
      body {
        display: flex;
        justify-content: center;
        min-height: 100vh;
        background: #f0f0f0;
        padding-top: 20px;
      }
      .ticket {
        background: #fff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        max-width: ${width};
      }
    }
  </style>
</head>
<body>
  <div class="ticket">
    ${companyHtml}
    <div class="center bold">${sale.sale_number}</div>
    <div class="center">${formatDate(sale.created_at)}</div>
    <div class="spacer"></div>
    ${customerHtml}
    ${sellerHtml}
    <div class="separator">${dotSep}</div>
    ${itemsHtml}
    <div class="separator">${dotSep}</div>
    <div class="item-row"><span>Subtotal</span><span>${fmt(sale.subtotal + sale.tax)}</span></div>
    ${discountHtml}
    <div class="total-row"><span>TOTAL</span><span>${fmt(sale.total)}</span></div>
    <div class="spacer"></div>
    <div class="center separator">${sep}</div>
    <div class="center">${ticketPrefs.footer_message || "¡Gracias por su compra!"}</div>
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

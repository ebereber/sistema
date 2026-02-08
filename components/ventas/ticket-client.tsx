"use client";

import type { TicketPreferences } from "@/lib/services/settings";
import { useEffect } from "react";

// ─── Types ────────────────────────────────────────────

interface SaleItem {
  id: string;
  description: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  total: number;
  [key: string]: unknown;
}

interface Sale {
  id: string;
  sale_number: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  created_at: string;
  customer: {
    id: string;
    name: string;
    tax_id: string | null;
    tax_category: string | null;
    [key: string]: unknown;
  } | null;
  items: SaleItem[];
  creator: { id: string; name: string | null } | null;
  [key: string]: unknown;
}

interface Company {
  razon_social: string | null;
  cuit: string | null;
  domicilio_fiscal: string | null;
  codigo_postal: string | null;
  condicion_iva: string | null;
  iibb: string | null;
  inicio_actividades: string | null;
  phone: string | null;
  [key: string]: unknown;
}

interface TicketClientProps {
  sale: Sale;
  company: Company | null;
  preferences: TicketPreferences;
}

// ─── Helpers ──────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-AR");
}

function separator(width: "80mm" | "57mm"): string {
  return width === "80mm" ? "-".repeat(48) : "-".repeat(32);
}

function dotSeparator(width: "80mm" | "57mm"): string {
  return ".".repeat(width === "80mm" ? 48 : 32);
}

// ─── Component ────────────────────────────────────────

export function TicketClient({
  sale,
  company,
  preferences,
}: TicketClientProps) {
  const width = preferences.width || "80mm";
  const sep = separator(width);
  const dotSep = dotSeparator(width);

  // Auto-trigger print dialog
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page {
              margin: 0;
              size: ${width} auto;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: ${width === "80mm" ? "12px" : "10px"};
              width: ${width};
              color: #000;
              background: #fff;
            }
            .ticket {
              padding: 8px;
              width: 100%;
            }
            .center {
              text-align: center;
            }
            .right {
              text-align: right;
            }
            .bold {
              font-weight: bold;
            }
            .separator {
              text-align: center;
              letter-spacing: 0;
              overflow: hidden;
            }
            .item-row {
              display: flex;
              justify-content: space-between;
            }
            .item-name {
              max-width: 70%;
            }
            .item-total {
              text-align: right;
            }
            .item-detail {
              padding-left: 8px;
              color: #333;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              font-weight: bold;
            }
            .spacer {
              height: 8px;
            }
            @media screen {
              body {
                display: flex;
                justify-content: center;
                align-items: flex-start;
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
            @media print {
              .no-print {
                display: none !important;
              }
            }
          `,
        }}
      />

      <div className="ticket">
        {/* ─── Company Header ─── */}
        {preferences.show_company && company && (
          <>
            <div className="center bold">{company.razon_social || ""}</div>
            {company.cuit && <div className="center">CUIT: {company.cuit}</div>}
            {company.domicilio_fiscal && (
              <div className="center">{company.domicilio_fiscal}</div>
            )}
            {company.codigo_postal && (
              <div className="center">CP: {company.codigo_postal}</div>
            )}
            {company.phone && (
              <div className="center">Tel.: {company.phone}</div>
            )}
            {company.iibb && <div className="center">IIBB: {company.iibb}</div>}
            {company.inicio_actividades && (
              <div className="center">
                Inicio Actividades: {company.inicio_actividades}
              </div>
            )}
            {company.condicion_iva && (
              <div className="center">{company.condicion_iva}</div>
            )}
            <div className="separator">{sep}</div>
          </>
        )}

        {/* ─── Sale Number & Date ─── */}
        <div className="center bold">{sale.sale_number}</div>
        <div className="center">{formatDate(sale.created_at)}</div>

        <div className="spacer" />

        {/* ─── Customer ─── */}
        {preferences.show_customer && sale.customer && (
          <>
            <div className="center">
              {sale.customer.tax_category === "Consumidor Final"
                ? "A consumidor final"
                : sale.customer.name}
            </div>
          </>
        )}

        {/* ─── Seller ─── */}
        {preferences.show_seller && sale.creator && (
          <div>Vendedor: {sale.creator.name}</div>
        )}

        <div className="separator">{dotSep}</div>

        {/* ─── Items ─── */}
        {sale.items.map((item) => (
          <div key={item.id}>
            <div className="item-row">
              <span className="item-name bold">{item.description}</span>
              <span className="item-total">{formatCurrency(item.total)}</span>
            </div>
            <div className="item-detail">
              {item.quantity} x {formatCurrency(item.unit_price)}
            </div>
          </div>
        ))}

        <div className="separator">{dotSep}</div>

        {/* ─── Totals ─── */}
        <div className="item-row">
          <span>Subtotal</span>
          <span>{formatCurrency(sale.subtotal + sale.tax)}</span>
        </div>

        {sale.discount > 0 && (
          <div className="item-row">
            <span>Descuento</span>
            <span>-{formatCurrency(sale.discount)}</span>
          </div>
        )}

        <div className="total-row">
          <span>TOTAL</span>
          <span>{formatCurrency(sale.total)}</span>
        </div>

        <div className="spacer" />

        {/* ─── Footer ─── */}
        <div className="center separator">{sep}</div>
        <div className="center">
          {preferences.footer_message || "¡Gracias por su compra!"}
        </div>
      </div>
    </>
  );
}

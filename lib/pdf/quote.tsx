import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  colors,
  formatCurrency,
  formatDate,
  PdfFooter,
  sharedStyles,
} from "./shared";

// ─── Types ───────────────────────────────────────────────

export interface QuotePdfData {
  // Document
  quoteNumber: string;
  createdAt: string | Date;
  validUntil?: string | Date | null;

  // Emitter (from fiscal_config)
  emitter: {
    razonSocial: string;
    domicilioFiscal: string;
    localidad: string;
    provincia: string;
    codigoPostal: string;
    phone?: string | null;
    condicionIva: string;
    cuit: string;
    iibb?: string | null;
    inicioActividades?: string | Date | null;
    logoUrl?: string | null;
  };

  // Customer
  customer: {
    name: string;
    taxId?: string | null;
    taxIdType?: string | null;
    taxCategory?: string | null;
    city?: string | null;
  };

  // Items
  items: {
    sku: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    discountLabel: string; // "10%", "$500", or "—"
    subtotal: number; // after discount
  }[];

  // Totals
  subtotal: number;
  discount: number;
  total: number;

  // Notes
  notes?: string | null;

  // App
  appName?: string;
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header center - P box
  headerCenter: {
    width: 60,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  pBox: {
    width: 50,
    height: 50,
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  pLetter: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: colors.black,
  },

  // Customer section
  customerSection: {
    flexDirection: "row",
    marginBottom: 15,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderGray,
  },
  customerLeft: {
    flex: 1,
  },
  customerRight: {
    flex: 1,
  },
  customerLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.darkGray,
  },
  customerValue: {
    fontSize: 8,
    color: colors.gray,
  },
  customerRow: {
    flexDirection: "row",
    marginBottom: 2,
  },

  // Items table columns
  colCodigo: { width: "12%" },
  colDescripcion: { width: "35%" },
  colCantidad: { width: "10%", textAlign: "right" },
  colPrecioUnit: { width: "17%", textAlign: "right" },
  colBonif: { width: "12%", textAlign: "right" },
  colSubtotal: { width: "14%", textAlign: "right" },

  itemText: {
    fontSize: 8,
    color: colors.darkGray,
  },

  // Notes section
  notesSection: {
    position: "absolute",
    bottom: 60,
    left: 40,
    right: 40,
  },
  notesLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.darkGray,
    marginBottom: 2,
  },
  notesText: {
    fontSize: 8,
    color: colors.gray,
  },
});

// ─── Component ───────────────────────────────────────────

export function QuotePdf({ data }: { data: QuotePdfData }) {
  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        {/* ─── Header ─── */}
        <View style={sharedStyles.headerRow}>
          {/* Left - Emitter info */}
          <View style={sharedStyles.headerLeft}>
            <Text style={sharedStyles.companyName}>
              {data.emitter.razonSocial}
            </Text>
            <Text style={sharedStyles.companyDetail}>
              {data.emitter.domicilioFiscal}
            </Text>
            <Text style={sharedStyles.companyDetail}>
              {data.emitter.localidad} - CP: {data.emitter.codigoPostal}
            </Text>
            <Text style={sharedStyles.companyDetail}>
              Tel.: {data.emitter.phone || ""}
            </Text>
            <Text style={sharedStyles.companyDetail}>
              {data.emitter.condicionIva}
            </Text>
          </View>

          {/* Center - P box */}
          <View style={styles.headerCenter}>
            <View style={styles.pBox}>
              <Text style={styles.pLetter}>P</Text>
            </View>
          </View>

          {/* Right - Document info */}
          <View style={sharedStyles.headerRight}>
            <Text style={sharedStyles.docType}>PRESUPUESTO</Text>
            <Text style={sharedStyles.docTypeOriginal}>Original</Text>
            <Text style={sharedStyles.docNumber}>Nº {data.quoteNumber}</Text>
            <Text style={sharedStyles.docDetail}>
              <Text style={sharedStyles.docDetailBold}>Fecha de Emisión: </Text>
              {formatDate(data.createdAt)}
            </Text>
            {data.validUntil && (
              <Text style={sharedStyles.docDetail}>
                <Text style={sharedStyles.docDetailBold}>Válido hasta: </Text>
                {formatDate(data.validUntil)}
              </Text>
            )}
            <Text style={sharedStyles.docDetail}>
              <Text style={sharedStyles.docDetailBold}>CUIT: </Text>
              {data.emitter.cuit}
            </Text>
            <Text style={sharedStyles.docDetail}>
              <Text style={sharedStyles.docDetailBold}>Ingresos Brutos: </Text>
              {data.emitter.iibb || ""}
            </Text>
            {data.emitter.inicioActividades && (
              <Text style={sharedStyles.docDetail}>
                <Text style={sharedStyles.docDetailBold}>
                  Fecha de Inicio de Actividades:{" "}
                </Text>
                {formatDate(data.emitter.inicioActividades)}
              </Text>
            )}
          </View>
        </View>

        {/* ─── Customer Section ─── */}
        <View style={styles.customerSection}>
          <View style={styles.customerLeft}>
            <View style={styles.customerRow}>
              <Text style={styles.customerLabel}>Razón social: </Text>
              <Text style={styles.customerValue}>{data.customer.name}</Text>
            </View>
            <View style={styles.customerRow}>
              <Text style={styles.customerLabel}>
                {data.customer.taxIdType || "DNI"}:{" "}
              </Text>
              <Text style={styles.customerValue}>
                {data.customer.taxId || "—"}
              </Text>
            </View>
            <View style={styles.customerRow}>
              <Text style={styles.customerLabel}>Localidad: </Text>
              <Text style={styles.customerValue}>
                {data.customer.city || "No disponible"}
              </Text>
            </View>
          </View>
          <View style={styles.customerRight}>
            <View style={styles.customerRow}>
              <Text style={styles.customerLabel}>Condición de IVA: </Text>
              <Text style={styles.customerValue}>
                {data.customer.taxCategory || "Consumidor Final"}
              </Text>
            </View>
            <View style={styles.customerRow}>
              <Text style={styles.customerLabel}>Condición de venta: </Text>
              <Text style={styles.customerValue}>Contado</Text>
            </View>
          </View>
        </View>

        {/* ─── Items Table ─── */}
        <View style={sharedStyles.tableHeader}>
          <Text style={[sharedStyles.tableHeaderText, styles.colCodigo]}>
            Código
          </Text>
          <Text style={[sharedStyles.tableHeaderText, styles.colDescripcion]}>
            Descripción
          </Text>
          <Text style={[sharedStyles.tableHeaderText, styles.colCantidad]}>
            Cant.
          </Text>
          <Text style={[sharedStyles.tableHeaderText, styles.colPrecioUnit]}>
            Precio Unit.
          </Text>
          <Text style={[sharedStyles.tableHeaderText, styles.colBonif]}>
            Bonif.
          </Text>
          <Text style={[sharedStyles.tableHeaderText, styles.colSubtotal]}>
            Subtotal
          </Text>
        </View>

        {data.items.map((item, index) => (
          <View style={sharedStyles.tableRow} key={index}>
            <Text style={[styles.itemText, styles.colCodigo]}>
              {item.sku || "—"}
            </Text>
            <Text style={[styles.itemText, styles.colDescripcion]}>
              {item.description}
            </Text>
            <Text style={[styles.itemText, styles.colCantidad]}>
              {item.quantity}
            </Text>
            <Text style={[styles.itemText, styles.colPrecioUnit]}>
              {formatCurrency(item.unitPrice)}
            </Text>
            <Text style={[styles.itemText, styles.colBonif]}>
              {item.discountLabel}
            </Text>
            <Text style={[styles.itemText, styles.colSubtotal]}>
              {formatCurrency(item.subtotal)}
            </Text>
          </View>
        ))}

        {/* ─── Totals ─── */}
        <View style={sharedStyles.totalsSection}>
          <View style={sharedStyles.totalRow}>
            <Text style={sharedStyles.totalLabel}>Subtotal</Text>
            <Text style={sharedStyles.totalValue}>
              ${formatCurrency(data.subtotal)}
            </Text>
          </View>

          {data.discount > 0 && (
            <View style={sharedStyles.totalRow}>
              <Text style={sharedStyles.totalLabel}>Descuento</Text>
              <Text style={sharedStyles.totalValue}>
                -${formatCurrency(data.discount)}
              </Text>
            </View>
          )}

          <View style={[sharedStyles.totalRow, { marginTop: 4 }]}>
            <Text style={sharedStyles.totalFinalLabel}>Total</Text>
            <Text style={sharedStyles.totalFinalValue}>
              ${formatCurrency(data.total)}
            </Text>
          </View>
        </View>

        {/* ─── Notes ─── */}
        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>Observaciones:</Text>
          <Text style={styles.notesText}>
            {data.notes || "Sin observaciones"}
          </Text>
        </View>

        {/* ─── Footer ─── */}
        <PdfFooter appName={data.appName} />
      </Page>
    </Document>
  );
}

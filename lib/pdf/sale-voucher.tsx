import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  colors,
  formatCurrency,
  formatDate,
  getCondicionVenta,
  getVoucherDescription,
  getVoucherTypeLetter,
  PdfFooter,
  sharedStyles,
  VoucherTypeBox,
} from "./shared";

// ─── Types ───────────────────────────────────────────────

export interface SaleVoucherData {
  // Document
  voucherType: string;
  saleNumber: string;
  saleDate: string | Date;
  dueDate?: string | Date | null;

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
    taxCategory?: string | null;
    address?: string | null;
    city?: string | null;
  };

  // Items
  items: {
    sku: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];

  // Totals
  subtotal: number; // neto sin IVA
  discount: number;
  tax: number; // IVA
  total: number;

  // Payment
  paymentMethodName?: string;

  // App
  appName?: string;
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
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

  // Items table
  colCodigo: { width: "15%" },
  colDescripcion: { width: "40%" },
  colCantidad: { width: "10%", textAlign: "right" },
  colPrecioUnit: { width: "17.5%", textAlign: "right" },
  colSubtotal: { width: "17.5%", textAlign: "right" },

  itemText: {
    fontSize: 8,
    color: colors.darkGray,
  },
});

// ─── Component ───────────────────────────────────────────

export function SaleVoucherPdf({ data }: { data: SaleVoucherData }) {
  const letter = getVoucherTypeLetter(data.voucherType);
  const description = getVoucherDescription(data.voucherType);
  const isComprobante = data.voucherType === "COMPROBANTE_X";
  const netTaxed = data.subtotal; // Ya viene como neto
  const itemsTotal = data.items.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        {/* ─── Header ─── */}
        <View style={sharedStyles.headerRow}>
          {/* Left - Emitter info */}
          <View style={sharedStyles.headerLeft}>
            {data.emitter.logoUrl && (
              <Image src={data.emitter.logoUrl} style={sharedStyles.logo} />
            )}
            <Text style={sharedStyles.companyName}>
              {data.emitter.razonSocial}
            </Text>
            <Text style={sharedStyles.companyDetail}>
              {data.emitter.domicilioFiscal}
            </Text>
            <Text style={sharedStyles.companyDetail}>
              {data.emitter.localidad}, {data.emitter.provincia} - CP:{" "}
              {data.emitter.codigoPostal}
            </Text>
            <Text style={sharedStyles.companyDetail}>
              Tel.: {data.emitter.phone || ""}
            </Text>
            <Text style={sharedStyles.companyDetail}>
              {data.emitter.condicionIva}
            </Text>
          </View>

          {/* Center - Voucher type */}
          <VoucherTypeBox voucherType={data.voucherType} />

          {/* Right - Document info */}
          <View style={sharedStyles.headerRight}>
            {description && (
              <Text style={sharedStyles.docType}>{description}</Text>
            )}
            <Text style={sharedStyles.docTypeOriginal}>Original</Text>
            <Text style={sharedStyles.docNumber}>Nº {data.saleNumber}</Text>
            <Text style={sharedStyles.docDetail}>
              <Text style={sharedStyles.docDetailBold}>Fecha de Emisión: </Text>
              {formatDate(data.saleDate)}
            </Text>
            {data.dueDate && (
              <Text style={sharedStyles.docDetail}>
                <Text style={sharedStyles.docDetailBold}>
                  Fecha de Vto. para el pago:{" "}
                </Text>
                {formatDate(data.dueDate)}
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
              <Text style={styles.customerLabel}>Doc. (Otro): </Text>
              <Text style={styles.customerValue}>
                {data.customer.taxId || "0"}
              </Text>
            </View>
            {data.customer.city && (
              <View style={styles.customerRow}>
                <Text style={styles.customerLabel}>Localidad: </Text>
                <Text style={styles.customerValue}>{data.customer.city}</Text>
              </View>
            )}
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
              <Text style={styles.customerValue}>
                {getCondicionVenta(data.paymentMethodName)}
              </Text>
            </View>
          </View>
        </View>

        {/* ─── Items Table ─── */}
        {/* Table Header */}
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
          <Text style={[sharedStyles.tableHeaderText, styles.colSubtotal]}>
            Subtotal
          </Text>
        </View>

        {/* Table Rows */}
        {data.items.map((item, index) => (
          <View style={sharedStyles.tableRow} key={index}>
            <Text style={[styles.itemText, styles.colCodigo]}>
              {item.sku || "-"}
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
            <Text style={[styles.itemText, styles.colSubtotal]}>
              ${formatCurrency(itemsTotal)}
            </Text>
          </View>
        ))}

        {/* ─── Totals ─── */}
        <View style={sharedStyles.totalsSection}>
          <View style={sharedStyles.totalRow}>
            <Text style={sharedStyles.totalLabel}>Subtotal</Text>
            <Text style={sharedStyles.totalValue}>
              ${formatCurrency(data.total)}
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

          {!isComprobante && (
            <>
              <View style={sharedStyles.totalRow}>
                <Text style={sharedStyles.totalLabel}>Neto gravado</Text>
                <Text style={sharedStyles.totalValue}>
                  ${formatCurrency(netTaxed)}
                </Text>
              </View>
              <View style={sharedStyles.totalRow}>
                <Text style={sharedStyles.totalLabel}>IVA</Text>
                <Text style={sharedStyles.totalValue}>
                  ${formatCurrency(data.tax)}
                </Text>
              </View>
            </>
          )}

          <View style={[sharedStyles.totalRow, { marginTop: 4 }]}>
            <Text style={sharedStyles.totalFinalLabel}>Total</Text>
            <Text style={sharedStyles.totalFinalValue}>
              ${formatCurrency(data.total)}
            </Text>
          </View>
        </View>

        {/* ─── Footer ─── */}
        <PdfFooter appName={data.appName} />
      </Page>
    </Document>
  );
}

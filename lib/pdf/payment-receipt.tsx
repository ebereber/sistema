import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  colors,
  formatCurrency,
  formatDate,
  PdfFooter,
  sharedStyles,
  VoucherTypeBox,
} from "./shared";

// ─── Types ───────────────────────────────────────────────

export interface PaymentReceiptData {
  // Document
  receiptNumber: string;
  paymentDate: string | Date;

  // Emitter (from fiscal_config)
  emitter: {
    razonSocial: string;
    domicilioFiscal: string;
    localidad: string;
    provincia: string;
    codigoPostal: string;
    phone?: string | null;
    cuit: string;
    iibb?: string | null;
    inicioActividades?: string | Date | null;
    logoUrl?: string | null;
  };

  // Customer
  customer: {
    name: string;
  };

  // Applied invoices/sales
  appliedDocuments: {
    description: string; // e.g. "Factura COM-00001-00000007"
    amount: number;
  }[];

  // Payment methods
  paymentMethods: {
    name: string;
    amount: number;
  }[];

  // Total
  totalAmount: number;

  // App
  appName?: string;
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  // Customer
  customerSection: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  customerLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: colors.darkGray,
  },
  customerName: {
    fontSize: 9,
    color: colors.darkGray,
  },

  // Two-column table
  twoColumnRow: {
    flexDirection: "row",
    gap: 30,
  },
  column: {
    flex: 1,
  },

  // Table within columns
  columnHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.black,
    paddingBottom: 4,
    marginBottom: 4,
  },
  columnHeaderLabel: {
    flex: 1,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.darkGray,
  },
  columnHeaderAmount: {
    width: 80,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.darkGray,
    textAlign: "right",
  },
  columnRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eeeeee",
  },
  columnRowLabel: {
    flex: 1,
    fontSize: 8,
    color: colors.darkGray,
  },
  columnRowAmount: {
    width: 80,
    fontSize: 8,
    color: colors.darkGray,
    textAlign: "right",
  },

  // Total section (on the right)
  totalSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
    paddingTop: 10,
  },
  totalLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginRight: 20,
    color: colors.black,
  },
  totalValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: colors.black,
    width: 100,
    textAlign: "right",
  },
});

// ─── Component ───────────────────────────────────────────

export function PaymentReceiptPdf({ data }: { data: PaymentReceiptData }) {
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
          </View>

          {/* Center - Voucher type */}
          <VoucherTypeBox voucherType="COMPROBANTE_X" label="Recibo" />

          {/* Right - Document info */}
          <View style={sharedStyles.headerRight}>
            <Text style={sharedStyles.docType}>Pago</Text>
            <Text style={sharedStyles.docTypeOriginal}>Original</Text>
            <Text style={sharedStyles.docNumber}>Nº {data.receiptNumber}</Text>
            <Text style={sharedStyles.docDetail}>
              <Text style={sharedStyles.docDetailBold}>Fecha de Emisión: </Text>
              {formatDate(data.paymentDate)}
            </Text>
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

        <View style={sharedStyles.separatorThick} />

        {/* ─── Customer ─── */}
        <View style={styles.customerSection}>
          <Text>
            <Text style={styles.customerLabel}>Proveedor: </Text>
            <Text style={styles.customerName}>{data.customer.name}</Text>
          </Text>
        </View>

        {/* ─── Two-column table ─── */}
        <View style={styles.twoColumnRow}>
          {/* Left column - Applied documents */}
          <View style={styles.column}>
            <View style={styles.columnHeader}>
              <Text style={styles.columnHeaderLabel}>Descripción</Text>
              <Text style={styles.columnHeaderAmount}>Importe</Text>
            </View>
            {data.appliedDocuments.map((doc, index) => (
              <View style={styles.columnRow} key={index}>
                <Text style={styles.columnRowLabel}>{doc.description}</Text>
                <Text style={styles.columnRowAmount}>
                  {formatCurrency(doc.amount)}
                </Text>
              </View>
            ))}
          </View>

          {/* Right column - Payment methods */}
          <View style={styles.column}>
            <View style={styles.columnHeader}>
              <Text style={styles.columnHeaderLabel}>Método de pago</Text>
              <Text style={styles.columnHeaderAmount}>Importe</Text>
            </View>
            {data.paymentMethods.map((method, index) => (
              <View style={styles.columnRow} key={index}>
                <Text style={styles.columnRowLabel}>{method.name}</Text>
                <Text style={styles.columnRowAmount}>
                  {formatCurrency(method.amount)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ─── Total ─── */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>
            ${formatCurrency(data.totalAmount)}
          </Text>
        </View>

        {/* ─── Footer ─── */}
        <PdfFooter appName={data.appName} />
      </Page>
    </Document>
  );
}

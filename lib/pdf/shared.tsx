import { StyleSheet, Text, View } from "@react-pdf/renderer";

// ─── Fonts ───────────────────────────────────────────────
// Using Helvetica (built-in) for clean look similar to reference

// ─── Color palette ───────────────────────────────────────
export const colors = {
  black: "#000000",
  darkGray: "#333333",
  gray: "#666666",
  lightGray: "#999999",
  borderGray: "#cccccc",
  bgGray: "#f5f5f5",
  white: "#ffffff",
};

// ─── Shared styles ───────────────────────────────────────
export const sharedStyles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    padding: 40,
    color: colors.darkGray,
  },

  // Header
  headerRow: {
    flexDirection: "row",
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 20,
  },
  headerCenter: {
    width: 60,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  headerRight: {
    flex: 1,
    paddingLeft: 20,
    alignItems: "flex-end",
  },

  // Voucher type box
  voucherTypeBox: {
    width: 50,
    height: 50,
    borderWidth: 2,
    borderColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  voucherTypeLetter: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: colors.black,
  },
  voucherTypeLabel: {
    fontSize: 7,
    marginTop: 3,
    color: colors.gray,
  },

  // Logo
  logo: {
    width: 60,
    height: 60,
    objectFit: "contain" as const,
    marginBottom: 6,
  },

  // Company info
  companyName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
    color: colors.black,
  },
  companyDetail: {
    fontSize: 8,
    marginBottom: 1,
    color: colors.gray,
  },

  // Document info (right side)
  docType: {
    fontSize: 8,
    textAlign: "right",
    color: colors.gray,
  },
  docTypeOriginal: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
    marginBottom: 4,
  },
  docNumber: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
    marginBottom: 6,
    color: colors.black,
  },
  docDetail: {
    fontSize: 8,
    textAlign: "right",
    marginBottom: 1,
    color: colors.gray,
  },
  docDetailBold: {
    fontFamily: "Helvetica-Bold",
    color: colors.darkGray,
  },

  // Separator
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    marginVertical: 10,
  },
  separatorThick: {
    borderBottomWidth: 2,
    borderBottomColor: colors.black,
    marginVertical: 10,
  },

  // Table
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.black,
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableHeaderText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.darkGray,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eeeeee",
  },

  // Totals
  totalsSection: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
    paddingTop: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 3,
  },
  totalLabel: {
    fontSize: 9,
    width: 120,
    textAlign: "right",
    paddingRight: 15,
    color: colors.gray,
  },
  totalValue: {
    fontSize: 9,
    width: 100,
    textAlign: "right",
  },
  totalFinalLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    width: 120,
    textAlign: "right",
    paddingRight: 15,
    color: colors.black,
  },
  totalFinalValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    width: 100,
    textAlign: "right",
    color: colors.black,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderTopColor: colors.borderGray,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontSize: 8,
    color: colors.lightGray,
  },
});

// ─── Helper functions ────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

export function getVoucherTypeLetter(voucherType: string): string {
  if (voucherType.includes("_A")) return "A";
  if (voucherType.includes("_B")) return "B";
  if (voucherType.includes("_C")) return "C";
  return "X";
}

export function getVoucherTypeCode(voucherType: string): string | null {
  // AFIP codes
  const codes: Record<string, string> = {
    FACTURA_A: "Cód. 01",
    FACTURA_B: "Cód. 06",
    FACTURA_C: "Cód. 11",
    NOTA_CREDITO_A: "Cód. 03",
    NOTA_CREDITO_B: "Cód. 08",
    NOTA_CREDITO_C: "Cód. 13",
    COMPROBANTE_X: "Cód. 90",
    NOTA_CREDITO_X: "Cód. 99",
  };
  return codes[voucherType] || null;
}

export function getVoucherDescription(voucherType: string): string {
  if (voucherType === "COMPROBANTE_X")
    return "Documento no válido como factura";
  if (voucherType.startsWith("NOTA_CREDITO")) return "Nota de Crédito";
  if (voucherType.startsWith("FACTURA")) return "Factura";
  return "";
}

export function getCondicionVenta(paymentMethodName?: string): string {
  if (!paymentMethodName) return "Contado";
  const name = paymentMethodName.toLowerCase();
  if (name.includes("efectivo") || name.includes("cash")) return "Efectivo";
  if (name.includes("tarjeta") || name.includes("card")) return "Tarjeta";
  if (name.includes("transferencia") || name.includes("transfer"))
    return "Transferencia";
  if (name.includes("qr")) return "QR";
  return "Contado";
}

// ─── Shared Components ──────────────────────────────────

interface VoucherTypeBoxProps {
  voucherType: string;
  label?: string;
}

export function VoucherTypeBox({ voucherType, label }: VoucherTypeBoxProps) {
  const letter = getVoucherTypeLetter(voucherType);
  const code = getVoucherTypeCode(voucherType);

  return (
    <View style={sharedStyles.headerCenter}>
      <View style={sharedStyles.voucherTypeBox}>
        <Text style={sharedStyles.voucherTypeLetter}>{letter}</Text>
      </View>
      {code && <Text style={sharedStyles.voucherTypeLabel}>{code}</Text>}
      {label && (
        <Text style={[sharedStyles.voucherTypeLabel, { marginTop: 1 }]}>
          {label}
        </Text>
      )}
    </View>
  );
}

interface FooterProps {
  appName?: string;
}

export function PdfFooter({ appName }: FooterProps) {
  return (
    <View style={sharedStyles.footer}>
      <Text style={sharedStyles.footerText}>
        Generado por {appName || "Sistema POS"}
      </Text>
    </View>
  );
}

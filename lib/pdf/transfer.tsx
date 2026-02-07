import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { colors, formatDate, PdfFooter, sharedStyles } from "./shared";

// ─── Types ───────────────────────────────────────────

export interface TransferPdfData {
  transferNumber: string;
  transferDate: string | Date;

  emitter: {
    razonSocial: string;
    domicilioFiscal: string;
    localidad: string;
    provincia: string;
    codigoPostal: string;
    condicionIva: string;
    cuit: string;
    inicioActividades?: string | Date | null;
    logoUrl?: string | null;
  };

  sourceLocation: string;
  destinationLocation: string;

  items: {
    sku: string | null;
    description: string;
    quantity: number;
  }[];

  totalQuantity: number;
  notes?: string | null;
  appName?: string;
}

// ─── Styles ──────────────────────────────────────────

const styles = StyleSheet.create({
  headerCenter: {
    width: 70,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  rBox: {
    width: 50,
    height: 50,
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  rLetter: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: colors.black,
  },
  codLabel: {
    fontSize: 7,
    color: colors.gray,
    marginTop: 2,
  },

  // Locations section
  locationsSection: {
    marginBottom: 15,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderGray,
  },
  locationRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  locationLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: colors.darkGray,
    width: 60,
  },
  locationValue: {
    fontSize: 9,
    color: colors.gray,
  },

  // Table columns - simpler, no prices
  colCodigo: { width: "20%" },
  colDescripcion: { width: "60%" },
  colCantidad: { width: "20%", textAlign: "right" },

  itemText: {
    fontSize: 8,
    color: colors.darkGray,
  },

  // Total row
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderColor: colors.borderGray,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: colors.darkGray,
    marginRight: 20,
  },
  totalValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: colors.black,
    width: "20%",
    textAlign: "right",
  },

  // Notes
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

// ─── Component ───────────────────────────────────────

export function TransferPdf({ data }: { data: TransferPdfData }) {
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
              CP: {data.emitter.codigoPostal}
            </Text>
            <Text style={sharedStyles.companyDetail}>
              {data.emitter.condicionIva}
            </Text>
          </View>

          {/* Center - R box */}
          <View style={styles.headerCenter}>
            <View style={styles.rBox}>
              <Text style={styles.rLetter}>R</Text>
            </View>
            <Text style={styles.codLabel}>Cód. 91</Text>
          </View>

          {/* Right - Document info */}
          <View style={sharedStyles.headerRight}>
            <Text style={sharedStyles.docType}>Remito de Transferencia</Text>
            <Text style={sharedStyles.docTypeOriginal}>Documento interno</Text>
            <Text style={sharedStyles.docNumber}>Nº {data.transferNumber}</Text>
            <Text style={sharedStyles.docDetail}>
              <Text style={sharedStyles.docDetailBold}>Fecha: </Text>
              {formatDate(data.transferDate)}
            </Text>
            <Text style={sharedStyles.docDetail}>
              <Text style={sharedStyles.docDetailBold}>CUIT: </Text>
              {data.emitter.cuit}
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

        {/* ─── Locations ─── */}
        <View style={styles.locationsSection}>
          <View style={styles.locationRow}>
            <Text style={styles.locationLabel}>Origen:</Text>
            <Text style={styles.locationValue}>{data.sourceLocation}</Text>
          </View>
          <View style={styles.locationRow}>
            <Text style={styles.locationLabel}>Destino:</Text>
            <Text style={styles.locationValue}>{data.destinationLocation}</Text>
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
            Cantidad
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
          </View>
        ))}

        {/* ─── Total ─── */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Cantidad total</Text>
          <Text style={styles.totalValue}>{data.totalQuantity}</Text>
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

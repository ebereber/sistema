/**
 * Open a PDF in a new tab
 */
export function openSalePdf(saleId: string) {
  window.open(`/api/pdf/sale/${saleId}`, "_blank");
}

/**
 * Download a sale PDF
 */
export async function downloadSalePdf(saleId: string, filename?: string) {
  const response = await fetch(`/api/pdf/sale/${saleId}`);
  if (!response.ok) throw new Error("Error downloading PDF");

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `comprobante-${saleId}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Open a receipt PDF in a new tab
 */
export function openReceiptPdf(paymentId: string) {
  window.open(`/api/pdf/receipt/${paymentId}`, "_blank");
}

/**
 * Download a receipt PDF
 */
export async function downloadReceiptPdf(paymentId: string, filename?: string) {
  const response = await fetch(`/api/pdf/receipt/${paymentId}`);
  if (!response.ok) throw new Error("Error downloading PDF");

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `recibo-${paymentId}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Open a quote PDF in a new tab
 */
export function openQuotePdf(quoteId: string) {
  window.open(`/api/pdf/quote/${quoteId}`, "_blank");
}

/**
 * Download a quote PDF
 */
export async function downloadQuotePdf(quoteId: string, filename?: string) {
  const response = await fetch(`/api/pdf/quote/${quoteId}`);
  if (!response.ok) throw new Error("Error downloading PDF");

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `presupuesto-${quoteId}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

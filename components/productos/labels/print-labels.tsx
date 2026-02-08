import type { LabelProduct, LabelSettings } from "./types";

const FONT_SIZE_MAP = {
  small: "8px",
  medium: "11px",
  large: "14px",
} as const;

function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(price);
}

function processCustomText(text: string, product: LabelProduct): string {
  return text
    .replace(/{precio}/gi, formatPrice(product.price))
    .replace(/{sku}/gi, product.sku)
    .replace(/{nombre}/gi, product.name)
    .replace(/{codigo}/gi, product.barcode)
    .replace(/{precio\s*([*/+-])\s*([\d.]+)}/gi, (_match, operator, num) => {
      const price = product.price;
      const number = parseFloat(num);
      let result = price;
      switch (operator) {
        case "*":
          result = price * number;
          break;
        case "/":
          result = price / number;
          break;
        case "+":
          result = price + number;
          break;
        case "-":
          result = price - number;
          break;
      }
      return formatPrice(result);
    });
}

function getLineText(
  line: LabelSettings["lines"][0],
  product: LabelProduct,
): string {
  switch (line.type) {
    case "name":
      return product.name;
    case "sku":
      return product.sku;
    case "price":
      return formatPrice(product.price);
    case "custom":
      return line.customText ? processCustomText(line.customText, product) : "";
    default:
      return "";
  }
}

function generateLabelHtml(
  product: LabelProduct,
  settings: LabelSettings,
  index: number,
): string {
  const barcodeValue =
    settings.barcodeSource === "sku" ? product.sku : product.barcode;

  const linesHtml = settings.lines
    .map((line) => {
      const text = getLineText(line, product);
      const fontSize = FONT_SIZE_MAP[line.fontSize];
      return `<div style="font-size:${fontSize};text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;">${text}</div>`;
    })
    .join("");

  const barcodeHtml =
    settings.showBarcode && barcodeValue
      ? `<svg class="barcode" data-value="${barcodeValue}" data-index="${index}"></svg>`
      : "";

  return `
    <div class="label" style="width:${settings.labelWidth}mm;height:${settings.labelHeight}mm;">
      ${barcodeHtml}
      <div class="label-content">
        ${linesHtml}
      </div>
    </div>
  `;
}

export function printLabels(
  products: LabelProduct[],
  settings: LabelSettings,
): void {
  // Expand products by printQuantity
  const expandedLabels: LabelProduct[] = [];
  for (const product of products) {
    for (let i = 0; i < product.printQuantity; i++) {
      expandedLabels.push(product);
    }
  }

  if (expandedLabels.length === 0) return;

  // Calculate grid for A4
  const isA4 = settings.paperSize === "a4";
  const labelsPerRow = isA4 ? Math.floor(210 / settings.labelWidth) : 1;

  // Generate label HTML
  const labelsHtml = expandedLabels
    .map((p, i) => generateLabelHtml(p, settings, i))
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Etiquetas</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
  <style>
    @page {
      margin: ${isA4 ? "5mm" : "0"};
      size: ${isA4 ? "A4" : `${settings.labelWidth}mm ${settings.labelHeight}mm`};
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #fff;
      color: #000;
    }
    .labels-grid {
      display: flex;
      flex-wrap: wrap;
      ${isA4 ? `width: 210mm; gap: 0;` : ""}
    }
    .label {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2mm;
      overflow: hidden;
      ${isA4 ? "border: 0.5px dashed #ccc;" : ""}
      page-break-inside: avoid;
    }
    .label svg.barcode {
      max-width: 90%;
      height: auto;
      max-height: 40%;
    }
    .label-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      flex: 1;
      gap: 1px;
      overflow: hidden;
    }
    @media screen {
      body {
        background: #e5e5e5;
        display: flex;
        justify-content: center;
        padding: 20px;
      }
      .labels-grid {
        background: #fff;
        padding: ${isA4 ? "5mm" : "0"};
        box-shadow: 0 2px 12px rgba(0,0,0,0.15);
      }
    }
    @media print {
      .label { border: none !important; }
    }
  </style>
</head>
<body>
  <div class="labels-grid">
    ${labelsHtml}
  </div>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      var barcodes = document.querySelectorAll('.barcode');
      barcodes.forEach(function(svg) {
        try {
          JsBarcode(svg, svg.dataset.value, {
            format: "CODE128",
            width: 1.5,
            height: 40,
            displayValue: true,
            fontSize: 10,
            margin: 2,
            textMargin: 1,
          });
        } catch(e) {
          svg.parentNode.removeChild(svg);
        }
      });
      setTimeout(function() { window.print(); }, 300);
    });
  <\/script>
</body>
</html>`;

  const printWindow = window.open("about:blank", "_blank");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

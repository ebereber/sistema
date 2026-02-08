import { LabelSettings } from "./types";

interface LabelPreviewProps {
  settings: LabelSettings;
  product?: {
    name: string;
    sku: string;
    price: number;
    barcode: string;
  };
}

const FONT_SIZE_MAP = {
  small: "8px",
  medium: "10px",
  large: "12px",
} as const;

export function LabelPreview({ settings, product }: LabelPreviewProps) {
  const defaultProduct = {
    name: "Remera básica",
    sku: "REM-001",
    price: 15000,
    barcode: "08763864725483",
  };

  const displayProduct = product || defaultProduct;

  // Generar barras del código de barras
  const generateBarcode = () => {
    const bars = [];
    const barcodeValue =
      settings.barcodeSource === "sku"
        ? displayProduct.sku
        : displayProduct.barcode;

    // Generar 30 barras de diferentes alturas para simular un código de barras
    for (let i = 0; i < 30; i++) {
      const heights = [12, 14, 16, 18, 20];
      const height = heights[i % heights.length];
      const width = i % 3 === 0 ? 2 : 1;
      bars.push({ height, width });
    }

    return { bars, value: barcodeValue };
  };

  const barcode = generateBarcode();

  // Formatear precio
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(price);
  };

  // Procesar texto personalizado
  const processCustomText = (text: string) => {
    return (
      text
        .replace(/{precio}/gi, formatPrice(displayProduct.price))
        .replace(/{sku}/gi, displayProduct.sku)
        .replace(/{nombre}/gi, displayProduct.name)
        .replace(/{codigo}/gi, displayProduct.barcode)
        // Evaluar fórmulas simples (precio * 0.8, precio / 12, etc.)
        .replace(/{precio\s*([*/+-])\s*([\d.]+)}/gi, (match, operator, num) => {
          const price = displayProduct.price;
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
        })
    );
  };

  // Obtener el texto para cada línea
  const getLineText = (line: LabelSettings["lines"][0]) => {
    switch (line.type) {
      case "name":
        return displayProduct.name;
      case "sku":
        return displayProduct.sku;
      case "price":
        return formatPrice(displayProduct.price);
      case "custom":
        return line.customText
          ? processCustomText(line.customText)
          : "Texto personalizado";
      default:
        return "";
    }
  };

  // Calcular el tamaño en píxeles (3mm = 1px aproximadamente para la vista previa)
  const labelWidthPx = settings.labelWidth * 3;
  const labelHeightPx = settings.labelHeight * 3;

  return (
    <div className="flex items-center justify-center rounded-lg border bg-muted/30 p-6">
      <div
        className="flex flex-col items-center justify-start gap-1 overflow-hidden rounded border bg-white p-2 shadow-sm"
        style={{
          width: `${labelWidthPx}px`,
          height: `${labelHeightPx}px`,
        }}
      >
        {/* Barcode */}
        {settings.showBarcode && (
          <div className="flex w-full flex-col items-center gap-0.5">
            <div className="flex h-6 w-full items-end justify-center gap-px">
              {barcode.bars.map((bar, index) => (
                <div
                  key={index}
                  className="bg-black"
                  style={{
                    width: `${bar.width}px`,
                    height: `${bar.height}px`,
                  }}
                />
              ))}
            </div>
            <span className="font-mono text-[6px] text-muted-foreground">
              {barcode.value}
            </span>
          </div>
        )}

        {/* Content Lines */}
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-0.5 overflow-hidden">
          {settings.lines.map((line, index) => {
            const text = getLineText(line);
            const fontSize = FONT_SIZE_MAP[line.fontSize];

            return (
              <span
                key={index}
                className="w-full truncate text-center text-black"
                style={{ fontSize }}
              >
                {text}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

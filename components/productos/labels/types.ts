export type LabelSettings = {
  paperSize: "a4" | "custom";
  labelWidth: number;
  labelHeight: number;
  showBarcode: boolean;
  barcodeSource: "sku" | "barcode";
  lines: Array<{
    type: "name" | "sku" | "price" | "custom";
    fontSize: "small" | "medium" | "large";
    customText?: string;
  }>;
};

export type LabelProduct = {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  price: number;
  stock: number;
  categoryId: string | null;
  printQuantity: number;
};

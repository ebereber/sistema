// ─── Template Definitions ─────────────────────────────
// Each template defines columns, their DB mapping, and validation rules.

export type ImportType =
  | "products"
  | "stock"
  | "prices"
  | "customers"
  | "suppliers";

export interface TemplateColumn {
  header: string;
  description: string;
  required: boolean;
  dbField?: string; // maps to DB column, undefined = derived/lookup
}

export interface TemplateDefinition {
  sheetName: string;
  instruction: string;
  columns: TemplateColumn[];
}

export const TEMPLATES: Record<ImportType, TemplateDefinition> = {
  products: {
    sheetName: "Datos",
    instruction:
      "No cambies el nombre ni el orden de las columnas. Las columnas con * son obligatorias. Empezá a cargar datos en la fila 4.",
    columns: [
      {
        header: "Código SKU *",
        description: "Código SKU único del producto (obligatorio).",
        required: true,
        dbField: "sku",
      },
      {
        header: "Nombre *",
        description: "Nombre del producto (obligatorio).",
        required: true,
        dbField: "name",
      },
      {
        header: "Descripción",
        description: "Descripción del producto (opcional).",
        required: false,
        dbField: "description",
      },
      {
        header: "Categoría *",
        description: "Categoría principal (obligatorio).",
        required: true,
        // Lookup → category_id
      },
      {
        header: "Subcategoría",
        description: "Subcategoría (opcional).",
        required: false,
        // Lookup → category_id (child)
      },
      {
        header: "Código de barras",
        description: "Código de barras (opcional).",
        required: false,
        dbField: "barcode",
      },
      {
        header: "Costo sin IVA",
        description: "Costo sin IVA (opcional, ej: 1.000,50).",
        required: false,
        dbField: "cost",
      },
      {
        header: "Precio con IVA",
        description: "Precio con IVA (opcional, ej: 1.210,50).",
        required: false,
        dbField: "price",
      },
      {
        header: "Margen de ganancia %",
        description: "Margen de ganancia % (opcional, ej: 21).",
        required: false,
        dbField: "margin_percentage",
      },
      {
        header: "Alícuota IVA",
        description:
          "Seleccioná la alícuota IVA: 0%, 10.5%, 21%, 27%, 5% o 2.5%.",
        required: false,
        dbField: "tax_rate",
      },
      {
        header: "Proveedor",
        description: "Proveedor principal (opcional).",
        required: false,
        // Lookup → default_supplier_id
      },
      {
        header: "Activo",
        description: "Ingresá SI o NO para indicar si el producto está activo.",
        required: false,
        dbField: "active",
      },
      {
        header: "Visibilidad",
        description: "Ingresá ambos, ventas o compras.",
        required: false,
        dbField: "visibility",
      },
      {
        header: "Tipo de producto",
        description: "Ingresá producto, servicio o combo.",
        required: false,
        dbField: "product_type",
      },
      {
        header: "Imagen URL",
        description: "URL de imagen del producto (opcional).",
        required: false,
        dbField: "image_url",
      },
    ],
  },

  stock: {
    sheetName: "Datos",
    instruction:
      "No cambies el nombre ni el orden de las columnas. Las columnas con * son obligatorias. Empezá a cargar datos en la fila 4.",
    columns: [
      {
        header: "Código SKU *",
        description: "SKU del producto (obligatorio).",
        required: true,
        dbField: "sku",
      },
      {
        header: "Depósito/ubicación",
        description: "Depósito o ubicación (opcional).",
        required: false,
        // Lookup → location_id
      },
      {
        header: "Cantidad *",
        description: "Cantidad a ajustar (obligatorio).",
        required: true,
        dbField: "quantity",
      },
    ],
  },

  prices: {
    sheetName: "Datos",
    instruction:
      "No cambies el nombre ni el orden de las columnas. Las columnas con * son obligatorias. Empezá a cargar datos en la fila 4.",
    columns: [
      {
        header: "Código SKU *",
        description: "SKU del producto (obligatorio).",
        required: true,
        dbField: "sku",
      },
      {
        header: "Costo sin IVA",
        description: "Costo sin IVA (opcional, ej: 1.000,50).",
        required: false,
        dbField: "cost",
      },
      {
        header: "Precio con IVA",
        description: "Precio con IVA (opcional, ej: 1.210,50).",
        required: false,
        dbField: "price",
      },
      {
        header: "Margen %",
        description: "Margen porcentual (opcional, ej: 21).",
        required: false,
        dbField: "margin_percentage",
      },
      {
        header: "Lista de Precios",
        description:
          "Lista de precios manual (opcional, dejá en blanco para actualizar el precio base).",
        required: false,
        // Lookup → price_list
      },
    ],
  },

  customers: {
    sheetName: "Datos",
    instruction:
      "No cambies el nombre ni el orden de las columnas. Las columnas con * son obligatorias. Empezá a cargar datos en la fila 4.",
    columns: [
      {
        header: "Nombre *",
        description: "Nombre o razón social (obligatorio).",
        required: true,
        dbField: "name",
      },
      {
        header: "Nombre comercial",
        description: "Nombre de fantasía (opcional).",
        required: false,
        dbField: "trade_name",
      },
      {
        header: "Tipo documento",
        description: "DNI, CUIT o CUIL.",
        required: false,
        dbField: "tax_id_type",
      },
      {
        header: "Nº documento",
        description: "Número de documento.",
        required: false,
        dbField: "tax_id",
      },
      {
        header: "Condición IVA",
        description: "Consumidor Final, Monotributista, Resp. Inscripto, etc.",
        required: false,
        dbField: "tax_category",
      },
      {
        header: "Email",
        description: "Email de contacto.",
        required: false,
        dbField: "email",
      },
      {
        header: "Teléfono",
        description: "Teléfono de contacto.",
        required: false,
        dbField: "phone",
      },
      {
        header: "Dirección",
        description: "Dirección (calle y número).",
        required: false,
        dbField: "street_address",
      },
      {
        header: "Localidad",
        description: "Ciudad o localidad.",
        required: false,
        dbField: "city",
      },
      {
        header: "Provincia",
        description: "Provincia.",
        required: false,
        dbField: "province",
      },
      {
        header: "Código postal",
        description: "Código postal.",
        required: false,
        dbField: "postal_code",
      },
    ],
  },

  suppliers: {
    sheetName: "Datos",
    instruction:
      "No cambies el nombre ni el orden de las columnas. Las columnas con * son obligatorias. Empezá a cargar datos en la fila 4.",
    columns: [
      {
        header: "Nombre *",
        description: "Nombre o razón social (obligatorio).",
        required: true,
        dbField: "name",
      },
      {
        header: "Nombre comercial",
        description: "Nombre de fantasía (opcional).",
        required: false,
        dbField: "trade_name",
      },
      {
        header: "CUIT",
        description: "CUIT del proveedor.",
        required: false,
        dbField: "tax_id",
      },
      {
        header: "Contacto",
        description: "Persona de contacto.",
        required: false,
        dbField: "contact_person",
      },
      {
        header: "Email",
        description: "Email de contacto.",
        required: false,
        dbField: "email",
      },
      {
        header: "Teléfono",
        description: "Teléfono.",
        required: false,
        dbField: "phone",
      },
      {
        header: "Dirección",
        description: "Dirección.",
        required: false,
        dbField: "street_address",
      },
      {
        header: "Localidad",
        description: "Ciudad o localidad.",
        required: false,
        dbField: "city",
      },
      {
        header: "Provincia",
        description: "Provincia.",
        required: false,
        dbField: "province",
      },
      {
        header: "Notas",
        description: "Notas adicionales.",
        required: false,
        dbField: "notes",
      },
    ],
  },
};

export const TYPE_LABELS: Record<ImportType, string> = {
  products: "Productos",
  stock: "Stock",
  prices: "Precios",
  customers: "Clientes",
  suppliers: "Proveedores",
};

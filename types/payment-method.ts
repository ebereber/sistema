import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/types";

export type PaymentMethodType =
  | "EFECTIVO"
  | "CHEQUE"
  | "TARJETA"
  | "TRANSFERENCIA"
  | "OTRO";

export type PaymentMethodAvailability =
  | "VENTAS"
  | "COMPRAS"
  | "VENTAS_Y_COMPRAS";

export interface GetPaymentMethodsFilters {
  search?: string;
  isActive?: boolean;
  availability?: PaymentMethodAvailability;
}

export type PaymentMethod = Omit<Tables<"payment_methods">, "type" | "availability"> & {
  type: PaymentMethodType;
  availability: PaymentMethodAvailability;
};

export type PaymentMethodInsert = Omit<TablesInsert<"payment_methods">, "type" | "availability"> & {
  type: PaymentMethodType;
  availability?: PaymentMethodAvailability;
};
export type PaymentMethodUpdate = Omit<TablesUpdate<"payment_methods">, "type" | "availability"> & {
  type?: PaymentMethodType;
  availability?: PaymentMethodAvailability;
};

export const PAYMENT_TYPE_CONFIG = {
  EFECTIVO: {
    icon: "Banknote",
    label: "Efectivo",
    description: "Efectivo en pesos o dólares",
  },
  CHEQUE: {
    icon: "FileCheck",
    label: "Cheque",
    description: "Cheques propios o de terceros",
  },
  TARJETA: {
    icon: "CreditCard",
    label: "Tarjeta",
    description:
      "POS o QR de Payway, Clover, u otro que gestione lotes y cupones.",
  },
  TRANSFERENCIA: {
    icon: "Building2",
    label: "Transferencia",
    description: "QR con dinero en cuenta, transferencias, ubicaciones, etc.",
  },
  OTRO: {
    icon: "DollarSign",
    label: "Otro",
    description: "Ej: Gift cards, puntos, cupones.",
  },
} as const;

export type PaymentMethodType =
  | "EFECTIVO"
  | "CHEQUE"
  | "TARJETA"
  | "TRANSFERENCIA"
  | "OTRO"

export type PaymentMethodAvailability =
  | "VENTAS"
  | "COMPRAS"
  | "VENTAS_Y_COMPRAS"

export interface PaymentMethod {
  id: string
  name: string
  type: PaymentMethodType
  icon: string
  fee_percentage: number
  fee_fixed: number
  requires_reference: boolean
  availability: PaymentMethodAvailability
  is_active: boolean
  is_system: boolean
  created_at: string
  updated_at: string
}

export type PaymentMethodInsert = Omit<
  PaymentMethod,
  "id" | "created_at" | "updated_at"
>
export type PaymentMethodUpdate = Partial<PaymentMethodInsert>

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
} as const

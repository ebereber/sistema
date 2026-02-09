import type { AvailableCreditNote } from "@/lib/services/credit-note-applications";
import type { Location } from "@/lib/services/locations";
import { Shift } from "@/lib/services/shifts";
import type {
  CartItem,
  ExchangeData,
  ExchangeItem,
  ExchangeResult,
  ExchangeTotals,
  GlobalDiscount,
  SelectedCustomer,
} from "@/lib/validations/sale";
import {
  Banknote,
  Building2,
  CreditCard,
  DollarSign,
  FileCheck,
  Smartphone,
} from "lucide-react";

export type CheckoutView =
  | "payment-list"
  | "payment-form"
  | "card-select"
  | "card-form"
  | "reference-form"
  | "split-payment"
  | "confirmation";

export const CARD_TYPES = [
  {
    id: "visa-debito",
    name: "Visa Débito",
    brand: "visa",
    type: "DEBITO",
    icon: "/tarjetas/visa.svg",
  },
  {
    id: "visa-credito",
    name: "Visa Crédito",
    brand: "visa",
    type: "CREDITO",
    icon: "/tarjetas/visa.svg",
  },
  {
    id: "master-debito",
    name: "Mastercard Débito",
    brand: "master",
    type: "DEBITO",
    icon: "/tarjetas/master.svg",
  },
  {
    id: "master-credito",
    name: "Mastercard Crédito",
    brand: "master",
    type: "CREDITO",
    icon: "/tarjetas/master.svg",
  },
  {
    id: "cabal-debito",
    name: "Cabal Débito",
    brand: "cabal",
    type: "DEBITO",
    icon: "/tarjetas/cabal.svg",
  },
  {
    id: "cabal-credito",
    name: "Cabal Crédito",
    brand: "cabal",
    type: "CREDITO",
    icon: "/tarjetas/cabal.svg",
  },
  {
    id: "naranja",
    name: "Naranja",
    brand: "naranja",
    type: "CREDITO",
    icon: "/tarjetas/naranja.svg",
  },
  {
    id: "american",
    name: "American Express",
    brand: "american",
    type: "CREDITO",
    icon: "/tarjetas/american.svg",
  },
] as const;

export type CardType = (typeof CARD_TYPES)[number];

export interface SplitPayment {
  id: string;
  methodId: string;
  methodName: string;
  amount: number;
  reference?: string;
}

export const ICON_MAP = {
  Banknote: Banknote,
  FileCheck: FileCheck,
  CreditCard: CreditCard,
  Building2: Building2,
  DollarSign: DollarSign,
  Smartphone: Smartphone,
} as const;

export interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut: string;
  type: string;
  requires_reference: boolean;
}

export interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartItems: CartItem[];
  customer: SelectedCustomer;
  globalDiscount: GlobalDiscount | null;
  note: string;
  saleDate: Date;
  onSuccess: (saleNumber: string) => void;
  isExchangeMode?: boolean;
  exchangeData?: ExchangeData | null;
  itemsToReturn?: ExchangeItem[];
  exchangeTotals?: ExchangeTotals;
  /* shiftId: string | null; */
  shift: Shift | null;
  onSaleDateChange: (date: Date) => void;
  allLocations: Location[];
}

// Re-export types used by child components
export type {
  AvailableCreditNote,
  CartItem,
  ExchangeData,
  ExchangeItem,
  ExchangeResult,
  ExchangeTotals,
  GlobalDiscount,
  SelectedCustomer,
};

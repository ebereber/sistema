import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PurchaseItem {
  id: string;
  productId: string | null;
  name: string;
  sku: string;
  quantity: number;
  unitCost: number;
  type: "product" | "custom";
}

interface PurchaseFormState {
  // Form data
  selectedSupplierId: string;
  selectedLocationId: string;
  voucherType: string;
  voucherNumber: string;
  invoiceDate: Date;
  dueDate: Date | undefined;
  accountingDate: Date;
  items: PurchaseItem[];
  productsReceived: boolean;
  notes: string;
  taxCategory: string;
  attachmentUrl: string | null;

  // Actions
  setSupplierId: (id: string) => void;
  setLocationId: (id: string) => void;
  setVoucherType: (type: string) => void;
  setVoucherNumber: (number: string) => void;
  setInvoiceDate: (date: Date) => void;
  setDueDate: (date: Date | undefined) => void;
  setAccountingDate: (date: Date) => void;
  setItems: (items: PurchaseItem[]) => void;
  addItems: (items: PurchaseItem[]) => void;
  addCustomItem: () => void;
  removeItem: (id: string) => void;
  updateItemQuantity: (id: string, quantity: number) => void;
  updateItemCost: (id: string, cost: number) => void;
  updateItemName: (id: string, name: string) => void;
  setProductsReceived: (received: boolean) => void;
  setNotes: (notes: string) => void;
  setTaxCategory: (category: string) => void;
  setAttachmentUrl: (url: string | null) => void;

  // General
  clear: () => void;
}

const initialState = {
  selectedSupplierId: "",
  selectedLocationId: "",
  voucherType: "90",
  voucherNumber: "",
  invoiceDate: new Date(),
  dueDate: undefined as Date | undefined,
  accountingDate: new Date(),
  items: [] as PurchaseItem[],
  productsReceived: false,
  notes: "",
  taxCategory: "",
  attachmentUrl: null as string | null,
};

export const usePurchaseFormStore = create<PurchaseFormState>()(
  persist(
    (set) => ({
      ...initialState,

      setSupplierId: (id) => set({ selectedSupplierId: id }),
      setLocationId: (id) => set({ selectedLocationId: id }),
      setVoucherType: (type) => set({ voucherType: type }),
      setVoucherNumber: (number) => set({ voucherNumber: number }),
      setInvoiceDate: (date) => set({ invoiceDate: date }),
      setDueDate: (date) => set({ dueDate: date }),
      setAccountingDate: (date) => set({ accountingDate: date }),

      setItems: (items) => set({ items }),

      addItems: (newItems) =>
        set((state) => ({
          items: [...state.items, ...newItems],
        })),

      addCustomItem: () =>
        set((state) => ({
          items: [
            ...state.items,
            {
              id: `custom-${Date.now()}`,
              productId: null,
              name: "",
              sku: "",
              quantity: 1,
              unitCost: 0,
              type: "custom" as const,
            },
          ],
        })),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      updateItemQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, quantity: Math.max(1, quantity) }
              : item,
          ),
        })),

      updateItemCost: (id, cost) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, unitCost: cost } : item,
          ),
        })),

      updateItemName: (id, name) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, name } : item,
          ),
        })),

      setProductsReceived: (received) => set({ productsReceived: received }),
      setNotes: (notes) => set({ notes }),
      setTaxCategory: (category) => set({ taxCategory: category }),
      setAttachmentUrl: (url) => set({ attachmentUrl: url }),

      clear: () => set(initialState),
    }),
    {
      name: "purchase-form-storage",
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          if (parsed?.state) {
            if (parsed.state.invoiceDate) {
              parsed.state.invoiceDate = new Date(parsed.state.invoiceDate);
            }
            if (parsed.state.dueDate) {
              parsed.state.dueDate = new Date(parsed.state.dueDate);
            }
            if (parsed.state.accountingDate) {
              parsed.state.accountingDate = new Date(
                parsed.state.accountingDate,
              );
            }
          }
          return parsed;
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      },
    },
  ),
);

export type { PurchaseItem };

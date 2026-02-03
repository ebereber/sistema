import { create } from "zustand";
import { persist } from "zustand/middleware";

interface OrderItem {
  id: string;
  productId: string | null;
  name: string;
  sku: string;
  quantity: number;
  unitCost: number;
  type: "product" | "custom";
}

interface PurchaseOrderFormState {
  // Form data
  selectedSupplierId: string;
  selectedLocationId: string;
  orderDate: Date;
  expectedDeliveryDate: Date | undefined;
  items: OrderItem[];
  notes: string;

  // Actions
  setSupplierId: (id: string) => void;
  setLocationId: (id: string) => void;
  setOrderDate: (date: Date) => void;
  setExpectedDeliveryDate: (date: Date | undefined) => void;
  setItems: (items: OrderItem[]) => void;
  addItems: (items: OrderItem[]) => void;
  addCustomItem: () => void;
  removeItem: (id: string) => void;
  updateItemQuantity: (id: string, quantity: number) => void;
  updateItemCost: (id: string, cost: number) => void;
  updateItemName: (id: string, name: string) => void;
  setNotes: (notes: string) => void;

  // General
  clear: () => void;
}

const initialState = {
  selectedSupplierId: "",
  selectedLocationId: "",
  orderDate: new Date(),
  expectedDeliveryDate: undefined as Date | undefined,
  items: [] as OrderItem[],
  notes: "",
};

export const usePurchaseOrderFormStore = create<PurchaseOrderFormState>()(
  persist(
    (set) => ({
      ...initialState,

      setSupplierId: (id) => set({ selectedSupplierId: id }),
      setLocationId: (id) => set({ selectedLocationId: id }),
      setOrderDate: (date) => set({ orderDate: date }),
      setExpectedDeliveryDate: (date) => set({ expectedDeliveryDate: date }),

      setItems: (items) => set({ items }),

      addItems: (newItems) =>
        set((state) => ({
          items: [
            ...state.items,
            ...newItems.filter(
              (ni) =>
                !ni.productId ||
                !state.items.some((i) => i.productId === ni.productId),
            ),
          ],
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

      setNotes: (notes) => set({ notes }),

      clear: () => set(initialState),
    }),
    {
      name: "purchase-order-form-storage",
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          if (parsed?.state) {
            if (parsed.state.orderDate) {
              parsed.state.orderDate = new Date(parsed.state.orderDate);
            }
            if (parsed.state.expectedDeliveryDate) {
              parsed.state.expectedDeliveryDate = new Date(
                parsed.state.expectedDeliveryDate,
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

export type { OrderItem };

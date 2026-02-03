import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  type CartItem,
  type GlobalDiscount,
  type ItemDiscount,
  type SelectedCustomer,
  type ExchangeData,
  type ExchangeItem,
  DEFAULT_CUSTOMER,
} from "@/lib/validations/sale";

interface SaleCartState {
  // Cart data
  cartItems: CartItem[];
  customer: SelectedCustomer;
  globalDiscount: GlobalDiscount | null;
  note: string;
  saleDate: Date;

  // Exchange mode
  isExchangeMode: boolean;
  exchangeData: ExchangeData | null;
  itemsToReturn: ExchangeItem[];

  // Actions - Cart
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  applyItemDiscount: (id: string, discount: ItemDiscount | null) => void;
  setCartItems: (items: CartItem[]) => void;

  // Actions - Customer & Discount
  setCustomer: (customer: SelectedCustomer) => void;
  setGlobalDiscount: (discount: GlobalDiscount | null) => void;
  setNote: (note: string) => void;
  setSaleDate: (date: Date) => void;

  // Actions - Exchange
  setExchangeMode: (
    isExchange: boolean,
    data: ExchangeData | null,
    items: ExchangeItem[],
  ) => void;
  setItemsToReturn: (items: ExchangeItem[]) => void;
  updateReturnQuantity: (id: string, quantity: number) => void;
  removeReturnItem: (id: string) => void;

  // Actions - General
  clear: () => void;
}

const initialState = {
  cartItems: [],
  customer: DEFAULT_CUSTOMER,
  globalDiscount: null,
  note: "",
  saleDate: new Date(),
  isExchangeMode: false,
  exchangeData: null,
  itemsToReturn: [],
};

export const useSaleCartStore = create<SaleCartState>()(
  persist(
    (set) => ({
      ...initialState,

      // Cart actions
      addItem: (item) =>
        set((state) => {
          const existingIndex = state.cartItems.findIndex(
            (i) => i.productId === item.productId && item.productId !== null,
          );

          if (existingIndex >= 0) {
            const updated = [...state.cartItems];
            updated[existingIndex] = {
              ...updated[existingIndex],
              quantity: updated[existingIndex].quantity + 1,
            };
            return { cartItems: updated };
          }

          return { cartItems: [...state.cartItems, item] };
        }),

      removeItem: (id) =>
        set((state) => ({
          cartItems: state.cartItems.filter((item) => item.id !== id),
        })),

      updateQuantity: (id, quantity) =>
        set((state) => ({
          cartItems: state.cartItems.map((item) =>
            item.id === id ? { ...item, quantity } : item,
          ),
        })),

      applyItemDiscount: (id, discount) =>
        set((state) => ({
          cartItems: state.cartItems.map((item) =>
            item.id === id ? { ...item, discount } : item,
          ),
        })),

      setCartItems: (items) => set({ cartItems: items }),

      // Customer & Discount actions
      setCustomer: (customer) => set({ customer }),
      setGlobalDiscount: (discount) => set({ globalDiscount: discount }),
      setNote: (note) => set({ note }),
      setSaleDate: (date) => set({ saleDate: date }),

      // Exchange actions
      setExchangeMode: (isExchange, data, items) =>
        set({
          isExchangeMode: isExchange,
          exchangeData: data,
          itemsToReturn: items,
        }),

      setItemsToReturn: (items) => set({ itemsToReturn: items }),

      updateReturnQuantity: (id, quantity) =>
        set((state) => ({
          itemsToReturn: state.itemsToReturn.map((item) =>
            item.id === id
              ? { ...item, quantity: Math.min(quantity, item.maxQuantity) }
              : item,
          ),
        })),

      removeReturnItem: (id) =>
        set((state) => ({
          itemsToReturn: state.itemsToReturn.filter((item) => item.id !== id),
        })),

      // General
      clear: () => set(initialState),
    }),
    {
      name: "sale-cart-storage",
      // Serialize/deserialize Date objects
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          if (parsed?.state?.saleDate) {
            parsed.state.saleDate = new Date(parsed.state.saleDate);
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

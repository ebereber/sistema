"use client";

import { ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { CartPanel } from "@/components/ventas/cart-panel";
import { ProductSearchPanel } from "@/components/ventas/product-search-panel";
import {
  type ProductForSale,
  getAdjustedPrice,
  saveCartToStorage,
} from "@/lib/services/sales";
import {
  type CartItem,
  type GlobalDiscount,
  type ItemDiscount,
  type SelectedCustomer,
  DEFAULT_CUSTOMER,
  generateCartItemId,
} from "@/lib/validations/sale";

export default function NuevaVentaPage() {
  const router = useRouter();

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<SelectedCustomer>(DEFAULT_CUSTOMER);
  const [globalDiscount, setGlobalDiscount] = useState<GlobalDiscount | null>(
    null,
  );

  // Additional cart state
  const [note, setNote] = useState("");
  const [saleDate, setSaleDate] = useState(new Date());

  // Add product to cart
  const handleAddProduct = useCallback(
    (product: ProductForSale) => {
      setCartItems((items) => {
        // Check if product already exists in cart
        const existingIndex = items.findIndex(
          (item) => item.productId === product.id,
        );

        if (existingIndex >= 0) {
          // Increment quantity
          const updated = [...items];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + 1,
          };
          return updated;
        }

        // Calculate adjusted price based on customer's price list
        const adjustedPrice = getAdjustedPrice(
          product.price,
          customer.priceListAdjustmentType,
          customer.priceListAdjustment,
        );

        // Add new item
        const newItem: CartItem = {
          id: generateCartItemId(),
          productId: product.id,
          name: product.name,
          sku: product.sku,
          price: adjustedPrice,
          basePrice: product.price,
          quantity: 1,
          taxRate: product.taxRate,
          discount: null,
          imageUrl: product.imageUrl,
        };

        return [...items, newItem];
      });

      toast(`${product.name} agregado al carrito`);
    },
    [customer.priceListAdjustment, customer.priceListAdjustmentType],
  );

  // Add custom item to cart
  const handleAddCustomItem = useCallback(
    (name: string, price: number, quantity: number, taxRate: number) => {
      const customItem: CartItem = {
        id: generateCartItemId(),
        productId: null, // Indicates custom item
        name,
        sku: "CUSTOM",
        price,
        basePrice: price,
        quantity,
        taxRate,
        discount: null,
        imageUrl: null,
      };

      setCartItems((items) => [...items, customItem]);
      toast(`${name} agregado al carrito`);
    },
    [],
  );

  // Update item quantity
  const handleQuantityChange = useCallback((id: string, quantity: number) => {
    setCartItems((items) =>
      items.map((item) => (item.id === id ? { ...item, quantity } : item)),
    );
  }, []);

  // Remove item from cart
  const handleRemoveItem = useCallback((id: string) => {
    setCartItems((items) => items.filter((item) => item.id !== id));
  }, []);

  // Apply item discount
  const handleApplyItemDiscount = useCallback(
    (id: string, discount: ItemDiscount | null) => {
      setCartItems((items) =>
        items.map((item) => (item.id === id ? { ...item, discount } : item)),
      );
    },
    [],
  );

  const handleCustomerChange = useCallback(
    (newCustomer: SelectedCustomer) => {
      const oldCustomer = customer;

      // Check if price list changed
      const priceListChanged =
        oldCustomer.priceListId !== newCustomer.priceListId ||
        oldCustomer.priceListAdjustment !== newCustomer.priceListAdjustment ||
        oldCustomer.priceListAdjustmentType !==
          newCustomer.priceListAdjustmentType;

      setCustomer(newCustomer);

      // AGREGAR ESTO: Recalcular precios si cambió la lista
      if (priceListChanged && cartItems.length > 0) {
        setCartItems((items) =>
          items.map((item) => {
            // Solo recalcular productos, NO items personalizados
            if (!item.productId) return item;

            // Obtener precio base del producto (necesitamos guardarlo)
            // Por ahora usamos el precio actual
            const basePrice = item.price; // TODO: guardar base_price original

            const newPrice = getAdjustedPrice(
              basePrice,
              newCustomer.priceListAdjustmentType,
              newCustomer.priceListAdjustment,
            );

            return { ...item, price: newPrice };
          }),
        );

        const message =
          newCustomer.priceListId && newCustomer.priceListAdjustment
            ? `Precios actualizados con lista: ${newCustomer.priceListName} ${newCustomer.priceListAdjustmentType === "AUMENTO" ? "+" : "-"}${newCustomer.priceListAdjustment}%`
            : `Cliente: ${newCustomer.name}`;
        toast.info(message);
      }
    },
    [customer, cartItems.length],
  );

  // Change global discount
  const handleGlobalDiscountChange = useCallback(
    (discount: GlobalDiscount | null) => {
      setGlobalDiscount(discount);
    },
    [],
  );

  // Change note
  const handleNoteChange = useCallback((newNote: string) => {
    setNote(newNote);
  }, []);

  // Change sale date
  const handleSaleDateChange = useCallback((date: Date) => {
    setSaleDate(date);
    toast.info(`Fecha cambiada a ${date.toLocaleDateString("es-AR")}`);
  }, []);

  // Clear cart
  const handleClearCart = useCallback(() => {
    setCartItems([]);
    setGlobalDiscount(null);
    setNote("");
    toast("Carrito vaciado");
  }, []);

  // Continue to checkout
  const handleContinue = useCallback(() => {
    if (cartItems.length === 0) {
      toast.error("Carrito vacío", {
        description: "Agrega productos al carrito para continuar",
      });
      return;
    }

    // Save cart data to session storage (including note and saleDate)
    saveCartToStorage({
      items: cartItems,
      customer,
      globalDiscount,
      note,
      saleDate: saleDate.toISOString(),
      savedAt: new Date().toISOString(),
    });

    // Navigate to checkout (placeholder for now)
    toast.info("Continuar al cobro", {
      description: "La pantalla de cobro se implementará próximamente",
    });

    // When checkout page is ready:
    // router.push('/ventas/checkout')
  }, [cartItems, customer, globalDiscount, note, saleDate]);

  return (
    <div className="flex h-[calc(100vh-5.5rem)] gap-4 lg:flex-row flex-col ">
      {/* Left panel - Product search */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-4 px-0 pb-20 ">
        <ProductSearchPanel onProductSelect={handleAddProduct} />
      </div>

      {/* Right panel - Cart */}
      <div className="flex-1 overflow-y-auto pr-4 lg:block hidden">
        <CartPanel
          items={cartItems}
          customer={customer}
          globalDiscount={globalDiscount}
          note={note}
          saleDate={saleDate}
          onQuantityChange={handleQuantityChange}
          onRemoveItem={handleRemoveItem}
          onApplyItemDiscount={handleApplyItemDiscount}
          onCustomerChange={handleCustomerChange}
          onGlobalDiscountChange={handleGlobalDiscountChange}
          onAddCustomItem={handleAddCustomItem}
          onNoteChange={handleNoteChange}
          onSaleDateChange={handleSaleDateChange}
          onContinue={handleContinue}
          onClearCart={handleClearCart}
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t bg-background px-4 pb-safe lg:hidden">
        <div className="p-4">
          <Drawer>
            <DrawerTrigger asChild>
              <Button
                size="lg"
                className="w-full flex gap-4 text-base font-medium active:scale-[0.99]"
              >
                <ShoppingCart className="size-4" />
                <span>Ver carrito</span>
                <span className="text-gray-500">{cartItems.length}</span>
              </Button>
            </DrawerTrigger>

            <DrawerContent className="h-screen">
              <DrawerHeader className="hidden">
                <DrawerTitle className="text-left text-sm w-fit"></DrawerTitle>
              </DrawerHeader>

              <div className="flex-1 overflow-y-auto px-4 pb-6">
                <CartPanel
                  items={cartItems}
                  customer={customer}
                  globalDiscount={globalDiscount}
                  note={note}
                  saleDate={saleDate}
                  onQuantityChange={handleQuantityChange}
                  onRemoveItem={handleRemoveItem}
                  onApplyItemDiscount={handleApplyItemDiscount}
                  onCustomerChange={handleCustomerChange}
                  onGlobalDiscountChange={handleGlobalDiscountChange}
                  onAddCustomItem={handleAddCustomItem}
                  onNoteChange={handleNoteChange}
                  onSaleDateChange={handleSaleDateChange}
                  onContinue={handleContinue}
                  onClearCart={handleClearCart}
                />
              </div>
            </DrawerContent>
            <DrawerFooter></DrawerFooter>
          </Drawer>
        </div>
      </div>
    </div>
  );
}

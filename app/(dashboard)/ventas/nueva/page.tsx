"use client";

import { ShoppingCart } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { CheckoutDialog } from "@/components/ventas/checkout-dialog";
import {
  ProductSearchPanel,
  ProductSearchPanelRef,
} from "@/components/ventas/product-search-panel";
import {
  type ProductForSale,
  getAdjustedPrice,
  getSaleForExchange,
  getSaleItemsForDuplicate,
} from "@/lib/services/sales";
import {
  type CartItem,
  type ExchangeData,
  type ExchangeItem,
  type ExchangeTotals,
  type GlobalDiscount,
  type ItemDiscount,
  type SelectedCustomer,
  calculateCartTotals,
  DEFAULT_CUSTOMER,
  generateCartItemId,
} from "@/lib/validations/sale";

export default function NuevaVentaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateProcessed = useRef(false);
  const exchangeProcessed = useRef(false);
  const productSearchRef = useRef<ProductSearchPanelRef>(null);
  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<SelectedCustomer>(DEFAULT_CUSTOMER);
  const [globalDiscount, setGlobalDiscount] = useState<GlobalDiscount | null>(
    null,
  );

  // Additional cart state
  const [note, setNote] = useState("");
  const [saleDate, setSaleDate] = useState(new Date());

  // Checkout state
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Exchange mode state
  const [isExchangeMode, setIsExchangeMode] = useState(false);
  const [exchangeData, setExchangeData] = useState<ExchangeData | null>(null);
  const [itemsToReturn, setItemsToReturn] = useState<ExchangeItem[]>([]);

  // Load duplicate sale items if duplicateId is present
  useEffect(() => {
    const duplicateId = searchParams.get("duplicateId");

    if (duplicateId && !duplicateProcessed.current) {
      duplicateProcessed.current = true;

      async function loadDuplicateItems() {
        try {
          const items = await getSaleItemsForDuplicate(duplicateId!);

          if (items.length > 0) {
            // Convert to CartItems
            const newCartItems: CartItem[] = items.map((item) => ({
              id: generateCartItemId(),
              productId: item.productId,
              name: item.name,
              sku: item.sku || "CUSTOM",
              price: item.price,
              basePrice: item.price,
              quantity: item.quantity,
              taxRate: item.taxRate,
              discount: null,
            }));

            setCartItems(newCartItems);
            toast.success(
              `${items.length} producto(s) cargados de la venta anterior`,
            );
          }

          // Clean URL without reloading the page
          router.replace("/ventas/nueva", { scroll: false });
        } catch (error) {
          console.error("Error loading duplicate sale:", error);
          toast.error("Error al cargar la venta para duplicar");
          router.replace("/ventas/nueva", { scroll: false });
        }
      }

      loadDuplicateItems();
    }
  }, [searchParams, router]);

  // Load exchange data if exchangeId is present
  useEffect(() => {
    const exchangeId = searchParams.get("exchangeId");

    if (exchangeId && !exchangeProcessed.current) {
      exchangeProcessed.current = true;

      async function loadExchangeData() {
        try {
          const data = await getSaleForExchange(exchangeId!);

          if (data) {
            // Set exchange mode
            setIsExchangeMode(true);
            setExchangeData({
              originalSaleId: data.originalSaleId,
              originalSaleNumber: data.originalSaleNumber,
              customerId: data.customerId,
              customerName: data.customerName,
              itemsToReturn: data.items,
            });
            setItemsToReturn(data.items);

            // Set customer from original sale
            setCustomer({
              id: data.customerId,
              name: data.customerName,
              taxId: null,
              taxCategory: null,
              priceListId: null,
              priceListName: null,
              priceListAdjustment: null,
              priceListAdjustmentType: null,
            });

            toast.success(
              `Modo cambio: ${data.items.length} producto(s) de la venta ${data.originalSaleNumber}`,
            );
            router.replace("/ventas/nueva", { scroll: false });
          } else {
            toast.error("No se encontró la venta para el cambio");
            router.replace("/ventas/nueva", { scroll: false });
          }
        } catch (error) {
          console.error("Error loading exchange data:", error);
          toast.error("Error al cargar la venta para el cambio");
          router.replace("/ventas/nueva", { scroll: false });
        }
      }

      loadExchangeData();
    }
  }, [searchParams, router]);

  // Calculate exchange totals
  const exchangeTotals: ExchangeTotals = useMemo(() => {
    const returnTotal = itemsToReturn.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const cartTotals = calculateCartTotals(cartItems, globalDiscount);
    const newProductsTotal = cartTotals.total;

    const balance = newProductsTotal - returnTotal;

    return {
      returnTotal,
      newProductsTotal,
      balance,
      isInFavorOfCustomer: balance < 0,
    };
  }, [itemsToReturn, cartItems, globalDiscount]);

  // Exchange handlers
  const handleCancelExchange = useCallback(() => {
    setIsExchangeMode(false);
    setExchangeData(null);
    setItemsToReturn([]);
    setCartItems([]);
    setCustomer(DEFAULT_CUSTOMER);
    setGlobalDiscount(null);
    setNote("");
    router.replace("/ventas/nueva", { scroll: false });
    toast.info("Modo cambio cancelado");
  }, [router]);

  const handleReturnQuantityChange = useCallback(
    (id: string, quantity: number) => {
      setItemsToReturn((items) =>
        items.map((item) =>
          item.id === id
            ? { ...item, quantity: Math.min(quantity, item.maxQuantity) }
            : item,
        ),
      );
    },
    [],
  );

  const handleRemoveReturnItem = useCallback((id: string) => {
    setItemsToReturn((items) => items.filter((item) => item.id !== id));
  }, []);

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

    setCheckoutOpen(true);
  }, [cartItems.length]);

  // Handle sale success - clean up after confirmed sale
  const handleSaleSuccess = useCallback(
    (saleNumber: string) => {
      // Actualizar stock localmente ANTES de limpiar el carrito
      if (productSearchRef.current && cartItems.length > 0) {
        productSearchRef.current.updateStock(
          cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        );
      }

      // Limpiar estado de venta normal
      setCartItems([]);
      setGlobalDiscount(null);
      setNote("");
      setCustomer(DEFAULT_CUSTOMER);
      setCheckoutOpen(false);

      // Limpiar estado de exchange
      setIsExchangeMode(false);
      setExchangeData(null);
      setItemsToReturn([]);

      toast.success(`Venta confirmada: ${saleNumber}`);
    },
    [cartItems],
  );

  return (
    <div className="flex h-[calc(100vh-5.5rem)] gap-4 lg:flex-row flex-col ">
      {/* Left panel - Product search */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-4 px-0 pb-20 ">
        <ProductSearchPanel
          ref={productSearchRef}
          onProductSelect={handleAddProduct}
        />
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
          isExchangeMode={isExchangeMode}
          exchangeData={exchangeData}
          itemsToReturn={itemsToReturn}
          onReturnQuantityChange={handleReturnQuantityChange}
          onRemoveReturnItem={handleRemoveReturnItem}
          onCancelExchange={handleCancelExchange}
          exchangeTotals={exchangeTotals}
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
                  isExchangeMode={isExchangeMode}
                  exchangeData={exchangeData}
                  itemsToReturn={itemsToReturn}
                  onReturnQuantityChange={handleReturnQuantityChange}
                  onRemoveReturnItem={handleRemoveReturnItem}
                  onCancelExchange={handleCancelExchange}
                  exchangeTotals={exchangeTotals}
                />
              </div>
            </DrawerContent>
            <DrawerFooter></DrawerFooter>
          </Drawer>
        </div>
      </div>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        cartItems={cartItems}
        customer={customer}
        globalDiscount={globalDiscount}
        note={note}
        saleDate={saleDate}
        onSuccess={handleSaleSuccess}
        isExchangeMode={isExchangeMode}
        exchangeData={exchangeData}
        itemsToReturn={itemsToReturn}
        exchangeTotals={exchangeTotals}
      />
    </div>
  );
}

"use client"

import { ShoppingCart } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { CartPanel } from "@/components/ventas/cart-panel"
import { CheckoutDialog } from "@/components/ventas/checkout"
import {
  ProductSearchPanel,
  type ProductSearchPanelRef,
} from "@/components/ventas/product-search-panel"
import { useActiveShift } from "@/hooks/use-active-shift"
import type { Category } from "@/lib/services/categories"
import type { Location } from "@/lib/services/locations"
import {
  type ProductForSale,
  getAdjustedPrice,
  getSaleForExchange,
  getSaleItemsForDuplicate,
} from "@/lib/services/sales"
import { useSaleCartStore } from "@/lib/store/sale-cart-store"
import {
  type CartItem,
  type ExchangeTotals,
  type GlobalDiscount,
  type ItemDiscount,
  type SelectedCustomer,
  calculateCartTotals,
  DEFAULT_CUSTOMER,
  generateCartItemId,
} from "@/lib/validations/sale"

interface NuevaVentaClientProps {
  initialProducts: ProductForSale[]
  topSellingProducts: ProductForSale[]
  categories: Category[]
  allLocations: Location[]
  activeSafeBoxes: Array<{ id: string; name: string }>
}

export function NuevaVentaClient({
  initialProducts,
  topSellingProducts,
  categories,
  allLocations,
  activeSafeBoxes,
}: NuevaVentaClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const duplicateProcessed = useRef(false)
  const exchangeProcessed = useRef(false)
  const quoteProcessed = useRef(false)
  const productSearchRef = useRef<ProductSearchPanelRef>(null)

  // Store state
  const {
    cartItems,
    customer,
    globalDiscount,
    note,
    saleDate,
    isExchangeMode,
    exchangeData,
    itemsToReturn,
    setCartItems,
    setCustomer,
    setGlobalDiscount,
    setNote,
    setSaleDate,
    addItem,
    removeItem,
    updateQuantity,
    applyItemDiscount,
    setExchangeMode,
    updateReturnQuantity,
    removeReturnItem,
    clear,
  } = useSaleCartStore()

  const { shift } = useActiveShift()

  // Checkout state (UI-only, no persistence needed)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  // Load duplicate sale items if duplicateId is present
  useEffect(() => {
    const duplicateId = searchParams.get("duplicateId")

    if (duplicateId && !duplicateProcessed.current) {
      duplicateProcessed.current = true

      async function loadDuplicateItems() {
        try {
          const items = await getSaleItemsForDuplicate(duplicateId!)

          if (items.length > 0) {
            // Convert to CartItems
            const newCartItems: CartItem[] = items.map((item) => ({
              id: generateCartItemId(),
              productId: item.productId,
              name: item.name,
              sku: item.sku || "CUSTOM",
              price: item.price,
              basePrice: item.price,
              cost: null,
              quantity: item.quantity,
              taxRate: item.taxRate,
              discount: null,
            }))

            setCartItems(newCartItems)
            toast.success(
              `${items.length} producto(s) cargados de la venta anterior`,
            )
          }

          // Clean URL without reloading the page
          router.replace("/ventas/nueva", { scroll: false })
        } catch (error) {
          console.error("Error loading duplicate sale:", error)
          toast.error("Error al cargar la venta para duplicar")
          router.replace("/ventas/nueva", { scroll: false })
        }
      }

      loadDuplicateItems()
    }
  }, [searchParams, router, setCartItems])

  // Load exchange data if exchangeId is present
  useEffect(() => {
    const exchangeId = searchParams.get("exchangeId")

    if (exchangeId && !exchangeProcessed.current) {
      exchangeProcessed.current = true

      async function loadExchangeData() {
        try {
          const data = await getSaleForExchange(exchangeId!)

          if (data) {
            // Set exchange mode
            setExchangeMode(
              true,
              {
                originalSaleId: data.originalSaleId,
                originalSaleNumber: data.originalSaleNumber,
                customerId: data.customerId,
                customerName: data.customerName,
                itemsToReturn: data.items,
              },
              data.items,
            )

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
            })

            toast.success(
              `Modo cambio: ${data.items.length} producto(s) de la venta ${data.originalSaleNumber}`,
            )
            router.replace("/ventas/nueva", { scroll: false })
          } else {
            toast.error("No se encontró la venta para el cambio")
            router.replace("/ventas/nueva", { scroll: false })
          }
        } catch (error) {
          console.error("Error loading exchange data:", error)
          toast.error("Error al cargar la venta para el cambio")
          router.replace("/ventas/nueva", { scroll: false })
        }
      }

      loadExchangeData()
    }
  }, [searchParams, router, setExchangeMode, setCustomer])

  // Load quote items if quoteId is present
  useEffect(() => {
    const quoteId = searchParams.get("quoteId")

    if (quoteId && !quoteProcessed.current) {
      quoteProcessed.current = true

      async function loadQuote() {
        try {
          const { getQuoteById, getQuoteCartData } =
            await import("@/lib/services/quotes")
          const quote = await getQuoteById(quoteId!)
          const cartData = getQuoteCartData(quote)

          setCartItems(cartData.items as CartItem[])
          setGlobalDiscount(cartData.globalDiscount)
          setNote(cartData.note)

          if (cartData.customer.id) {
            setCustomer({
              ...DEFAULT_CUSTOMER,
              id: cartData.customer.id,
              name: cartData.customer.name,
            })
          }

          toast.success(
            `Presupuesto ${quote.quote_number} cargado (${cartData.items.length} producto/s)`,
          )
          router.replace("/ventas/nueva", { scroll: false })
        } catch (error) {
          console.error("Error loading quote:", error)
          toast.error("Error al cargar presupuesto")
          router.replace("/ventas/nueva", { scroll: false })
        }
      }

      loadQuote()
    }
  }, [
    searchParams,
    router,
    setCartItems,
    setGlobalDiscount,
    setNote,
    setCustomer,
  ])

  // Calculate exchange totals
  const exchangeTotals: ExchangeTotals = useMemo(() => {
    const returnTotal = itemsToReturn.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    )

    const cartTotals = calculateCartTotals(cartItems, globalDiscount)
    const newProductsTotal = cartTotals.total

    const balance = newProductsTotal - returnTotal

    return {
      returnTotal,
      newProductsTotal,
      balance,
      isInFavorOfCustomer: balance < 0,
    }
  }, [itemsToReturn, cartItems, globalDiscount])

  // Exchange handlers
  const handleCancelExchange = useCallback(() => {
    clear()
    router.replace("/ventas/nueva", { scroll: false })
    toast.info("Modo cambio cancelado")
  }, [router, clear])

  const handleReturnQuantityChange = useCallback(
    (id: string, quantity: number) => {
      updateReturnQuantity(id, quantity)
    },
    [updateReturnQuantity],
  )

  const handleRemoveReturnItem = useCallback(
    (id: string) => {
      removeReturnItem(id)
    },
    [removeReturnItem],
  )

  // Add product to cart
  const handleAddProduct = useCallback(
    (product: ProductForSale) => {
      // Check if product already exists in cart
      const existingItem = cartItems.find(
        (item) => item.productId === product.id,
      )

      if (existingItem) {
        // addItem handles incrementing for existing products
        addItem(existingItem)
        toast(`${product.name} agregado al carrito`)
        return
      }

      // Calculate adjusted price based on customer's price list
      const adjustedPrice = getAdjustedPrice(
        product.price,
        customer.priceListAdjustmentType,
        customer.priceListAdjustment,
      )

      // Add new item
      const newItem: CartItem = {
        id: generateCartItemId(),
        productId: product.id,
        name: product.name,
        sku: product.sku,
        price: adjustedPrice,
        basePrice: product.price,
        cost: product.cost,
        quantity: 1,
        taxRate: product.taxRate,
        discount: null,
        imageUrl: product.imageUrl,
      }

      addItem(newItem)
      toast(`${product.name} agregado al carrito`)
    },
    [
      customer.priceListAdjustment,
      customer.priceListAdjustmentType,
      cartItems,
      addItem,
    ],
  )

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
        cost: null,
        quantity,
        taxRate,
        discount: null,
        imageUrl: null,
      }

      addItem(customItem)
      toast(`${name} agregado al carrito`)
    },
    [addItem],
  )

  // Update item quantity
  const handleQuantityChange = useCallback(
    (id: string, quantity: number) => {
      updateQuantity(id, quantity)
    },
    [updateQuantity],
  )

  // Remove item from cart
  const handleRemoveItem = useCallback(
    (id: string) => {
      removeItem(id)
    },
    [removeItem],
  )

  // Apply item discount
  const handleApplyItemDiscount = useCallback(
    (id: string, discount: ItemDiscount | null) => {
      applyItemDiscount(id, discount)
    },
    [applyItemDiscount],
  )

  const handleCustomerChange = useCallback(
    (newCustomer: SelectedCustomer) => {
      const oldCustomer = customer

      // Check if price list changed
      const priceListChanged =
        oldCustomer.priceListId !== newCustomer.priceListId ||
        oldCustomer.priceListAdjustment !== newCustomer.priceListAdjustment ||
        oldCustomer.priceListAdjustmentType !==
          newCustomer.priceListAdjustmentType

      setCustomer(newCustomer)

      // Recalculate prices if price list changed
      if (priceListChanged && cartItems.length > 0) {
        setCartItems(
          cartItems.map((item) => {
            // Only recalculate products, NOT custom items
            if (!item.productId) return item

            const basePrice = item.price

            const newPrice = getAdjustedPrice(
              basePrice,
              newCustomer.priceListAdjustmentType,
              newCustomer.priceListAdjustment,
            )

            return { ...item, price: newPrice }
          }),
        )

        const message =
          newCustomer.priceListId && newCustomer.priceListAdjustment
            ? `Precios actualizados con lista: ${newCustomer.priceListName} ${newCustomer.priceListAdjustmentType === "AUMENTO" ? "+" : "-"}${newCustomer.priceListAdjustment}%`
            : `Cliente: ${newCustomer.name}`
        toast.info(message)
      }
    },
    [customer, cartItems, setCustomer, setCartItems],
  )

  // Change global discount
  const handleGlobalDiscountChange = useCallback(
    (discount: GlobalDiscount | null) => {
      setGlobalDiscount(discount)
    },
    [setGlobalDiscount],
  )

  // Change note
  const handleNoteChange = useCallback(
    (newNote: string) => {
      setNote(newNote)
    },
    [setNote],
  )

  // Change sale date
  const handleSaleDateChange = useCallback(
    (date: Date) => {
      setSaleDate(date)
      toast.info(`Fecha cambiada a ${date.toLocaleDateString("es-AR")}`)
    },
    [setSaleDate],
  )

  // Clear cart
  const handleClearCart = useCallback(() => {
    clear()
    toast("Carrito vaciado")
  }, [clear])

  // Continue to checkout
  const handleContinue = useCallback(() => {
    if (cartItems.length === 0) {
      toast.error("Carrito vacío", {
        description: "Agrega productos al carrito para continuar",
      })
      return
    }

    setCheckoutOpen(true)
  }, [cartItems.length])

  // Handle sale success - clean up after confirmed sale
  const handleSaleSuccess = useCallback(
    (saleNumber: string) => {
      // Update stock locally BEFORE clearing the cart
      if (productSearchRef.current && cartItems.length > 0) {
        productSearchRef.current.updateStock(
          cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        )
      }

      // Clear all state
      clear()
      setCheckoutOpen(false)

      toast.success(`Venta confirmada: ${saleNumber}`)
    },
    [cartItems, clear],
  )

  return (
    <div className="flex h-[calc(100vh-5.5rem)] gap-4 lg:flex-row flex-col ">
      {/* Left panel - Product search */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-4 px-0 pb-20 ">
        <ProductSearchPanel
          ref={productSearchRef}
          allProducts={initialProducts}
          topSellingProducts={topSellingProducts}
          categories={categories}
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
          activeSafeBoxes={activeSafeBoxes}
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
                  activeSafeBoxes={activeSafeBoxes}
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
        shift={shift}
        onSaleDateChange={handleSaleDateChange}
        allLocations={allLocations}
      />
    </div>
  )
}

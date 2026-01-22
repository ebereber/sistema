# Tarea: Implementar Módulo de Nueva Venta - `/ventas/nueva`

## Contexto del Proyecto

Sistema POS Lemar - Next.js 16, TypeScript, Supabase, shadcn/ui (New York style)

**IMPORTANTE:** Lee primero el archivo `claude.md` en la raíz del proyecto para entender convenciones, estructura y patrones de código.

---

## Alcance de esta Tarea

**IMPLEMENTAR:**
✅ Pantalla de Nueva Venta (`/ventas/nueva`)
✅ Panel izquierdo: Búsqueda de productos
✅ Panel derecho: Carrito con gestión de items
✅ Sistema de descuentos (global y por producto)
✅ Selección de cliente
✅ Navegación a checkout

**NO IMPLEMENTAR (para después):**
❌ Checkout/Cobro
❌ Registro de pagos
❌ Generación de comprobantes
❌ Facturación AFIP

---

## Referencia Visual

La pantalla debe verse como el diseño adjunto:
- **Layout:** Dos columnas (40/60 o 35/65)
- **Izquierda:** Búsqueda + filtros por categoría + productos recientes
- **Derecha:** Header de caja + cliente + items + descuentos + total

---

## 1. ESTRUCTURA DE ARCHIVOS

```
app/(dashboard)/ventas/
└── nueva/
    └── page.tsx                  # Página principal

components/ventas/
├── product-search-panel.tsx      # Panel izquierdo
├── cart-panel.tsx                # Panel derecho
├── product-item.tsx              # Item de producto (izquierda)
├── cart-item.tsx                 # Item del carrito (derecha)
├── customer-select-dialog.tsx    # Dialog de selección de cliente
├── discount-dialog.tsx           # Dialog de descuentos
└── cart-summary.tsx              # Resumen de totales

lib/services/
└── sales.ts                      # Lógica de ventas (si no existe)

lib/validations/
└── sale.ts                       # Schemas Zod
```

---

## 2. BASE DE DATOS

**Tablas necesarias (ya existen en Supabase):**
- `products` - Productos
- `categories` - Categorías
- `customers` - Clientes
- `price_lists` - Listas de precios
- `price_list_items` - Items de listas
- `stock` - Stock por ubicación

**NO crear ventas todavía** - solo preparar el carrito en estado local.

---

## 3. PÁGINA PRINCIPAL: `/ventas/nueva`

### Archivo: `app/(dashboard)/ventas/nueva/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { ProductSearchPanel } from '@/components/ventas/product-search-panel'
import { CartPanel } from '@/components/ventas/cart-panel'
import { useRouter } from 'next/navigation'

interface CartItem {
  id: string
  product_id: string
  name: string
  sku: string
  quantity: number
  unit_price: number
  discount: number  // monto fijo o porcentaje
  discount_type: 'fixed' | 'percentage'
  tax_rate: number
  subtotal: number
  total: number
}

interface Customer {
  id: string
  name: string
  tax_id?: string
  price_list_id?: string
}

export default function NuevaVentaPage() {
  const router = useRouter()
  
  // Estado del carrito
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [globalDiscount, setGlobalDiscount] = useState<{
    value: number
    type: 'fixed' | 'percentage'
  } | null>(null)

  // Agregar producto al carrito
  function addToCart(product: any) {
    // Si ya existe, incrementar cantidad
    const existing = cartItems.find(item => item.product_id === product.id)
    
    if (existing) {
      updateQuantity(existing.id, existing.quantity + 1)
    } else {
      // Aplicar precio según lista del cliente
      const price = customer?.price_list_id 
        ? getPriceFromList(product.id, customer.price_list_id)
        : product.price
      
      const newItem: CartItem = {
        id: crypto.randomUUID(),
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        quantity: 1,
        unit_price: price,
        discount: 0,
        discount_type: 'fixed',
        tax_rate: product.tax_rate || 21,
        subtotal: price,
        total: price * (1 + (product.tax_rate || 21) / 100)
      }
      
      setCartItems([...cartItems, newItem])
    }
  }

  // Actualizar cantidad
  function updateQuantity(itemId: string, newQuantity: number) {
    if (newQuantity <= 0) {
      removeItem(itemId)
      return
    }
    
    setCartItems(items =>
      items.map(item => {
        if (item.id === itemId) {
          const subtotal = item.unit_price * newQuantity - item.discount
          const total = subtotal * (1 + item.tax_rate / 100)
          return { ...item, quantity: newQuantity, subtotal, total }
        }
        return item
      })
    )
  }

  // Remover item
  function removeItem(itemId: string) {
    setCartItems(items => items.filter(item => item.id !== itemId))
  }

  // Aplicar descuento por item
  function applyItemDiscount(itemId: string, discount: number, type: 'fixed' | 'percentage') {
    setCartItems(items =>
      items.map(item => {
        if (item.id === itemId) {
          const discountAmount = type === 'percentage'
            ? (item.unit_price * item.quantity * discount / 100)
            : discount
          
          const subtotal = (item.unit_price * item.quantity) - discountAmount
          const total = subtotal * (1 + item.tax_rate / 100)
          
          return { 
            ...item, 
            discount: discountAmount, 
            discount_type: type,
            subtotal, 
            total 
          }
        }
        return item
      })
    )
  }

  // Calcular totales
  const subtotal = cartItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0)
  const itemDiscounts = cartItems.reduce((sum, item) => sum + item.discount, 0)
  
  const globalDiscountAmount = globalDiscount
    ? globalDiscount.type === 'percentage'
      ? (subtotal - itemDiscounts) * globalDiscount.value / 100
      : globalDiscount.value
    : 0
  
  const totalDiscounts = itemDiscounts + globalDiscountAmount
  const subtotalAfterDiscount = subtotal - totalDiscounts
  const tax = cartItems.reduce((sum, item) => sum + (item.subtotal * item.tax_rate / 100), 0)
  const total = Math.max(0, subtotalAfterDiscount + tax)

  // Ir a checkout
  function handleContinue() {
    if (cartItems.length === 0) return
    
    // Guardar carrito en sessionStorage
    sessionStorage.setItem('draft-sale', JSON.stringify({
      items: cartItems,
      customer,
      globalDiscount,
      totals: { subtotal, totalDiscounts, tax, total }
    }))
    
    router.push('/ventas/nueva/checkout')
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4">
      {/* Panel izquierdo */}
      <ProductSearchPanel onAddProduct={addToCart} />
      
      {/* Panel derecho */}
      <CartPanel
        items={cartItems}
        customer={customer}
        globalDiscount={globalDiscount}
        totals={{ subtotal, totalDiscounts, tax, total }}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onSelectCustomer={setCustomer}
        onApplyItemDiscount={applyItemDiscount}
        onApplyGlobalDiscount={setGlobalDiscount}
        onContinue={handleContinue}
      />
    </div>
  )
}
```

---

## 4. PANEL IZQUIERDO: Búsqueda de Productos

### Componente: `components/ventas/product-search-panel.tsx`

**Layout:**
```
┌─────────────────────────────────────┐
│ 🔍 Buscar producto... [⌘F]         │
├─────────────────────────────────────┤
│ [Todos] [electricidad] [cajas...]  │  ← Tabs de categorías
├─────────────────────────────────────┤
│ Vendidos recientemente              │
│                                     │
│ 📦 Caja Octogonal        4    $86   │
│    SKU: SKU-459                     │
│                                     │
│ 📦 Cable UTP Cat6       10   $150   │
│    SKU: SKU-123                     │
│                                     │
│ 📦 Tomacorriente 2×2    20    $45   │
│    SKU: SKU-789                     │
└─────────────────────────────────────┘
```

**Implementación:**
```typescript
'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProductItem } from './product-item'
import { getProducts } from '@/lib/services/products'
import { getCategories } from '@/lib/services/categories'
import { Search } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'

interface ProductSearchPanelProps {
  onAddProduct: (product: any) => void
}

export function ProductSearchPanel({ onAddProduct }: ProductSearchPanelProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  const debouncedSearch = useDebounce(search, 300)

  // Cargar categorías
  useEffect(() => {
    loadCategories()
  }, [])

  // Cargar productos
  useEffect(() => {
    loadProducts()
  }, [debouncedSearch, selectedCategory])

  async function loadCategories() {
    try {
      const data = await getCategories({ active: true })
      setCategories(data)
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  async function loadProducts() {
    setIsLoading(true)
    try {
      const data = await getProducts({
        search: debouncedSearch,
        categoryId: selectedCategory,
        active: true,
        hasStock: true
      })
      setProducts(data)
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col border-r">
      {/* Búsqueda */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>F
          </kbd>
        </div>
      </div>

      {/* Categorías */}
      <Tabs value={selectedCategory || 'all'} onValueChange={(v) => setSelectedCategory(v === 'all' ? null : v)}>
        <TabsList className="w-full justify-start rounded-none border-b px-4">
          <TabsTrigger value="all">Todos</TabsTrigger>
          {categories.map(cat => (
            <TabsTrigger key={cat.id} value={cat.id}>
              {cat.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Lista de productos */}
      <div className="flex-1 overflow-auto p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">
          {search ? 'Resultados' : 'Vendidos recientemente'}
        </h3>
        
        {isLoading ? (
          <div>Cargando...</div>
        ) : products.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay productos</p>
        ) : (
          <div className="space-y-2">
            {products.map(product => (
              <ProductItem
                key={product.id}
                product={product}
                onClick={() => onAddProduct(product)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## 5. ITEM DE PRODUCTO (Panel Izquierdo)

### Componente: `components/ventas/product-item.tsx`

```typescript
import { Card } from '@/components/ui/card'
import { Package } from 'lucide-react'

interface ProductItemProps {
  product: any
  onClick: () => void
}

export function ProductItem({ product, onClick }: ProductItemProps) {
  return (
    <Card
      className="p-3 cursor-pointer hover:bg-accent transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {/* Icono o imagen */}
        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover rounded" />
          ) : (
            <Package className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{product.name}</p>
          <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
        </div>

        {/* Stock y precio */}
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm font-medium">${product.price.toFixed(2)}</span>
          <span className="text-xs text-muted-foreground">{product.stock_quantity || 0} disponibles</span>
        </div>
      </div>
    </Card>
  )
}
```

---

## 6. PANEL DERECHO: Carrito

### Componente: `components/ventas/cart-panel.tsx`

**Layout:**
```
┌─────────────────────────────────────┐
│ Caja Principal              [•••][🗑]│
│                                     │
│ 👤 Agregar cliente [⌘C]    Consumidor final│
├─────────────────────────────────────┤
│ Caja Octogonal          [-][3][+]  │
│ SKU-459 • $86                $258   │
│                                     │
│ Cable UTP Cat6          [🗑][1][+] │
│ SKU-123 • $150               $150   │
├─────────────────────────────────────┤
│ + Agregar descuento [⌘D]           │
│                                     │
│ Total                        $408   │
│ [Continuar]                         │
└─────────────────────────────────────┘
```

**Implementación:**
```typescript
'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CartItem } from './cart-item'
import { CartSummary } from './cart-summary'
import { CustomerSelectDialog } from './customer-select-dialog'
import { DiscountDialog } from './discount-dialog'
import { MoreVertical, Trash2, UserPlus } from 'lucide-react'
import { useState } from 'react'

interface CartPanelProps {
  items: any[]
  customer: any
  globalDiscount: any
  totals: {
    subtotal: number
    totalDiscounts: number
    tax: number
    total: number
  }
  onUpdateQuantity: (itemId: string, quantity: number) => void
  onRemoveItem: (itemId: string) => void
  onSelectCustomer: (customer: any) => void
  onApplyItemDiscount: (itemId: string, discount: number, type: 'fixed' | 'percentage') => void
  onApplyGlobalDiscount: (discount: any) => void
  onContinue: () => void
}

export function CartPanel({
  items,
  customer,
  globalDiscount,
  totals,
  onUpdateQuantity,
  onRemoveItem,
  onSelectCustomer,
  onApplyItemDiscount,
  onApplyGlobalDiscount,
  onContinue
}: CartPanelProps) {
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false)

  return (
    <div className="w-[600px] flex flex-col border-l bg-muted/30">
      {/* Header */}
      <div className="p-4 border-b bg-background">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Caja Principal</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Cliente */}
        <Button
          variant="outline"
          className="w-full justify-between"
          onClick={() => setCustomerDialogOpen(true)}
        >
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            <span>Agregar cliente</span>
            <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>C
            </kbd>
          </div>
          <span className="text-muted-foreground">
            {customer ? customer.name : 'Consumidor final'}
          </span>
        </Button>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Package className="h-12 w-12 mb-2" />
            <p>El carrito está vacío</p>
            <p className="text-sm">Buscá productos en el panel izquierdo</p>
          </div>
        ) : (
          items.map(item => (
            <CartItem
              key={item.id}
              item={item}
              onUpdateQuantity={(qty) => onUpdateQuantity(item.id, qty)}
              onRemove={() => onRemoveItem(item.id)}
              onApplyDiscount={(discount, type) => onApplyItemDiscount(item.id, discount, type)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-background space-y-4">
        {/* Descuento global */}
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => setDiscountDialogOpen(true)}
        >
          + Agregar descuento
          <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>D
          </kbd>
        </Button>

        {/* Totales */}
        <CartSummary totals={totals} globalDiscount={globalDiscount} />

        {/* Botón continuar */}
        <Button
          className="w-full"
          size="lg"
          disabled={items.length === 0}
          onClick={onContinue}
        >
          Continuar
        </Button>
      </div>

      {/* Dialogs */}
      <CustomerSelectDialog
        open={customerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        onSelect={onSelectCustomer}
      />

      <DiscountDialog
        open={discountDialogOpen}
        onOpenChange={setDiscountDialogOpen}
        items={items}
        globalDiscount={globalDiscount}
        onApplyGlobalDiscount={onApplyGlobalDiscount}
        onApplyItemDiscount={onApplyItemDiscount}
      />
    </div>
  )
}
```

---

## 7. ITEM DEL CARRITO

### Componente: `components/ventas/cart-item.tsx`

```typescript
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Minus, Plus, Trash2 } from 'lucide-react'

interface CartItemProps {
  item: any
  onUpdateQuantity: (quantity: number) => void
  onRemove: () => void
  onApplyDiscount: (discount: number, type: 'fixed' | 'percentage') => void
}

export function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  return (
    <div className="bg-background rounded-lg p-3 space-y-2">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-medium">{item.name}</p>
          <p className="text-xs text-muted-foreground">
            {item.sku} • ${item.unit_price.toFixed(2)}
          </p>
        </div>
        {item.discount > 0 && (
          <Badge variant="secondary" className="ml-2">
            {item.discount_type === 'percentage' 
              ? `${item.discount}% OFF` 
              : `-$${item.discount.toFixed(2)}`
            }
          </Badge>
        )}
      </div>

      {/* Cantidad y total */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onUpdateQuantity(item.quantity - 1)}
          >
            {item.quantity === 1 ? (
              <Trash2 className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
          </Button>

          <Input
            type="number"
            value={item.quantity}
            onChange={(e) => onUpdateQuantity(parseInt(e.target.value) || 0)}
            className="h-8 w-16 text-center"
          />

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onUpdateQuantity(item.quantity + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <span className="font-semibold">${item.total.toFixed(2)}</span>
      </div>
    </div>
  )
}
```

---

## 8. RESUMEN DE TOTALES

### Componente: `components/ventas/cart-summary.tsx`

```typescript
interface CartSummaryProps {
  totals: {
    subtotal: number
    totalDiscounts: number
    tax: number
    total: number
  }
  globalDiscount: any
}

export function CartSummary({ totals, globalDiscount }: CartSummaryProps) {
  return (
    <div className="space-y-2">
      {totals.totalDiscounts > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Descuentos</span>
          <span className="text-destructive">-${totals.totalDiscounts.toFixed(2)}</span>
        </div>
      )}
      
      <div className="flex justify-between text-lg font-semibold pt-2 border-t">
        <span>Total</span>
        <span>${totals.total.toFixed(2)}</span>
      </div>
    </div>
  )
}
```

---

## 9. DIALOG: Seleccionar Cliente

### Componente: `components/ventas/customer-select-dialog.tsx`

**Funcionalidad:**
- Búsqueda de clientes existentes
- Crear cliente nuevo
- Mostrar "Consumidor final" por defecto

```typescript
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { searchCustomers } from '@/lib/services/customers'
import { Search, Plus } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'

interface CustomerSelectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (customer: any) => void
}

export function CustomerSelectDialog({
  open,
  onOpenChange,
  onSelect
}: CustomerSelectDialogProps) {
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    if (debouncedSearch) {
      loadCustomers()
    }
  }, [debouncedSearch])

  async function loadCustomers() {
    setIsLoading(true)
    try {
      const data = await searchCustomers(debouncedSearch)
      setCustomers(data)
    } catch (error) {
      console.error('Error searching customers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function handleSelect(customer: any) {
    onSelect(customer)
    onOpenChange(false)
    setSearch('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Seleccionar cliente</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o DNI/CUIT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Consumidor final */}
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => handleSelect(null)}
          >
            Consumidor final
          </Button>

          {/* Crear nuevo */}
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              // TODO: Abrir dialog de crear cliente
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Crear nuevo cliente
          </Button>

          {/* Resultados */}
          {customers.length > 0 && (
            <div className="border rounded-lg divide-y max-h-[300px] overflow-auto">
              {customers.map(customer => (
                <button
                  key={customer.id}
                  className="w-full p-3 text-left hover:bg-accent transition-colors"
                  onClick={() => handleSelect(customer)}
                >
                  <p className="font-medium">{customer.name}</p>
                  {customer.tax_id && (
                    <p className="text-xs text-muted-foreground">
                      {customer.tax_id_type}: {customer.tax_id}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 10. DIALOG: Descuentos

### Componente: `components/ventas/discount-dialog.tsx`

**Funcionalidad:**
- Descuento global (% o monto fijo)
- Descuentos por producto
- Validación: no puede exceder el subtotal

```typescript
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

interface DiscountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: any[]
  globalDiscount: any
  onApplyGlobalDiscount: (discount: any) => void
  onApplyItemDiscount: (itemId: string, discount: number, type: 'fixed' | 'percentage') => void
}

export function DiscountDialog({
  open,
  onOpenChange,
  items,
  globalDiscount,
  onApplyGlobalDiscount
}: DiscountDialogProps) {
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>(
    globalDiscount?.type || 'percentage'
  )
  const [discountValue, setDiscountValue] = useState(
    globalDiscount?.value?.toString() || ''
  )

  const subtotal = items.reduce((sum, item) => 
    sum + (item.unit_price * item.quantity), 0
  )

  const discountAmount = discountType === 'percentage'
    ? (subtotal * parseFloat(discountValue || '0') / 100)
    : parseFloat(discountValue || '0')

  const exceedsSubtotal = discountAmount > subtotal

  function handleApply() {
    const value = parseFloat(discountValue)
    if (isNaN(value) || value <= 0) return

    onApplyGlobalDiscount({
      value,
      type: discountType
    })

    onOpenChange(false)
  }

  function handleRemove() {
    onApplyGlobalDiscount(null)
    setDiscountValue('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aplicar descuento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Descuento global */}
          <div className="space-y-2">
            <Label>Descuento global</Label>
            <div className="flex gap-2">
              <Select value={discountType} onValueChange={(v: any) => setDiscountType(v)}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">%</SelectItem>
                  <SelectItem value="fixed">$</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="number"
                placeholder="0"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="flex-1"
              />
            </div>

            {exceedsSubtotal && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  El descuento no puede exceder el subtotal (${subtotal.toFixed(2)})
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Preview */}
          {discountValue && !exceedsSubtotal && (
            <div className="p-3 rounded bg-muted text-sm">
              <div className="flex justify-between">
                <span>Descuento:</span>
                <span className="font-medium">-${discountAmount.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {globalDiscount && (
            <Button variant="outline" onClick={handleRemove}>
              Eliminar descuento
            </Button>
          )}
          <Button onClick={handleApply} disabled={exceedsSubtotal || !discountValue}>
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 11. SERVICIOS

### Archivo: `lib/services/sales.ts` (si no existe)

```typescript
import { createClient } from '@/lib/supabase/client'

// Obtener precio desde lista de precios
export async function getPriceFromList(productId: string, priceListId: string) {
  const supabase = createClient()

  const { data } = await supabase
    .from('price_list_items')
    .select('price')
    .eq('product_id', productId)
    .eq('price_list_id', priceListId)
    .single()

  return data?.price
}

// Buscar productos (extender si no existe en products.ts)
export async function searchProducts(query: string, categoryId?: string) {
  const supabase = createClient()

  let queryBuilder = supabase
    .from('products')
    .select(`
      *,
      category:categories(name),
      stocks:stock(quantity)
    `)
    .eq('active', true)

  if (query) {
    queryBuilder = queryBuilder.or(
      `name.ilike.%${query}%,sku.ilike.%${query}%,barcode.eq.${query}`
    )
  }

  if (categoryId) {
    queryBuilder = queryBuilder.eq('category_id', categoryId)
  }

  const { data, error } = await queryBuilder.limit(20)

  if (error) throw error

  // Calcular stock total
  return data.map(product => ({
    ...product,
    stock_quantity: product.stocks?.reduce((sum, s) => sum + s.quantity, 0) || 0
  }))
}
```

---

## 12. VALIDACIONES

### Archivo: `lib/validations/sale.ts`

```typescript
import { z } from 'zod'

export const cartItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().positive(),
  unit_price: z.number().positive(),
  discount: z.number().min(0),
  discount_type: z.enum(['fixed', 'percentage']),
  tax_rate: z.number().min(0).max(100)
})

export const saleSchema = z.object({
  customer_id: z.string().uuid().nullable(),
  items: z.array(cartItemSchema).min(1),
  global_discount: z.object({
    value: z.number().positive(),
    type: z.enum(['fixed', 'percentage'])
  }).nullable(),
  notes: z.string().optional()
})
```

---

## Criterios de Éxito

✅ Panel izquierdo muestra productos con búsqueda y filtros
✅ Click en producto lo agrega al carrito
✅ Carrito muestra items con cantidad editable
✅ Se pueden aplicar descuentos por item y global
✅ Se puede seleccionar cliente
✅ Botón "Continuar" guarda estado y navega a checkout
✅ Precios se calculan según lista del cliente
✅ Validaciones funcionan (descuentos, cantidades)
✅ UI responsive y pulida
✅ Atajos de teclado funcionan (⌘F, ⌘C, ⌘D)

---

## Notas Importantes

- **NO implementar checkout todavía** - solo preparar el carrito
- Usar `sessionStorage` para guardar el borrador
- Los totales deben recalcularse en tiempo real
- Stock se muestra pero NO se valida todavía
- Formato de moneda: `$1,234.56` (con coma de miles)
- Mensajes en español
- Usar los componentes de shadcn/ui existentes
- Seguir convenciones del proyecto (ver `claude.md`)

---

**¡RECUERDA!** Lee `claude.md` para convenciones del proyecto.

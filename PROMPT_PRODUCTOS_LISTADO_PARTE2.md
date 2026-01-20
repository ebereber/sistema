# Tarea: Implementar Acciones Individuales de Productos - PARTE 2

## Contexto del Proyecto

Sistema POS Lemar - Next.js 16, TypeScript, Supabase, shadcn/ui (New York style)

**IMPORTANTE:** Lee primero el archivo `claude.md` en la raíz del proyecto para entender convenciones, estructura y patrones de código.

---

## Alcance de esta Tarea - PARTE 2

**PREREQUISITO:**
✅ Parte 1 ya implementada (listado básico con búsqueda, filtros, tabla)

**IMPLEMENTAR AHORA:**
✅ Columna "Acciones" en la tabla (dropdown 3 puntos)
✅ Dialog: Gestionar Stock
✅ Funcionalidad: Duplicar producto
✅ AlertDialog: Archivar producto
✅ AlertDialog: Eliminar producto
✅ Integrar dialogs existentes (Historial, Movimientos)

**NO IMPLEMENTAR (Parte 3):**
❌ Selección múltiple (checkboxes)
❌ Acciones masivas
❌ Barra de seleccionados

---

## Archivos a Modificar/Crear

```
app/(dashboard)/productos/
└── page.tsx                         # MODIFICAR: agregar columna Acciones

components/productos/
├── stock-management-dialog.tsx      # CREAR: Dialog gestionar stock
├── archive-product-dialog.tsx       # CREAR: AlertDialog archivar
└── delete-product-dialog.tsx        # CREAR: AlertDialog eliminar

lib/services/
└── products.ts                      # MODIFICAR: agregar funciones
```

---

## 1. MODIFICAR TABLA - Agregar Columna Acciones

### Archivo: `app/(dashboard)/productos/page.tsx`

**Agregar columna al final de la tabla:**

```typescript
<TableHead className="w-[50px]"></TableHead> // Header vacío

// En el body:
<TableCell>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button 
        variant="ghost" 
        size="icon"
        onClick={(e) => e.stopPropagation()} // Evitar navegar al editar
      >
        <MoreVertical className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={(e) => {
        e.stopPropagation()
        router.push(`/productos/${product.id}`)
      }}>
        <Pencil className="mr-2 h-4 w-4" />
        Editar
      </DropdownMenuItem>
      
      <DropdownMenuItem onClick={(e) => {
        e.stopPropagation()
        setStockManagementProduct(product)
      }}>
        <Package className="mr-2 h-4 w-4" />
        Gestionar Stock
      </DropdownMenuItem>
      
      <DropdownMenuItem onClick={(e) => {
        e.stopPropagation()
        router.push(`/productos/nuevo?duplicate=${product.id}`)
      }}>
        <Copy className="mr-2 h-4 w-4" />
        Duplicar
      </DropdownMenuItem>
      
      <DropdownMenuItem onClick={(e) => {
        e.stopPropagation()
        setPriceHistoryProduct(product)
      }}>
        <History className="mr-2 h-4 w-4" />
        Historial de Precios
      </DropdownMenuItem>
      
      <DropdownMenuItem onClick={(e) => {
        e.stopPropagation()
        setStockMovementsProduct(product)
      }}>
        <TruckIcon className="mr-2 h-4 w-4" />
        Movimientos de Stock
      </DropdownMenuItem>
      
      <DropdownMenuSeparator />
      
      <DropdownMenuItem 
        onClick={(e) => {
          e.stopPropagation()
          setArchiveProduct(product)
        }}
        className="text-destructive"
      >
        <Archive className="mr-2 h-4 w-4" />
        {product.active ? 'Archivar' : 'Activar'}
      </DropdownMenuItem>
      
      <DropdownMenuItem 
        onClick={(e) => {
          e.stopPropagation()
          setDeleteProduct(product)
        }}
        className="text-destructive"
      >
        <Trash className="mr-2 h-4 w-4" />
        Eliminar
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</TableCell>
```

**Estados necesarios:**
```typescript
const [stockManagementProduct, setStockManagementProduct] = useState<Product | null>(null)
const [priceHistoryProduct, setPriceHistoryProduct] = useState<Product | null>(null)
const [stockMovementsProduct, setStockMovementsProduct] = useState<Product | null>(null)
const [archiveProduct, setArchiveProduct] = useState<Product | null>(null)
const [deleteProduct, setDeleteProduct] = useState<Product | null>(null)
```

**Dialogs al final del componente:**
```typescript
{/* Dialogs */}
{stockManagementProduct && (
  <StockManagementDialog
    product={stockManagementProduct}
    onClose={() => setStockManagementProduct(null)}
    onSuccess={() => {
      setStockManagementProduct(null)
      refetch()
    }}
  />
)}

{priceHistoryProduct && (
  <PriceHistoryDialog
    productId={priceHistoryProduct.id}
    productName={priceHistoryProduct.name}
    onClose={() => setPriceHistoryProduct(null)}
  />
)}

{stockMovementsProduct && (
  <StockMovementsDialog
    productId={stockMovementsProduct.id}
    productName={stockMovementsProduct.name}
    onClose={() => setStockMovementsProduct(null)}
  />
)}

{archiveProduct && (
  <ArchiveProductDialog
    product={archiveProduct}
    onClose={() => setArchiveProduct(null)}
    onSuccess={() => {
      setArchiveProduct(null)
      refetch()
    }}
  />
)}

{deleteProduct && (
  <DeleteProductDialog
    product={deleteProduct}
    onClose={() => setDeleteProduct(null)}
    onSuccess={() => {
      setDeleteProduct(null)
      refetch()
    }}
  />
)}
```

---

## 2. DIALOG: Gestionar Stock

### Componente: `components/productos/stock-management-dialog.tsx`

**Props:**
```typescript
interface StockManagementDialogProps {
  product: Product
  onClose: () => void
  onSuccess: () => void
}
```

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│ 📦 Gestión de Stock - 34df                              [X]│
│ Administrá el stock de este producto en cada ubicación    │
├────────────────────────────────────────────────────────────┤
│ Stock Total:                                               │
│ 26 unidades                                                │
│                                                            │
│ Stock por Ubicación                                        │
│                                                            │
│ Deposito                                         [___0___] │
│ Principal [Principal]                            [__26___] │
│                                                            │
│                                   [Actualizar Stock]       │
└────────────────────────────────────────────────────────────┘
```

**Implementación:**
```typescript
'use client'

import { useState, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Package } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getActiveLocations } from '@/lib/services/locations'
import { updateProductStock } from '@/lib/services/products'

export function StockManagementDialog({ 
  product, 
  onClose, 
  onSuccess 
}: StockManagementDialogProps) {
  const { toast } = useToast()
  const [locations, setLocations] = useState<Location[]>([])
  const [stockByLocation, setStockByLocation] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [product.id])

  const loadData = async () => {
    try {
      // Cargar ubicaciones
      const locs = await getActiveLocations()
      setLocations(locs)
      
      // Cargar stock actual del producto
      const { data: stockData } = await supabase
        .from('stock')
        .select('location_id, quantity')
        .eq('product_id', product.id)
      
      // Mapear stock por ubicación
      const stockMap: Record<string, number> = {}
      stockData?.forEach(s => {
        stockMap[s.location_id] = s.quantity
      })
      
      // Inicializar con 0 las ubicaciones sin stock
      locs.forEach(loc => {
        if (!stockMap[loc.id]) {
          stockMap[loc.id] = 0
        }
      })
      
      setStockByLocation(stockMap)
    } catch (error) {
      console.error('Error loading stock:', error)
      toast({
        title: 'Error',
        description: 'No se pudo cargar el stock',
        variant: 'destructive'
      })
    }
  }

  const totalStock = Object.values(stockByLocation).reduce((sum, qty) => sum + qty, 0)

  const handleUpdate = async () => {
    setIsLoading(true)
    try {
      const userId = 'USER_ID' // Obtener del contexto de auth
      
      await updateProductStock(product.id, {
        stockByLocation: Object.entries(stockByLocation).map(([location_id, quantity]) => ({
          location_id,
          quantity
        })),
        userId
      })
      
      toast({
        title: 'Stock actualizado',
        description: 'El stock se actualizó correctamente'
      })
      
      onSuccess()
    } catch (error) {
      console.error('Error updating stock:', error)
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el stock',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Gestión de Stock - {product.name}
          </DialogTitle>
          <DialogDescription>
            Administrá el stock de este producto en cada ubicación
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Stock Total */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Stock Total:</p>
            <p className="text-3xl font-bold">{totalStock} unidades</p>
          </div>

          {/* Stock por Ubicación */}
          <div>
            <p className="text-sm font-medium mb-3">Stock por Ubicación</p>
            <div className="space-y-3">
              {locations.map(location => (
                <div 
                  key={location.id} 
                  className="flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="truncate">{location.name}</span>
                    {location.is_main && (
                      <Badge variant="secondary" className="shrink-0">
                        Principal
                      </Badge>
                    )}
                  </div>
                  <Input
                    type="number"
                    className="w-24"
                    value={stockByLocation[location.id] || 0}
                    onChange={(e) => setStockByLocation(prev => ({
                      ...prev,
                      [location.id]: parseInt(e.target.value) || 0
                    }))}
                    min={0}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={handleUpdate}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Actualizando...' : 'Actualizar Stock'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 3. FUNCIONALIDAD: Duplicar Producto

### En `app/(dashboard)/productos/nuevo/page.tsx`

**Detectar parámetro de duplicación:**
```typescript
'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export default function NuevoProductoPage() {
  const searchParams = useSearchParams()
  const duplicateId = searchParams.get('duplicate')
  
  useEffect(() => {
    if (duplicateId) {
      loadProductToDuplicate(duplicateId)
    }
  }, [duplicateId])
  
  const loadProductToDuplicate = async (id: string) => {
    try {
      const product = await getProductById(id)
      
      // Precargar formulario con datos del producto
      setFormData({
        name: `${product.name} (copia)`,
        sku: '', // Dejar vacío para que usuario complete
        barcode: '',
        category_id: product.category_id,
        default_supplier_id: product.default_supplier_id,
        description: product.description,
        cost: product.cost,
        margin_percentage: product.margin_percentage,
        price: product.price,
        tax_rate: product.tax_rate,
        visibility: product.visibility,
        // Stock en 0
        stockByLocation: locations.map(loc => ({
          location_id: loc.id,
          quantity: 0
        }))
      })
      
      toast({
        title: 'Producto duplicado',
        description: 'Completá el SKU para crear el nuevo producto'
      })
    } catch (error) {
      console.error('Error duplicating product:', error)
      toast({
        title: 'Error',
        description: 'No se pudo duplicar el producto',
        variant: 'destructive'
      })
    }
  }
  
  // ... resto del componente
}
```

---

## 4. ALERTDIALOG: Archivar Producto

### Componente: `components/productos/archive-product-dialog.tsx`

**Props:**
```typescript
interface ArchiveProductDialogProps {
  product: Product
  onClose: () => void
  onSuccess: () => void
}
```

**Implementación:**
```typescript
'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { archiveProduct, activateProduct } from '@/lib/services/products'

export function ArchiveProductDialog({ 
  product, 
  onClose, 
  onSuccess 
}: ArchiveProductDialogProps) {
  const { toast } = useToast()
  const isActive = product.active

  const handleConfirm = async () => {
    try {
      if (isActive) {
        await archiveProduct(product.id)
        toast({
          title: 'Producto archivado',
          description: `${product.name} fue archivado correctamente`
        })
      } else {
        await activateProduct(product.id)
        toast({
          title: 'Producto activado',
          description: `${product.name} fue activado correctamente`
        })
      }
      onSuccess()
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'Error',
        description: `No se pudo ${isActive ? 'archivar' : 'activar'} el producto`,
        variant: 'destructive'
      })
    }
  }

  return (
    <AlertDialog open onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Estás seguro que querés {isActive ? 'archivar' : 'activar'} este producto?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción {isActive ? 'archivará' : 'activará'} el producto "{product.name}". 
            {isActive && ' Podés desarchivarlo en cualquier momento.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={isActive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            {isActive ? 'Archivar producto' : 'Activar producto'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

---

## 5. ALERTDIALOG: Eliminar Producto

### Componente: `components/productos/delete-product-dialog.tsx`

**Props:**
```typescript
interface DeleteProductDialogProps {
  product: Product
  onClose: () => void
  onSuccess: () => void
}
```

**Implementación:**
```typescript
'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { deleteProduct } from '@/lib/services/products'

export function DeleteProductDialog({ 
  product, 
  onClose, 
  onSuccess 
}: DeleteProductDialogProps) {
  const { toast } = useToast()

  const handleConfirm = async () => {
    try {
      await deleteProduct(product.id)
      
      toast({
        title: 'Producto eliminado',
        description: `${product.name} fue eliminado correctamente`
      })
      
      onSuccess()
    } catch (error: any) {
      console.error('Error deleting product:', error)
      
      // Si tiene referencias, se archivó en lugar de eliminarse
      if (error.message.includes('referencias')) {
        toast({
          title: 'Producto archivado',
          description: 'El producto tiene referencias y fue archivado en su lugar',
          variant: 'default'
        })
        onSuccess()
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo eliminar el producto',
          variant: 'destructive'
        })
      }
    }
  }

  return (
    <AlertDialog open onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Estás seguro que querés eliminar este producto?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Esta acción eliminará permanentemente el producto "{product.name}".
            </p>
            <p>
              Si el producto se usó en alguna operación, será archivado.
            </p>
            <p className="text-destructive">
              Si necesitás ayuda,{' '}
              <a href="#" className="underline">contactanos</a>.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Eliminar producto
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

---

## 6. SERVICIOS - Actualizar

### Archivo: `lib/services/products.ts`

**Agregar funciones:**

```typescript
// Actualizar stock de producto
async function updateProductStock(
  productId: string,
  data: {
    stockByLocation: Array<{ location_id: string, quantity: number }>
    userId: string
  }
): Promise<void> {
  const supabase = createClient()
  
  for (const stockItem of data.stockByLocation) {
    // Obtener stock actual
    const { data: currentStock } = await supabase
      .from('stock')
      .select('quantity')
      .eq('product_id', productId)
      .eq('location_id', stockItem.location_id)
      .single()
    
    if (currentStock) {
      const diff = stockItem.quantity - currentStock.quantity
      
      if (diff !== 0) {
        // Actualizar stock
        await supabase
          .from('stock')
          .update({ quantity: stockItem.quantity })
          .eq('product_id', productId)
          .eq('location_id', stockItem.location_id)
        
        // Registrar movimiento
        await supabase
          .from('stock_movements')
          .insert({
            product_id: productId,
            [diff > 0 ? 'location_to_id' : 'location_from_id']: stockItem.location_id,
            quantity: Math.abs(diff),
            reason: 'Ajuste manual desde gestión de stock',
            reference_type: 'ADJUSTMENT',
            created_by: data.userId
          })
      }
    } else {
      // Crear registro de stock
      await supabase
        .from('stock')
        .insert({
          product_id: productId,
          location_id: stockItem.location_id,
          quantity: stockItem.quantity
        })
      
      // Registrar movimiento si cantidad > 0
      if (stockItem.quantity > 0) {
        await supabase
          .from('stock_movements')
          .insert({
            product_id: productId,
            location_to_id: stockItem.location_id,
            quantity: stockItem.quantity,
            reason: 'Stock inicial',
            reference_type: 'INITIAL',
            created_by: data.userId
          })
      }
    }
  }
  
  // Actualizar stock total en products
  const totalStock = data.stockByLocation.reduce((sum, s) => sum + s.quantity, 0)
  await supabase
    .from('products')
    .update({ stock_quantity: totalStock })
    .eq('id', productId)
}

// Eliminar producto (o archivar si tiene referencias)
async function deleteProduct(id: string): Promise<void> {
  const supabase = createClient()
  
  // TODO: Verificar si tiene referencias en ventas/compras
  // Por ahora, solo verificar si tiene movimientos de stock
  const { data: movements } = await supabase
    .from('stock_movements')
    .select('id')
    .eq('product_id', id)
    .eq('reference_type', 'SALE')
    .limit(1)
  
  if (movements && movements.length > 0) {
    // Tiene referencias, archivar en lugar de eliminar
    await supabase
      .from('products')
      .update({ active: false })
      .eq('id', id)
    
    throw new Error('El producto tiene referencias y fue archivado')
  }
  
  // No tiene referencias, eliminar permanentemente
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Las funciones archiveProduct y activateProduct ya existen
```

---

## Criterios de Éxito

✅ Columna de acciones con dropdown en tabla
✅ Dialog de gestión de stock funcional
✅ Duplicar producto precarga formulario
✅ Archivar/activar producto con confirmación
✅ Eliminar producto (archiva si tiene referencias)
✅ Integración con dialogs existentes (historial, movimientos)
✅ Toasts de feedback
✅ Stopropagation en acciones (no navega al editar)
✅ Actualización de stock registra movimientos

---

## Notas Importantes

- **NO** implementar selección múltiple
- **NO** implementar acciones masivas
- Usar `stopPropagation()` en todos los clicks del dropdown
- Verificar referencias antes de eliminar
- Registrar movimientos al actualizar stock
- Duplicar debe dejar SKU vacío
- Stock duplicado siempre en 0
- Mensajes en español
- Componentes en kebab-case

---

**¡RECUERDA!** Lee `claude.md` para convenciones del proyecto.

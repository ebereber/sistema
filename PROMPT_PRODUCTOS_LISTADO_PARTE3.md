# Tarea: Implementar Acciones Masivas de Productos - PARTE 3

## Contexto del Proyecto

Sistema POS Lemar - Next.js 16, TypeScript, Supabase, shadcn/ui (New York style)

**IMPORTANTE:** Lee primero el archivo `claude.md` en la raíz del proyecto para entender convenciones, estructura y patrones de código.

---

## Alcance de esta Tarea - PARTE 3

**PREREQUISITOS:**
✅ Parte 1 implementada (listado básico)
✅ Parte 2 implementada (acciones individuales)

**IMPLEMENTAR AHORA:**
✅ Checkboxes de selección (master + individuales)
✅ Barra de productos seleccionados
✅ Botón "Más acciones" (sin selección)
✅ Filtros adicionales (Visibilidad, Stock)
✅ Dialog: Actualizar precios masivo
✅ Dialog: Actualizar stock masivo
✅ Dialog: Asignar categoría masivo
✅ Dialog: Archivar/Desarchivar masivo
✅ Dialog: Eliminar masivo
✅ Botón "Exportar" (solo UI por ahora)

---

## Archivos a Modificar/Crear

```
app/(dashboard)/productos/
└── page.tsx                              # MODIFICAR: agregar checkboxes y barra

components/productos/
├── bulk-actions-bar.tsx                  # CREAR: Barra de seleccionados
├── bulk-price-update-dialog.tsx          # CREAR: Actualizar precios
├── bulk-stock-update-dialog.tsx          # CREAR: Actualizar stock
├── bulk-category-assign-dialog.tsx       # CREAR: Asignar categoría
├── bulk-archive-dialog.tsx               # CREAR: Archivar/Desarchivar
└── bulk-delete-dialog.tsx                # CREAR: Eliminar masivo

lib/services/
└── products.ts                           # MODIFICAR: agregar funciones masivas
```

---

## 1. MODIFICAR TABLA - Agregar Checkboxes

### Archivo: `app/(dashboard)/productos/page.tsx`

**Estado de selección:**
```typescript
const [selectedProducts, setSelectedProducts] = useState<string[]>([])
const [selectAll, setSelectAll] = useState(false)

// Alternar selección individual
const toggleProduct = (id: string) => {
  setSelectedProducts(prev => 
    prev.includes(id) 
      ? prev.filter(p => p !== id)
      : [...prev, id]
  )
}

// Alternar selección de todos los visibles
const toggleAllVisible = () => {
  if (selectedProducts.length === products.length) {
    setSelectedProducts([])
  } else {
    setSelectedProducts(products.map(p => p.id))
  }
}

// Seleccionar TODOS (incluso no visibles)
const selectAllProducts = async () => {
  // Query para obtener todos los IDs que coinciden con filtros
  const allIds = await getAllProductIds({ search, statusFilter, categoryFilter })
  setSelectedProducts(allIds)
  setSelectAll(true)
}

// Limpiar selección
const clearSelection = () => {
  setSelectedProducts([])
  setSelectAll(false)
}
```

**Agregar columna de checkbox:**
```typescript
// Header
<TableHead className="w-[40px]">
  <Checkbox
    checked={selectedProducts.length === products.length && products.length > 0}
    onCheckedChange={toggleAllVisible}
  />
</TableHead>

// Body
<TableCell onClick={(e) => e.stopPropagation()}>
  <Checkbox
    checked={selectedProducts.includes(product.id)}
    onCheckedChange={() => toggleProduct(product.id)}
  />
</TableCell>
```

---

## 2. BARRA DE SELECCIÓN

### Componente: `components/productos/bulk-actions-bar.tsx`

**Props:**
```typescript
interface BulkActionsBarProps {
  selectedCount: number
  totalCount: number
  selectAll: boolean
  onSelectAll: () => void
  onClearSelection: () => void
  onUpdatePrices: () => void
  onUpdateStock: () => void
  onAssignCategory: () => void
  onArchive: () => void
  onDelete: () => void
}
```

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│ Seleccionados: 2  [Seleccionar los 45 productos]          │
│ [$ Actualizar precios] [📦 Actualizar stock] [Más ▾]  [X] │
└────────────────────────────────────────────────────────────┘
```

**Implementación:**
```typescript
'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  DollarSign, 
  Package, 
  Tag, 
  Archive, 
  Trash, 
  ChevronDown,
  X 
} from 'lucide-react'

export function BulkActionsBar({
  selectedCount,
  totalCount,
  selectAll,
  onSelectAll,
  onClearSelection,
  onUpdatePrices,
  onUpdateStock,
  onAssignCategory,
  onArchive,
  onDelete
}: BulkActionsBarProps) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background p-4">
      <div className="flex items-center gap-4">
        <span className="font-medium">
          Seleccionados: {selectedCount}
        </span>
        
        {!selectAll && selectedCount < totalCount && (
          <Button 
            variant="link" 
            onClick={onSelectAll}
            className="text-blue-600 p-0 h-auto"
          >
            Seleccionar los {totalCount} productos
          </Button>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={onUpdatePrices}
        >
          <DollarSign className="mr-2 h-4 w-4" />
          Actualizar precios
        </Button>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={onUpdateStock}
        >
          <Package className="mr-2 h-4 w-4" />
          Actualizar stock
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Más acciones
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onAssignCategory}>
              <Tag className="mr-2 h-4 w-4" />
              Asignar categoría
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onArchive}>
              <Archive className="mr-2 h-4 w-4" />
              Archivar
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={onDelete}
              className="text-destructive"
            >
              <Trash className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onClearSelection}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
```

**Uso en page.tsx:**
```typescript
{selectedProducts.length > 0 && (
  <BulkActionsBar
    selectedCount={selectedProducts.length}
    totalCount={totalCount}
    selectAll={selectAll}
    onSelectAll={selectAllProducts}
    onClearSelection={clearSelection}
    onUpdatePrices={() => setBulkPriceDialog(true)}
    onUpdateStock={() => setBulkStockDialog(true)}
    onAssignCategory={() => setBulkCategoryDialog(true)}
    onArchive={() => setBulkArchiveDialog(true)}
    onDelete={() => setBulkDeleteDialog(true)}
  />
)}
```

---

## 3. BOTÓN "MÁS ACCIONES" (Sin Selección)

**En el header, agregar:**
```typescript
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">
      Más acciones
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => setBulkPriceDialog(true)}>
      <DollarSign className="mr-2 h-4 w-4" />
      Actualizar precios
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setBulkStockDialog(true)}>
      <Package className="mr-2 h-4 w-4" />
      Actualizar stock
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setBulkCategoryDialog(true)}>
      <Tag className="mr-2 h-4 w-4" />
      Asignar categoría
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={() => setBulkArchiveDialog(true)}>
      <Archive className="mr-2 h-4 w-4" />
      Archivar/Desarchivar
    </DropdownMenuItem>
    <DropdownMenuItem 
      onClick={() => setBulkDeleteDialog(true)}
      className="text-destructive"
    >
      <Trash className="mr-2 h-4 w-4" />
      Eliminar
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## 4. FILTROS ADICIONALES

**Agregar "Otros filtros" en la barra:**
```typescript
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" size="sm">
      <Filter className="mr-2 h-4 w-4" />
      Otros filtros
      {(visibilityFilter.length > 0 || stockFilter) && (
        <Badge variant="secondary" className="ml-2">
          {(visibilityFilter.length > 0 ? 1 : 0) + (stockFilter ? 1 : 0)}
        </Badge>
      )}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-56 p-0" align="start">
    <Command>
      <CommandList>
        <CommandGroup>
          {/* Visibilidad */}
          <CommandItem>
            <Eye className="mr-2 h-4 w-4" />
            <span>Visibilidad</span>
            <ChevronRight className="ml-auto h-4 w-4" />
          </CommandItem>
          
          {/* Stock */}
          <CommandItem>
            <Package className="mr-2 h-4 w-4" />
            <span>Stock</span>
            <ChevronRight className="ml-auto h-4 w-4" />
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>

{/* Submenu Visibilidad */}
<Popover>
  <PopoverContent className="w-64 p-4">
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Checkbox 
          id="vis-both"
          checked={visibilityFilter.includes('SALES_AND_PURCHASES')}
          onCheckedChange={() => toggleVisibility('SALES_AND_PURCHASES')}
        />
        <label htmlFor="vis-both">Ventas y compras</label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox 
          id="vis-sales"
          checked={visibilityFilter.includes('SALES_ONLY')}
          onCheckedChange={() => toggleVisibility('SALES_ONLY')}
        />
        <label htmlFor="vis-sales">Solo ventas</label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox 
          id="vis-purchases"
          checked={visibilityFilter.includes('PURCHASES_ONLY')}
          onCheckedChange={() => toggleVisibility('PURCHASES_ONLY')}
        />
        <label htmlFor="vis-purchases">Solo compras</label>
      </div>
    </div>
  </PopoverContent>
</Popover>

{/* Submenu Stock */}
<Popover>
  <PopoverContent className="w-64 p-4">
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Checkbox 
          id="stock-with"
          checked={stockFilter === 'WITH_STOCK'}
          onCheckedChange={() => setStockFilter('WITH_STOCK')}
        />
        <label htmlFor="stock-with">Con stock</label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox 
          id="stock-without"
          checked={stockFilter === 'WITHOUT_STOCK'}
          onCheckedChange={() => setStockFilter('WITHOUT_STOCK')}
        />
        <label htmlFor="stock-without">Sin stock</label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox 
          id="stock-negative"
          checked={stockFilter === 'NEGATIVE_STOCK'}
          onCheckedChange={() => setStockFilter('NEGATIVE_STOCK')}
        />
        <label htmlFor="stock-negative">Stock negativo</label>
      </div>
    </div>
  </PopoverContent>
</Popover>
```

**Query con filtros adicionales:**
```typescript
// Visibilidad
if (visibilityFilter.length > 0) {
  query = query.in('visibility', visibilityFilter)
}

// Stock
if (stockFilter === 'WITH_STOCK') {
  query = query.gt('stock_quantity', 0)
} else if (stockFilter === 'WITHOUT_STOCK') {
  query = query.eq('stock_quantity', 0)
} else if (stockFilter === 'NEGATIVE_STOCK') {
  query = query.lt('stock_quantity', 0)
}
```

---

## 5. DIALOG: Actualizar Precios Masivo

### Componente: `components/productos/bulk-price-update-dialog.tsx`

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│ Actualización masiva de precios                        [X]│
│ Actualizá los precios de todos los productos...           │
├────────────────────────────────────────────────────────────┤
│ Operación       Tipo          Valor                       │
│ [Aumentar ▼]    [% ▼]         [10]                        │
│                                                            │
│                             [Cancelar] [Actualizar]        │
└────────────────────────────────────────────────────────────┘
```

**Implementación:**
```typescript
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useToast } from '@/hooks/use-toast'
import { bulkUpdatePrices } from '@/lib/services/products'

interface BulkPriceUpdateDialogProps {
  productIds: string[]
  useFilters: boolean
  filters?: any
  onClose: () => void
  onSuccess: () => void
}

export function BulkPriceUpdateDialog({
  productIds,
  useFilters,
  filters,
  onClose,
  onSuccess
}: BulkPriceUpdateDialogProps) {
  const { toast } = useToast()
  const [operation, setOperation] = useState<'increase' | 'decrease'>('increase')
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage')
  const [value, setValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleUpdate = async () => {
    if (!value || parseFloat(value) <= 0) {
      toast({
        title: 'Error',
        description: 'Ingresá un valor mayor a 0',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    try {
      await bulkUpdatePrices({
        productIds: useFilters ? undefined : productIds,
        filters: useFilters ? filters : undefined,
        operation,
        type,
        value: parseFloat(value)
      })

      toast({
        title: 'Precios actualizados',
        description: `${productIds.length} productos actualizados correctamente`
      })

      onSuccess()
    } catch (error) {
      console.error('Error updating prices:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron actualizar los precios',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Actualización masiva de precios</DialogTitle>
          <DialogDescription>
            Actualizá los precios de {useFilters ? 'todos los productos que coinciden con los filtros' : `${productIds.length} productos seleccionados`}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Operación</Label>
            <Select value={operation} onValueChange={(v: any) => setOperation(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="increase">Aumentar</SelectItem>
                <SelectItem value="decrease">Disminuir</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">%</SelectItem>
                <SelectItem value="fixed">$</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Valor</Label>
            <Input
              type="number"
              placeholder="Ej. 10"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              min={0}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleUpdate} disabled={isLoading}>
            {isLoading ? 'Actualizando...' : 'Actualizar precios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 6. DIALOG: Actualizar Stock Masivo

### Componente: `components/productos/bulk-stock-update-dialog.tsx`

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│ Actualización masiva de stock                          [X]│
│ Actualizá el stock de todos los productos...              │
├────────────────────────────────────────────────────────────┤
│ Depósito                                                   │
│ [Seleccioná un depósito ▼]                                │
│                                                            │
│ Operación                                                  │
│ ● Reemplazar                                              │
│ ○ Aumentar                                                │
│                                                            │
│ Cantidad                                                   │
│ [10]                                                       │
│                                                            │
│ Motivo (opcional)                                         │
│ [Ej. Ajuste de inventario]                                │
│                                                            │
│                             [Cancelar] [Actualizar]        │
└────────────────────────────────────────────────────────────┘
```

**Implementación similar a price update, con:**
- Select de ubicación
- RadioGroup para operación
- Input de cantidad
- Textarea de motivo

---

## 7. DIALOG: Asignar Categoría Masivo

### Componente: `components/productos/bulk-category-assign-dialog.tsx`

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│ Asignar categoría                                       [X]│
│ Asigná una categoría a todos los productos...             │
├────────────────────────────────────────────────────────────┤
│ Categoría                                                  │
│ [Seleccioná una categoría... ▼]                           │
│                                                            │
│                             [Cancelar] [Asignar]           │
└────────────────────────────────────────────────────────────┘
```

**Implementación:**
- Combobox jerárquico de categorías (reutilizar de filtros)
- Botón de asignar

---

## 8. DIALOG: Archivar/Desarchivar Masivo

### Componente: `components/productos/bulk-archive-dialog.tsx`

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│ Archivar/Desarchivar productos                          [X]│
│ Archivá todos los productos que coinciden...              │
├────────────────────────────────────────────────────────────┤
│ Operación                                                  │
│ ● Archivar                                                │
│ ○ Desarchivar                                             │
│                                                            │
│ ⚠️ ¡Esto va a afectar a todos los productos!              │
│ No hay filtros aplicados. Te recomendamos primero...      │
│                                                            │
│ Vista previa:                                             │
│ Se archivarán 5 productos                                 │
│                                                            │
│                             [Cancelar] [Archivar]          │
└────────────────────────────────────────────────────────────┘
```

**Implementación:**
- RadioGroup para operación
- Alert si no hay filtros
- Vista previa del conteo
- Botón dinámico según operación

---

## 9. DIALOG: Eliminar Masivo

### Componente: `components/productos/bulk-delete-dialog.tsx`

**Layout más complejo con warnings:**
```
┌────────────────────────────────────────────────────────────┐
│ Eliminar productos                                      [X]│
│ Eliminá todos los productos que coinciden...              │
├────────────────────────────────────────────────────────────┤
│ ⚠️ ¡Esto va a afectar a todos los productos!              │
│ No hay filtros aplicados...                               │
│                                                            │
│ Vista previa:                                             │
│ 5 productos en total:                                     │
│ • 3 serán eliminados permanentemente                      │
│ • 2 serán archivados (tienen referencias)                │
│   Si igualmente querés eliminarlos, contactanos...        │
│                                                            │
│ ⚠️ Algunos productos serán archivados                     │
│ Los productos con referencias no pueden ser eliminados... │
│                                                            │
│ ⚠️ ¡Acción irreversible!                                  │
│ Los productos eliminados no podrán ser recuperados...     │
│                                                            │
│                             [Cancelar] [Eliminar]          │
└────────────────────────────────────────────────────────────┘
```

**Implementación:**
- 3 Alerts de warning
- Vista previa con conteo de eliminados vs archivados
- Verificar referencias antes de mostrar
- Botón destructive

---

## 10. SERVICIOS - Funciones Masivas

### Archivo: `lib/services/products.ts`

```typescript
// Actualizar precios masivamente
async function bulkUpdatePrices(params: {
  productIds?: string[]
  filters?: any
  operation: 'increase' | 'decrease'
  type: 'percentage' | 'fixed'
  value: number
}): Promise<void> {
  const supabase = createClient()
  
  // Obtener productos a actualizar
  let query = supabase.from('products').select('id, price, cost, margin_percentage')
  
  if (params.productIds) {
    query = query.in('id', params.productIds)
  } else if (params.filters) {
    // Aplicar filtros
    // ... (similar a getProducts)
  }
  
  const { data: products } = await query
  
  // Calcular nuevos precios
  const updates = products?.map(p => {
    let newPrice = p.price
    
    if (params.type === 'percentage') {
      const multiplier = params.operation === 'increase' 
        ? (1 + params.value / 100)
        : (1 - params.value / 100)
      newPrice = p.price * multiplier
    } else {
      newPrice = params.operation === 'increase'
        ? p.price + params.value
        : p.price - params.value
    }
    
    return {
      id: p.id,
      price: Math.max(0, newPrice)
    }
  })
  
  // Actualizar en batch
  for (const update of updates || []) {
    await supabase
      .from('products')
      .update({ price: update.price })
      .eq('id', update.id)
    
    // Registrar en historial
    await supabase
      .from('price_history')
      .insert({
        product_id: update.id,
        price: update.price,
        reason: `Actualización masiva: ${params.operation} ${params.value}${params.type === 'percentage' ? '%' : '$'}`,
        created_by: 'USER_ID'
      })
  }
}

// Actualizar stock masivamente
async function bulkUpdateStock(params: {
  productIds?: string[]
  filters?: any
  locationId: string
  operation: 'replace' | 'increase'
  quantity: number
  reason?: string
}): Promise<void> {
  // Similar a bulkUpdatePrices
  // Actualizar tabla stock y registrar movimientos
}

// Asignar categoría masivamente
async function bulkAssignCategory(params: {
  productIds?: string[]
  filters?: any
  categoryId: string
}): Promise<void> {
  const supabase = createClient()
  
  let query = supabase.from('products')
  
  if (params.productIds) {
    query = query.update({ category_id: params.categoryId }).in('id', params.productIds)
  } else {
    // Aplicar filtros y actualizar
  }
  
  await query
}

// Archivar masivamente
async function bulkArchive(params: {
  productIds?: string[]
  filters?: any
  archive: boolean
}): Promise<void> {
  // Similar, actualizar active field
}

// Eliminar masivamente
async function bulkDelete(params: {
  productIds?: string[]
  filters?: any
}): Promise<{ deleted: number, archived: number }> {
  // Verificar referencias
  // Eliminar los que no tienen
  // Archivar los que tienen
  // Retornar conteo
}

// Obtener todos los IDs con filtros (para "Seleccionar todos")
async function getAllProductIds(filters: any): Promise<string[]> {
  const supabase = createClient()
  
  let query = supabase.from('products').select('id')
  
  // Aplicar filtros
  // ...
  
  const { data } = await query
  return data?.map(p => p.id) || []
}
```

---

## 11. BOTÓN EXPORTAR

**En el header:**
```typescript
<Button variant="outline">
  <Download className="mr-2 h-4 w-4" />
  Exportar
</Button>
```

**Por ahora solo UI, funcionalidad para después**

---

## Criterios de Éxito

✅ Checkboxes de selección (master + individuales)
✅ Barra de productos seleccionados
✅ Botón "Seleccionar todos" (incluso no visibles)
✅ Botón "Más acciones" sin selección
✅ Filtros adicionales (Visibilidad, Stock)
✅ Dialog actualizar precios masivo
✅ Dialog actualizar stock masivo
✅ Dialog asignar categoría masivo
✅ Dialog archivar/desarchivar masivo
✅ Dialog eliminar masivo con warnings
✅ Funciones en servicios para operaciones masivas
✅ Registros en historial y movimientos
✅ Toasts de feedback
✅ Validaciones y warnings

---

## Notas Importantes

- Operaciones masivas pueden ser con selección O con filtros
- Si no hay selección, usar filtros activos
- Mostrar warnings si no hay filtros (afecta a TODOS)
- Verificar referencias antes de eliminar
- Botón "Exportar" solo UI por ahora
- Actualizar stock registra movimientos
- Actualizar precio registra en historial
- Mensajes en español
- Componentes en kebab-case

---

**¡RECUERDA!** Lee `claude.md` para convenciones del proyecto.

# Tarea: Implementar Listado de Productos - PARTE 1 (Básico)

## Contexto del Proyecto

Sistema POS Lemar - Next.js 16, TypeScript, Supabase, shadcn/ui (New York style)

**IMPORTANTE:** Lee primero el archivo `claude.md` en la raíz del proyecto para entender convenciones, estructura y patrones de código.

---

## Alcance de esta Tarea - PARTE 1

**IMPLEMENTAR:**
✅ Página de listado básico
✅ Header con botones
✅ Búsqueda por nombre/SKU
✅ Filtro de Estado (Activo/Archivado)
✅ Filtro de Categoría (jerárquico)
✅ Tabla de productos
✅ Paginación
✅ Click en fila → navegar a editar
✅ Estados: Loading, Empty, Error

**NO IMPLEMENTAR (para después):**
❌ Otros filtros (Visibilidad, Stock)
❌ Selección múltiple (checkboxes)
❌ Acciones masivas
❌ Dropdown de acciones individuales (3 puntos)
❌ Botones "Exportar", "Más acciones"

---

## Archivo a Crear

```
app/(dashboard)/productos/
└── page.tsx                    # Listado de productos (CREAR)
```

---

## Página: Listado de Productos

### Archivo: `app/(dashboard)/productos/page.tsx`

**Layout visual:**
```
┌────────────────────────────────────────────────────────────┐
│ Productos                                  [Crear... (N)]  │
├────────────────────────────────────────────────────────────┤
│ [🔍 Buscar...] [+ Estado] [+ Categoría]  [Limpiar filtros]│
├────────────────────────────────────────────────────────────┤
│ Producto         Stock   Costo s/IVA   Precio   Estado    │
│ ──────────────────────────────────────────────────────────│
│ 📷 34df           26      34,00        77,66    [Activo]  │
│    SKU 4545                                                │
│                                                            │
│ 📷 Caja Oct...    22      56,00        86,09    [Activo]  │
│    SKU SKU-459                                             │
│                                                            │
│                    Mostrando 2 de 5     Página 1 de 1      │
│                                         [← 1 →]            │
└────────────────────────────────────────────────────────────┘
```

---

### **Header**

**Componentes:**
- Título: "Productos" (H1, izquierda)
- Botón: "Crear..." (primary, derecha)
  - Ícono: Plus
  - Badge: "N"
  - Al click: Navegar a `/productos/nuevo`

---

### **Barra de Búsqueda y Filtros**

**Componentes (de izquierda a derecha):**

#### **1. Input de Búsqueda**
- Componente: `Input` de shadcn/ui
- Placeholder: "Buscar por nombre o SKU..."
- Ícono: Search al inicio
- Funcionalidad:
  - Debounce de 300ms
  - Buscar en campos `name` y `sku`
  - Query: `name.ilike.%${search}%,sku.ilike.%${search}%`

```typescript
const [search, setSearch] = useState('')
const debouncedSearch = useDebounce(search, 300)

// En el useEffect que hace la query
useEffect(() => {
  fetchProducts({ search: debouncedSearch, ... })
}, [debouncedSearch])
```

---

#### **2. Filtro: Estado**

**Componente:** Popover + Command de shadcn/ui

**Botón trigger:**
- Sin filtro: "+ Estado"
- Con filtro: "Estado" + Badge con valor seleccionado

**Contenido del Popover:**
```typescript
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" size="sm">
      {statusFilter.length === 0 ? (
        <>
          <Plus className="mr-2 h-4 w-4" />
          Estado
        </>
      ) : (
        <>
          Estado
          <Badge variant="secondary" className="ml-2">
            {statusFilter.includes('active') ? 'Activo' : 'Archivado'}
          </Badge>
        </>
      )}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-48 p-0" align="start">
    <Command>
      <CommandInput placeholder="Filtrar por estado" />
      <CommandList>
        <CommandGroup>
          <CommandItem onSelect={() => toggleStatus('active')}>
            <Checkbox 
              checked={statusFilter.includes('active')}
              className="mr-2"
            />
            Activo
          </CommandItem>
          <CommandItem onSelect={() => toggleStatus('archived')}>
            <Checkbox 
              checked={statusFilter.includes('archived')}
              className="mr-2"
            />
            Archivado
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

**Lógica:**
- Estado local: `statusFilter: string[]` (puede ser `['active']`, `['archived']`, o `[]`)
- Default: `['active']` (mostrar solo activos)
- Si selecciona ambos: mostrar todos
- Query Supabase:
  ```typescript
  if (statusFilter.length === 1) {
    query = query.eq('active', statusFilter.includes('active'))
  }
  // Si length === 0 o 2, no filtrar (mostrar todos)
  ```

---

#### **3. Filtro: Categoría**

**Componente:** Popover + Command de shadcn/ui (jerárquico)

**Botón trigger:**
- Sin filtro: "+ Categoría"
- Con filtro: "Categoría" + Badge con nombre de categoría

**Contenido del Popover:**

Mostrar categorías con jerarquía:
```
☐ Electricidad (padre)
  ☐ Cajas de embutir (hijo, indentado)
  ☐ Térmicas (hijo, indentado)
☐ General (padre sin hijos)
```

**Implementación:**
```typescript
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" size="sm">
      {!categoryFilter ? (
        <>
          <Plus className="mr-2 h-4 w-4" />
          Categoría
        </>
      ) : (
        <>
          Categoría
          <Badge variant="secondary" className="ml-2">
            {categories.find(c => c.id === categoryFilter)?.name}
          </Badge>
        </>
      )}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-64 p-0" align="start">
    <Command>
      <CommandInput placeholder="Filtrar por categoría" />
      <CommandList>
        <CommandGroup>
          {categories.map(category => (
            <div key={category.id}>
              {/* Categoría padre */}
              <CommandItem onSelect={() => setCategoryFilter(category.id)}>
                <Checkbox 
                  checked={categoryFilter === category.id}
                  className="mr-2"
                />
                <span className="font-medium">{category.name}</span>
              </CommandItem>
              
              {/* Subcategorías (indentadas) */}
              {category.children?.map(child => (
                <CommandItem 
                  key={child.id} 
                  onSelect={() => setCategoryFilter(child.id)}
                  className="pl-8"
                >
                  <Checkbox 
                    checked={categoryFilter === child.id}
                    className="mr-2"
                  />
                  {child.name}
                </CommandItem>
              ))}
            </div>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

**Query categorías con hijos:**
```typescript
const { data: categories } = await supabase
  .from('categories')
  .select(`
    id,
    name,
    parent_id,
    children:categories!parent_id(id, name)
  `)
  .is('parent_id', null)
  .eq('active', true)
  .order('name')
```

**Query productos filtrados por categoría:**
```typescript
if (categoryFilter) {
  query = query.eq('category_id', categoryFilter)
}
```

---

#### **4. Botón Limpiar Filtros**

**Solo visible cuando hay filtros activos:**
```typescript
{(search || statusFilter.length > 0 || categoryFilter) && (
  <Button 
    variant="ghost" 
    size="sm"
    onClick={clearFilters}
  >
    <X className="mr-2 h-4 w-4" />
    Limpiar filtros
  </Button>
)}
```

**Función clearFilters:**
```typescript
const clearFilters = () => {
  setSearch('')
  setStatusFilter(['active'])
  setCategoryFilter(null)
}
```

---

### **Tabla de Productos**

**Componente:** `Table` de shadcn/ui

**Columnas:**

1. **Producto** (40%):
   - Imagen placeholder (ícono Package si no hay imagen)
   - Nombre (bold, truncate)
   - SKU debajo (text-sm, text-muted-foreground)

2. **Stock** (15%, centrado):
   - Número en azul (text-blue-600)

3. **Costo s/IVA** (15%, centrado):
   - Formato: "34,00"

4. **Precio** (15%, centrado):
   - Número en azul (text-blue-600)
   - Formato: "77,66"

5. **Estado** (15%, centrado):
   - Badge "Activo" (verde) / "Archivado" (gris)

**Implementación:**
```typescript
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Producto</TableHead>
      <TableHead className="text-center">Stock</TableHead>
      <TableHead className="text-center">Costo s/IVA</TableHead>
      <TableHead className="text-center">Precio</TableHead>
      <TableHead className="text-center">Estado</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {products.map((product) => (
      <TableRow 
        key={product.id}
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => router.push(`/productos/${product.id}`)}
      >
        <TableCell>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded border bg-muted flex items-center justify-center">
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="h-full w-full object-cover rounded"
                />
              ) : (
                <Package className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium truncate max-w-xs">
                {product.name}
              </p>
              <p className="text-sm text-muted-foreground">
                SKU {product.sku}
              </p>
            </div>
          </div>
        </TableCell>
        
        <TableCell className="text-center">
          <span className="text-blue-600 font-medium">
            {product.stock_quantity || 0}
          </span>
        </TableCell>
        
        <TableCell className="text-center">
          {product.cost ? formatCurrency(product.cost) : '-'}
        </TableCell>
        
        <TableCell className="text-center">
          <span className="text-blue-600 font-medium">
            {formatCurrency(product.price)}
          </span>
        </TableCell>
        
        <TableCell className="text-center">
          <Badge variant={product.active ? "default" : "secondary"}>
            {product.active ? 'Activo' : 'Archivado'}
          </Badge>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

### **Paginación**

**Componente:** `Pagination` de shadcn/ui

**Layout:**
```
Mostrando 1-10 de 45 resultados        Página 1 de 5  [<< < 1 2 3 > >>]
```

**Implementación:**
```typescript
<div className="flex items-center justify-between py-4">
  <div className="text-sm text-muted-foreground">
    Mostrando {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, totalCount)} de {totalCount} resultados
  </div>
  
  <div className="flex items-center gap-4">
    <div className="text-sm text-muted-foreground">
      Página {page} de {totalPages}
    </div>
    
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          />
        </PaginationItem>
        
        {[...Array(totalPages)].map((_, i) => (
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => setPage(i + 1)}
              isActive={page === i + 1}
            >
              {i + 1}
            </PaginationLink>
          </PaginationItem>
        ))}
        
        <PaginationItem>
          <PaginationNext 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  </div>
</div>
```

**Lógica de paginación:**
```typescript
const pageSize = 20
const [page, setPage] = useState(1)

// Query con paginación
const from = (page - 1) * pageSize
const to = from + pageSize - 1

const { data, count } = await supabase
  .from('products')
  .select('*', { count: 'exact' })
  .range(from, to)
  .order('created_at', { ascending: false })

const totalPages = Math.ceil(count / pageSize)
```

---

### **Estados**

#### **Loading State:**
```typescript
{isLoading && (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-3 w-[100px]" />
        </div>
      </div>
    ))}
  </div>
)}
```

#### **Empty State:**
```typescript
{!isLoading && products.length === 0 && (
  <div className="flex flex-col items-center justify-center py-12">
    <Package className="h-12 w-12 text-muted-foreground mb-4" />
    <h3 className="font-semibold text-lg mb-2">
      No hay productos
    </h3>
    <p className="text-muted-foreground text-sm mb-4">
      {search || statusFilter.length > 0 || categoryFilter
        ? 'No se encontraron productos con los filtros aplicados'
        : 'Creá tu primer producto para empezar'
      }
    </p>
    <Button onClick={() => router.push('/productos/nuevo')}>
      <Plus className="mr-2 h-4 w-4" />
      Crear producto
    </Button>
  </div>
)}
```

#### **Error State:**
```typescript
{error && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Error al cargar productos</AlertTitle>
    <AlertDescription>
      {error.message}
      <Button 
        variant="outline" 
        size="sm" 
        onClick={refetch}
        className="mt-2"
      >
        Reintentar
      </Button>
    </AlertDescription>
  </Alert>
)}
```

---

## Servicio

### Actualizar `lib/services/products.ts`

Agregar función para obtener productos con filtros:

```typescript
// Obtener productos con filtros y paginación
async function getProducts(params: {
  search?: string
  active?: boolean
  categoryId?: string
  page?: number
  pageSize?: number
}): Promise<{ data: Product[], count: number }> {
  const supabase = createClient()
  
  const { 
    search, 
    active, 
    categoryId, 
    page = 1, 
    pageSize = 20 
  } = params
  
  let query = supabase
    .from('products')
    .select(`
      *,
      category:categories(id, name)
    `, { count: 'exact' })
  
  // Filtro de búsqueda
  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
  }
  
  // Filtro de estado
  if (active !== undefined) {
    query = query.eq('active', active)
  }
  
  // Filtro de categoría
  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }
  
  // Paginación
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  
  const { data, error, count } = await query
    .range(from, to)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  
  return { 
    data: data || [], 
    count: count || 0 
  }
}
```

---

## Utilidades

### Helper de formato de moneda:

```typescript
// lib/utils.ts o crear lib/format.ts
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
```

### Hook de debounce:

```typescript
// hooks/use-debounce.ts
import { useEffect, useState } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
```

---

## Criterios de Éxito

✅ Listado de productos con paginación
✅ Búsqueda en tiempo real (nombre/SKU)
✅ Filtro de estado (Activo/Archivado)
✅ Filtro de categoría (jerárquico)
✅ Badges visuales en filtros activos
✅ Botón "Limpiar filtros"
✅ Click en fila navega a editar
✅ Estados: Loading, Empty, Error
✅ Formato de moneda correcto
✅ Paginación funcional
✅ Responsive

---

## Notas Importantes

- **NO** implementar selección múltiple (checkboxes)
- **NO** implementar dropdown de acciones (3 puntos)
- **NO** implementar botones "Exportar", "Más acciones"
- **NO** implementar filtros adicionales (Visibilidad, Stock)
- Default: mostrar solo productos activos
- Ordenar por fecha de creación (más recientes primero)
- Componentes en kebab-case
- Mensajes en español
- Mantener estilo New York de shadcn

---

**¡RECUERDA!** Lee `claude.md` para convenciones del proyecto.

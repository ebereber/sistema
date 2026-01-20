# Tarea: Implementar Crear y Detalle de Productos

## Contexto del Proyecto

Sistema POS Lemar - Next.js 16, TypeScript, Supabase, shadcn/ui (New York style)

**IMPORTANTE:** Lee primero el archivo `claude.md` en la raíz del proyecto para entender convenciones, estructura y patrones de código.

---

## Base de Datos

### Tablas (YA EXISTEN Y ACTUALIZADAS)

**1. products:**
```sql
CREATE TABLE public.products (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  description text,
  product_type text DEFAULT 'PRODUCT',
  sku text UNIQUE NOT NULL,
  barcode text UNIQUE,
  oem_code text,
  category_id uuid REFERENCES categories(id),
  default_supplier_id uuid REFERENCES suppliers(id),
  price numeric(10, 2) NOT NULL,
  cost numeric(10, 2),
  margin_percentage numeric(5, 2),
  tax_rate numeric(5, 2) DEFAULT 21,
  currency text DEFAULT 'ARS',
  track_stock boolean DEFAULT false,
  min_stock integer,
  visibility text DEFAULT 'SALES_AND_PURCHASES',
  image_url text,
  stock_quantity integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamp,
  updated_at timestamp
);
```

**2. stock:**
```sql
CREATE TABLE public.stock (
  id uuid PRIMARY KEY,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  quantity integer DEFAULT 0,
  updated_at timestamp,
  UNIQUE(product_id, location_id)
);
```

**3. price_history:**
```sql
CREATE TABLE public.price_history (
  id uuid PRIMARY KEY,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  cost numeric(10, 2),
  price numeric(10, 2) NOT NULL,
  margin_percentage numeric(5, 2),
  tax_rate numeric(5, 2),
  reason text,
  created_by uuid REFERENCES users(id),
  created_at timestamp
);
```

**4. stock_movements:**
```sql
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  location_from_id uuid REFERENCES locations(id),
  location_to_id uuid REFERENCES locations(id),
  quantity integer NOT NULL,
  reason text,
  reference_type text,
  reference_id uuid,
  created_by uuid REFERENCES users(id),
  created_at timestamp
);
```

---

## Estructura de Archivos a Crear

```
app/(dashboard)/productos/
├── nuevo/
│   └── page.tsx                    # Crear producto (CREAR)
└── [id]/
    └── page.tsx                    # Editar/Detalle producto (CREAR)

components/productos/
├── product-form.tsx                # Formulario principal (CREAR)
├── price-history-dialog.tsx       # Dialog historial precios (CREAR)
├── stock-movements-dialog.tsx     # Dialog movimientos stock (CREAR)
└── image-upload.tsx                # Componente upload imagen (CREAR)

lib/services/
└── products.ts                     # CRUD productos (CREAR)

lib/validations/
└── product.ts                      # Schemas Zod (CREAR)
```

---

## PÁGINA 1: CREAR PRODUCTO

### Archivo: `app/(dashboard)/productos/nuevo/page.tsx`

**Layout visual:**
```
Productos › Nuevo Producto

┌────────────────────────────────────────────────────────────┐
│ Nuevo Producto              [Guardar y crear otro (⌘Enter)] │
│                                         [Crear Producto]    │
└────────────────────────────────────────────────────────────┘

┌─────────────────────────────┬──────────────────────────────┐
│ COLUMNA IZQUIERDA (70%)     │ COLUMNA DERECHA (30%)        │
│                             │                              │
│ ┌─────────────────────────┐ │ ┌─────────────────────────┐ │
│ │ Información Básica      │ │ │ Visibilidad             │ │
│ │ • Nombre *              │ │ │ [Ventas y Compras ▼]    │ │
│ │ • SKU * | Código barras │ │ └─────────────────────────┘ │
│ │ • Categoría             │ │                              │
│ │ • Descripción           │ │ ┌─────────────────────────┐ │
│ │ • Proveedor             │ │ │ Imagen                  │ │
│ └─────────────────────────┘ │ │ [+ Hacé click o...]     │ │
│                             │ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │                              │
│ │ Precios                 │ │                              │
│ │ Costo | Margen          │ │                              │
│ │ Precio | IVA            │ │                              │
│ │ $X sin IVA              │ │                              │
│ │ Ganancia: $X (X%)       │ │                              │
│ └─────────────────────────┘ │                              │
│                             │                              │
│ ┌─────────────────────────┐ │                              │
│ │ Inventario              │ │                              │
│ │ ┌─────────┬──────────┐  │ │                              │
│ │ │Ubicación│Disponible│  │ │                              │
│ │ │Principal│   [26]   │  │ │                              │
│ │ │Deposito │    [0]   │  │ │                              │
│ │ │Total    │    26    │  │ │                              │
│ │ └─────────┴──────────┘  │ │                              │
│ └─────────────────────────┘ │                              │
└─────────────────────────────┴──────────────────────────────┘
```

**Funcionalidades:**

### **Breadcrumb:**
- "Productos" (link a `/productos`)
- "›"
- "Nuevo Producto"

### **Header:**
- Título: "Nuevo Producto" (H1)
- Botones derecha:
  - "Guardar y crear otro" (outline) + Badge "⌘ Enter"
  - "Crear Producto" (primary)

### **Columna Izquierda - Cards:**

---

#### **Card 1: Información Básica**

**Campos:**

1. **Nombre** (Input, REQUERIDO):
   - Label: "Nombre *"
   - Placeholder: "Ej: Tornillo M8"
   - Validación: min 1 caracter

2. **SKU y Código de Barras** (Grid 2 columnas):
   - **SKU** (Input, REQUERIDO):
     - Label: "SKU *"
     - Placeholder: "SKU-001"
     - Validación: único en BD
   - **Código de Barras** (Input, OPCIONAL):
     - Label: "Código de Barras"
     - Placeholder: "7890123456789"
     - Validación: único si se proporciona

3. **Categoría** (Combobox jerárquico, OPCIONAL):
   - Label: "Categoría"
   - Placeholder: "Seleccionar categoría"
   
   **Comportamiento jerárquico:**
   ```
   Lista inicial:
   → Electricidad (con →)
   → General
   
   Al click en "Electricidad":
   ← Volver
   Electricidad
   Subcategorías:
   → Cajas de Embutir
   
   Al seleccionar:
   Muestra: "Cajas de Embutir en Electricidad"
   ```

4. **Descripción** (Textarea, OPCIONAL):
   - Label: "Descripción"
   - Placeholder: "Descripción del producto (opcional)"
   - Rows: 3-4

5. **Proveedor Principal** (Combobox, OPCIONAL):
   - Label: "Proveedor principal"
   - Placeholder: "Seleccioná un Proveedor"
   - Primera opción: "+ Crear nuevo proveedor"
     - Al seleccionar: abre dialog de crear proveedor
   - Búsqueda: por nombre o DNI/CUIT

---

#### **Card 2: Precios**

**Header:**
- Título: "Precios"
- NO mostrar link "Historial" en modo crear

**Campos:**

**Fila 1:**
- **Costo sin IVA** (Input number):
  - Label: "Costo sin IVA"
  - Placeholder: "0"
  - Min: 0
- **Margen (%)** (Input number):
  - Label: "Margen (%)"
  - Placeholder: "0"
  - Puede ser negativo

**Fila 2:**
- **Precio con IVA** (Input number, DISABLED):
  - Label: "Precio con IVA"
  - Calculado automáticamente
  - Solo lectura
- **IVA** (Select):
  - Label: "IVA"
  - Opciones: 0%, 10.5%, 21% (default), 27%

**Información calculada (debajo):**
```
$64,18 sin IVA
Ganancia: $30,18 (47,03%)
```

**Fórmulas:**
```typescript
const precioSinIVA = cost * (1 + margin / 100)
const precioConIVA = precioSinIVA * (1 + taxRate / 100)
const ganancia = precioSinIVA - cost
const porcentajeGanancia = (ganancia / cost) * 100
```

**Ejemplo:**
```
Costo sin IVA: 34
Margen: 56%
IVA: 21%

→ Precio sin IVA: 34 * 1.56 = 53.04
→ Precio con IVA: 53.04 * 1.21 = 64.18
→ Ganancia: 53.04 - 34 = 19.04 (56%)
```

---

#### **Card 3: Inventario**

**Header:**
- Título: "Inventario"
- NO mostrar link "Movimientos" en modo crear

**Tabla de stock por ubicación:**

```
┌──────────────────┬────────────┐
│ Ubicación        │ Disponible │
├──────────────────┼────────────┤
│ Principal [Badge]│   [26]     │
│ Deposito         │    [0]     │
├──────────────────┼────────────┤
│ Total            │     26     │
└──────────────────┴────────────┘
```

**Columnas:**
- Ubicación: Nombre + Badge "Principal" si `is_main = true`
- Disponible: Input number editable

**Filas:**
- Una fila por cada ubicación activa (query a `locations`)
- Inputs editables
- Fila "Total": suma automática (solo lectura)

**Botón "Ver X ubicación más":**
- Si hay más de 2 ubicaciones, mostrar solo las primeras 2
- Botón para expandir/colapsar

**Validación:**
- No permitir stock negativo (mostrar warning)

---

### **Columna Derecha - Cards:**

---

#### **Card: Visibilidad**

**Select:**
- Label: "Visibilidad"
- Opciones:
  - "Ventas y Compras" (default)
  - "Solo Ventas"
  - "Solo Compras"

**Descripción:** "Define en qué contextos aparece el producto"

---

#### **Card: Imagen**

**Estado vacío:**
```
┌─────────────────────────┐
│          +              │
│ Hacé click en + o       │
│ arrastrá tu imagen      │
└─────────────────────────┘
```

**Estado con imagen:**
```
┌─────────────────────────┐
│  [Imagen preview]   [X] │
│  Hover: "Cambiar"       │
└─────────────────────────┘
```

**Funcionalidad:**
- Click: file picker
- Drag & drop
- Formatos: JPG, PNG, WEBP
- Max: 5MB
- Upload a storage de Supabase
- Guardar URL en `image_url`

---

### **Comportamiento al guardar:**

**"Crear Producto":**
1. Validar campos requeridos
2. Crear registro en `products`
3. Crear registros en `stock` (uno por ubicación)
4. Crear registro en `price_history` (motivo: "Creación inicial")
5. Crear registros en `stock_movements` (motivo: "Stock inicial")
6. Navegar a `/productos/[id]`

**"Guardar y crear otro":**
1. Igual que arriba
2. Limpiar formulario
3. Quedarse en `/productos/nuevo`
4. Mostrar toast: "Producto creado"

---

## PÁGINA 2: EDITAR/DETALLE PRODUCTO

### Archivo: `app/(dashboard)/productos/[id]/page.tsx`

**Diferencias con crear:**

### **Header:**
```
┌────────────────────────────────────────────────────────────┐
│ 34df [Badge: Producto]                        [Guardar]    │
│ SKU 4545 📋 • Código de barras: fsdfsdf                    │
└────────────────────────────────────────────────────────────┘
```

- Título: Nombre del producto (ej: "34df")
- Badge: "Producto" (o "Servicio" si es servicio)
- Subtítulo: `SKU {sku}` + ícono copiar + `• Código de barras: {barcode}`
- Botón: Solo "Guardar"

### **Card Precios - Header:**
- Link "Historial de Precios" a la derecha
- Al click: abre `price-history-dialog.tsx`

### **Card Inventario - Header:**
- Link "Movimientos de Stock" a la derecha
- Al click: abre `stock-movements-dialog.tsx`

### **Columna Derecha - Card adicional:**

#### **Card: Activo / Archivar**

**Si activo:**
```
┌─────────────────────────┐
│ [Badge verde: Activo]   │
│ [Archivar] (outline red)│
└─────────────────────────┘
```

**Si archivado:**
```
┌─────────────────────────┐
│ [Badge gris: Archivado] │
│ [Activar] (outline)     │
└─────────────────────────┘
```

### **Comportamiento al guardar:**

1. Validar cambios
2. Actualizar `products`
3. Si cambió precio:
   - Crear registro en `price_history` (motivo: "Actualización manual")
4. Si cambió stock:
   - Actualizar `stock` por ubicación
   - Crear registro en `stock_movements` (motivo: "Ajuste manual")
5. Mostrar toast: "Producto actualizado"
6. Quedarse en la misma página

---

## DIALOG: HISTORIAL DE PRECIOS

### Componente: `components/productos/price-history-dialog.tsx`

**Props:**
```typescript
interface PriceHistoryDialogProps {
  productId: string
  productName: string
}
```

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│ Historial de Precios - 34df                             [X]│
├────────────────────────────────────────────────────────────┤
│ Fecha   Costo   Precio  Margen  Motivo           Usuario  │
│ ──────────────────────────────────────────────────────────│
│ 12 ene  34,00   77,66   56,0%   Actualización... losdia...│
│ 11 ene  34,00   64,18   56,0%   Compra 00001...  losdia...│
│ 11 ene  34,00   64,18   56,0%   Creación...      losdia...│
└────────────────────────────────────────────────────────────┘
```

**Tabla:**
- Fecha: Formato corto "12 ene"
- Costo s/IVA: Número formateado
- Precio: Precio con IVA
- Margen: Porcentaje
- Motivo: Texto truncado (tooltip con completo)
- Usuario: Nombre (de `users`)

**Query:**
```sql
SELECT 
  ph.*,
  u.name as user_name
FROM price_history ph
LEFT JOIN users u ON ph.created_by = u.id
WHERE ph.product_id = $1
ORDER BY ph.created_at DESC
```

---

## DIALOG: MOVIMIENTOS DE STOCK

### Componente: `components/productos/stock-movements-dialog.tsx`

**Props:**
```typescript
interface StockMovementsDialogProps {
  productId: string
  productName: string
}
```

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│ Movimientos de Stock - Producto                         [X]│
├────────────────────────────────────────────────────────────┤
│ Fecha  Ubicación       Motivo              Usuario  Cant.  │
│ ──────────────────────────────────────────────────────────│
│ 15 ene - → Deposito    Transferencia...    losdia  (+8) 8 │
│ 15 ene Principal → -   -                   losdia  (-8) 26│
│ 11 ene Principal       Stock inicial...     losdia (+34)34│
└────────────────────────────────────────────────────────────┘
```

**Tabla:**
- Fecha: Formato corto
- Ubicación: 
  - Si entrada: `- → {location_name}`
  - Si salida: `{location_name} → -`
  - Si transferencia: `{from} → {to}`
- Motivo: Texto
- Usuario: Nombre
- Cantidad:
  - Verde con `(+X)` si incremento
  - Rojo con `(-X)` si decremento
  - Stock final después del movimiento

**Query:**
```sql
SELECT 
  sm.*,
  l_from.name as location_from_name,
  l_to.name as location_to_name,
  u.name as user_name
FROM stock_movements sm
LEFT JOIN locations l_from ON sm.location_from_id = l_from.id
LEFT JOIN locations l_to ON sm.location_to_id = l_to.id
LEFT JOIN users u ON sm.created_by = u.id
WHERE sm.product_id = $1
ORDER BY sm.created_at DESC
```

---

## Servicios

### Archivo: `lib/services/products.ts`

```typescript
import { createClient } from '@/lib/supabase/client'

// Obtener producto por ID con relaciones
async function getProductById(id: string): Promise<Product> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(id, name),
      supplier:suppliers(id, name),
      stock:stock(
        id,
        location_id,
        quantity,
        location:locations(id, name, is_main)
      )
    `)
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

// Crear producto
async function createProduct(data: {
  product: ProductInsert
  stockByLocation: Array<{ location_id: string, quantity: number }>
  userId: string
}): Promise<Product> {
  const supabase = createClient()
  
  // 1. Crear producto
  const { data: product, error: productError } = await supabase
    .from('products')
    .insert(data.product)
    .select()
    .single()
  
  if (productError) throw productError
  
  // 2. Crear registros de stock
  const stockRecords = data.stockByLocation.map(s => ({
    product_id: product.id,
    location_id: s.location_id,
    quantity: s.quantity
  }))
  
  const { error: stockError } = await supabase
    .from('stock')
    .insert(stockRecords)
  
  if (stockError) throw stockError
  
  // 3. Crear historial de precio inicial
  await supabase
    .from('price_history')
    .insert({
      product_id: product.id,
      cost: data.product.cost,
      price: data.product.price,
      margin_percentage: data.product.margin_percentage,
      tax_rate: data.product.tax_rate,
      reason: 'Creación inicial del producto',
      created_by: data.userId
    })
  
  // 4. Crear movimientos de stock iniciales
  const stockMovements = data.stockByLocation
    .filter(s => s.quantity > 0)
    .map(s => ({
      product_id: product.id,
      location_to_id: s.location_id,
      quantity: s.quantity,
      reason: 'Stock inicial del producto',
      reference_type: 'INITIAL',
      created_by: data.userId
    }))
  
  if (stockMovements.length > 0) {
    await supabase
      .from('stock_movements')
      .insert(stockMovements)
  }
  
  return product
}

// Actualizar producto
async function updateProduct(
  id: string,
  data: {
    product: ProductUpdate
    stockByLocation?: Array<{ location_id: string, quantity: number }>
    userId: string
  }
): Promise<Product> {
  const supabase = createClient()
  
  // Obtener producto actual para comparar
  const { data: currentProduct } = await supabase
    .from('products')
    .select('cost, price, margin_percentage, tax_rate')
    .eq('id', id)
    .single()
  
  // 1. Actualizar producto
  const { data: product, error } = await supabase
    .from('products')
    .update(data.product)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  
  // 2. Si cambió precio, registrar en historial
  if (
    currentProduct &&
    (currentProduct.cost !== data.product.cost ||
     currentProduct.price !== data.product.price ||
     currentProduct.margin_percentage !== data.product.margin_percentage)
  ) {
    await supabase
      .from('price_history')
      .insert({
        product_id: id,
        cost: data.product.cost,
        price: data.product.price,
        margin_percentage: data.product.margin_percentage,
        tax_rate: data.product.tax_rate,
        reason: 'Actualización manual',
        created_by: data.userId
      })
  }
  
  // 3. Si cambió stock, actualizar y registrar movimientos
  if (data.stockByLocation) {
    for (const stockItem of data.stockByLocation) {
      // Obtener stock actual
      const { data: currentStock } = await supabase
        .from('stock')
        .select('quantity')
        .eq('product_id', id)
        .eq('location_id', stockItem.location_id)
        .single()
      
      if (currentStock && currentStock.quantity !== stockItem.quantity) {
        const diff = stockItem.quantity - currentStock.quantity
        
        // Actualizar stock
        await supabase
          .from('stock')
          .update({ quantity: stockItem.quantity })
          .eq('product_id', id)
          .eq('location_id', stockItem.location_id)
        
        // Registrar movimiento
        await supabase
          .from('stock_movements')
          .insert({
            product_id: id,
            [diff > 0 ? 'location_to_id' : 'location_from_id']: stockItem.location_id,
            quantity: Math.abs(diff),
            reason: 'Ajuste manual',
            reference_type: 'ADJUSTMENT',
            created_by: data.userId
          })
      }
    }
  }
  
  return product
}

// Archivar producto
async function archiveProduct(id: string): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('products')
    .update({ active: false })
    .eq('id', id)
  
  if (error) throw error
}

// Activar producto
async function activateProduct(id: string): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('products')
    .update({ active: true })
    .eq('id', id)
  
  if (error) throw error
}

// Obtener historial de precios
async function getPriceHistory(productId: string): Promise<PriceHistory[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('price_history')
    .select(`
      *,
      user:users(name)
    `)
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

// Obtener movimientos de stock
async function getStockMovements(productId: string): Promise<StockMovement[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('stock_movements')
    .select(`
      *,
      location_from:locations!location_from_id(id, name),
      location_to:locations!location_to_id(id, name),
      user:users(name)
    `)
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

// Obtener ubicaciones activas
async function getActiveLocations(): Promise<Location[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('active', true)
    .order('is_main', { ascending: false })
    .order('name')
  
  if (error) throw error
  return data || []
}
```

---

## Validaciones

### Archivo: `lib/validations/product.ts`

```typescript
import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional().nullable(),
  product_type: z.enum(['PRODUCT', 'SERVICE']).default('PRODUCT'),
  sku: z.string().min(1, 'El SKU es requerido'),
  barcode: z.string().optional().nullable(),
  oem_code: z.string().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  default_supplier_id: z.string().uuid().optional().nullable(),
  cost: z.number().min(0, 'El costo debe ser mayor o igual a 0').optional().nullable(),
  margin_percentage: z.number().optional().nullable(),
  price: z.number().min(0, 'El precio debe ser mayor a 0'),
  tax_rate: z.number().min(0).max(100).default(21),
  currency: z.string().default('ARS'),
  track_stock: z.boolean().default(false),
  min_stock: z.number().int().min(0).optional().nullable(),
  visibility: z.enum(['SALES_AND_PURCHASES', 'SALES_ONLY', 'PURCHASES_ONLY']).default('SALES_AND_PURCHASES'),
  image_url: z.string().url().optional().nullable(),
  active: z.boolean().default(true),
})

export const stockByLocationSchema = z.object({
  location_id: z.string().uuid(),
  quantity: z.number().int().min(0, 'La cantidad no puede ser negativa'),
})

export const createProductSchema = z.object({
  product: productSchema,
  stockByLocation: z.array(stockByLocationSchema),
})

export type ProductFormData = z.infer<typeof productSchema>
export type StockByLocationData = z.infer<typeof stockByLocationSchema>
```

---

## Componentes shadcn/ui Necesarios

Ya deberían estar instalados:
- form, input, textarea, select, button
- card, dialog, separator, badge
- combobox, popover, command

---

## Criterios de Éxito

✅ Crear producto con stock diferenciado
✅ Editar producto existente
✅ Calcular precio automáticamente (costo + margen + IVA)
✅ Mostrar ganancia calculada
✅ Stock por ubicación (tabla editable)
✅ Upload de imagen (Supabase Storage)
✅ Combobox jerárquico de categorías
✅ Combobox de proveedores con "Crear nuevo"
✅ Historial de precios con motivos
✅ Movimientos de stock con ubicaciones
✅ Archivar/activar producto
✅ Validaciones (SKU único, barcode único)
✅ Guardar y crear otro
✅ Atajo ⌘ Enter
✅ Toasts de feedback
✅ Loading states

---

## Notas Importantes

- **NO** usar Prisma, solo Supabase
- SKU y barcode deben ser únicos (validar)
- Precio se calcula automáticamente, input disabled
- Stock no puede ser negativo (warning)
- Registrar siempre cambios en historial/movimientos
- Upload de imagen a Supabase Storage bucket `product-images`
- Combobox de categorías debe mostrar jerarquía
- Opción "+ Crear proveedor" debe abrir dialog reutilizable
- Formato de moneda: 2 decimales, coma como separador
- Formato de porcentaje: 2 decimales
- Mensajes en español
- Componentes en kebab-case

---

## Prioridad de Implementación

1. ✅ Servicios y validaciones
2. ✅ Componente de imagen upload
3. ✅ Formulario de producto (crear)
4. ✅ Página crear producto
5. ✅ Página editar producto
6. ✅ Dialog historial de precios
7. ✅ Dialog movimientos de stock

---

## Cálculos de Precio - Ejemplos

**Ejemplo 1:**
```
Costo sin IVA: 34
Margen: 56%
IVA: 21%

Cálculos:
precioSinIVA = 34 * 1.56 = 53.04
precioConIVA = 53.04 * 1.21 = 64.18
ganancia = 53.04 - 34 = 19.04
porcentajeGanancia = (19.04 / 34) * 100 = 56%

Resultado:
Precio con IVA: 64.18 (disabled)
$53.04 sin IVA
Ganancia: $19.04 (56%)
```

**Ejemplo 2:**
```
Costo sin IVA: 100
Margen: -10% (venta a pérdida)
IVA: 21%

Cálculos:
precioSinIVA = 100 * 0.90 = 90
precioConIVA = 90 * 1.21 = 108.90
ganancia = 90 - 100 = -10
porcentajeGanancia = (-10 / 100) * 100 = -10%

Resultado:
Precio con IVA: 108.90
$90.00 sin IVA
Ganancia: -$10.00 (-10%) (en rojo)
```

---

**¡RECUERDA!** Lee `claude.md` para convenciones del proyecto.

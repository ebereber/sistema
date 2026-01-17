# Tarea: Implementar Módulo Completo de Proveedores

## Contexto del Proyecto

Sistema POS Lemar - Next.js 16, TypeScript, Supabase, shadcn/ui (New York style)

**IMPORTANTE:** Lee primero el archivo `claude.md` en la raíz del proyecto para entender convenciones, estructura y patrones de código.

---

## Base de Datos

### Tabla: suppliers (YA EXISTE Y ESTÁ ACTUALIZADA)

```sql
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  tax_id text,
  tax_id_type text DEFAULT 'CUIT',
  legal_entity_type text DEFAULT 'Física',
  tax_category text DEFAULT 'Consumidor Final',
  email text,
  phone text,
  street_address text,
  apartment text,
  postal_code text,
  province text,
  city text,
  trade_name text,
  business_description text,
  payment_terms text,
  contact_person text,
  notes text,
  active boolean DEFAULT true,
  created_at timestamp,
  updated_at timestamp
);
```

**Campos clave:**
- `name` - Razón Social (requerido)
- `tax_id` + `tax_id_type` - Documento fiscal
- `legal_entity_type` - Física/Jurídica
- `tax_category` - Categoría impositiva
- `street_address`, `apartment`, `postal_code`, `province`, `city` - Dirección completa
- `trade_name` - Nombre comercial
- `business_description` - Descripción del negocio
- `payment_terms` - Condiciones de pago

---

## Estructura de Archivos a Crear

```
app/(dashboard)/proveedores/
├── page.tsx                    # Listado de proveedores (CREAR)
└── [id]/
    └── page.tsx                # Detalle del proveedor (CREAR)

components/proveedores/
├── supplier-dialog.tsx         # Dialog principal crear/editar (CREAR)
├── supplier-table.tsx          # Tabla de proveedores (CREAR)
├── fiscal-info-dialog.tsx      # Dialog de info fiscal (CREAR)
├── address-dialog.tsx          # Dialog de dirección (CREAR)
└── commercial-info-dialog.tsx  # Dialog de info comercial (CREAR)

lib/services/
└── suppliers.ts                # CRUD de proveedores (CREAR)

lib/validations/
└── supplier.ts                 # Schemas Zod (CREAR)

lib/constants/
└── argentina-locations.ts      # Provincias y ciudades (CREAR)
```

---

## Página 1: Listado de Proveedores

### Archivo: `app/(dashboard)/proveedores/page.tsx`

**Layout visual:**
```
┌────────────────────────────────────────────────────────────┐
│ Proveedores                    [Importar] [+ Nuevo (N)]    │
├────────────────────────────────────────────────────────────┤
│ [🔍 Buscar...] [Estado ▼] [Exportar]                       │
├────────────────────────────────────────────────────────────┤
│ Nombre          Documento        Teléfono      Acciones    │
│ ─────────────────────────────────────────────────────────  │
│ Genrod SA       CUIT 20-...     11-1234-5678   [⋮]         │
│ Juan Pérez      DNI 12345678    11-8765-4321   [⋮]         │
│                                                             │
│                              Página 1 de 5  [← 1 2 3 →]    │
└────────────────────────────────────────────────────────────┘
```

**Funcionalidades:**

1. **Header:**
   - H1: "Proveedores"
   - Botón "Importar" (outline, ícono FileUp) - por ahora solo visual
   - Botón "Nuevo proveedor" (primary, ícono Plus, badge "N")

2. **Barra de búsqueda y filtros:**
   - Input de búsqueda con ícono Search
     - Placeholder: "Buscar por nombre o CUIT/CUIL..."
     - Debounce de 300ms
     - Buscar en `name` y `tax_id`
   
   - Filtro de Estado (Popover + Command style combobox):
     - Botón trigger muestra "Estado" + Badge
     - Opciones con Checkbox:
       - ✓ Activo (default)
       - ☐ Archivado
     - Botón "Limpiar filtro"
   
   - Botón "Exportar" (outline, ícono Download) - por ahora solo visual

3. **Tabla:**
   - Columnas: Nombre | Documento | Teléfono | Acciones
   - Nombre: `name` (font-medium)
   - Documento: `tax_id_type` + `tax_id` (ej: "CUIT 20-12345678-9")
   - Teléfono: `phone` formateado
   - Acciones (DropdownMenu):
     - Ver detalles (Eye) → `/proveedores/[id]`
     - Crear compra (ShoppingCart) → `/compras/nueva?proveedor=[id]`
     - Separator
     - Archivar (Archive, text-orange-600)
     - Eliminar (Trash2, text-destructive) → AlertDialog

4. **Estados:**
   - Loading: Skeleton en filas
   - Empty: Card con mensaje + botón "Nuevo proveedor"
   - Error: Mensaje + botón "Reintentar"

5. **Paginación:**
   - Componente Pagination de shadcn
   - Texto "Mostrando X de Y resultados"
   - Controles de navegación

---

## Página 2: Detalle del Proveedor

### Archivo: `app/(dashboard)/proveedores/[id]/page.tsx`

**Layout visual:**
```
Proveedores › Genrod

┌─────────────────────────────────┬────────────────────────────┐
│ 🛒 Compras                      │ 👤 Proveedor      ✏️ Editar│
│                                 │                            │
│ 1                               │ Genrod                     │
│                                 │ DNI 2342342342             │
├─────────────────────────────────┤                            │
│ 💲 Monto Total                  │ 📧 def@genrod.com          │
│                                 │ 📱 2342345324              │
│ $2.157,00                       │                            │
├─────────────────────────────────┤ Domicilio                  │
│ 🛒 Compras Recientes            │ Das Test, 4f               │
│                                 │ Chubut - CP: 1234          │
│ 00001-436  11 ene    $2.157,00  │ 🔗 Google Maps             │
│                                 │                            │
│                                 │ 📅 Proveedor desde         │
│                                 │ 11 ene 2026, 21:43         │
└─────────────────────────────────┴────────────────────────────┘
```

**Funcionalidades:**

1. **Breadcrumb:**
   - "Proveedores" (clickeable → `/proveedores`)
   - "›" 
   - "{Nombre proveedor}" (actual)

2. **Grid 2 columnas (desktop), stack en mobile:**

   **Columna Izquierda:**
   
   - **Card: Compras**
     - Ícono ShoppingCart + título "Compras"
     - Número grande (text-4xl, font-bold)
     - Cuenta total de compras del proveedor
   
   - **Card: Monto Total**
     - Ícono DollarSign + título "Monto Total"  
     - Monto formateado (text-4xl, font-bold)
     - Suma de todas las compras
   
   - **Card: Compras Recientes**
     - Ícono ShoppingCart + título "Compras Recientes"
     - Lista de últimas 5-10 compras
     - Cada item clickeable → `/compras/[compraId]`
     - Grid: Número | Fecha | Monto
     - Empty state: "No hay compras registradas" + botón

   **Columna Derecha:**
   
   - **Card: Información del Proveedor**
     - Header: Ícono User + "Proveedor" | Botón "Editar"
     - Nombre (H3, font-semibold)
     - Tipo y número de documento
     - Separator
     - Email (ícono Mail, link mailto:, color azul)
     - Teléfono (ícono MessageCircle, link WhatsApp, color verde)
     - Separator
     - **Domicilio:**
       - Label "Domicilio"
       - Línea 1: `street_address`, `apartment`
       - Línea 2: `city`, `province` - CP: `postal_code`
       - Link "Buscar en Google Maps" (ExternalLink, target blank)
     - Separator
     - **Metadata:**
       - Proveedor desde: `created_at` formateado
       - Última modificación: `updated_at` formateado

3. **Responsive:**
   - Desktop: 60/40 split
   - Mobile: Stack vertical

---

## Dialog Principal: Crear/Editar Proveedor

### Componente: `components/proveedores/supplier-dialog.tsx`

**Props:**
```typescript
interface SupplierDialogProps {
  mode: 'create' | 'edit'
  supplierId?: string
  trigger?: React.ReactNode
  onSuccess?: (supplier: Supplier) => void
}
```

**Layout visual:**
```
┌──────────────────────────────────────────────────────────┐
│ Crear Proveedor                                       [X]│
├──────────────────────────────────────────────────────────┤
│ Número de Documento                                      │
│ [Ingresá CUIT o DNI...]           [Buscar en ARCA]      │
│                                                          │
│ Razón Social *                                           │
│ [Ej: Juan Pérez]                                         │
│                                                          │
│ Email                    │ Teléfono                      │
│ [correo@ejemplo.com]     │ [11-1234-5678]                │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Tipo       Personería    Categoría        ✏️ Editar│  │
│ │ CUIT/CUIL  Física        Consumidor Final         │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ + Agregar dirección                                      │
│ + Agregar información comercial                          │
│                                                          │
│                          [Cancelar] [Crear Proveedor]    │
└──────────────────────────────────────────────────────────┘
```

**Secciones:**

1. **Búsqueda en ARCA:**
   - Input para CUIT/DNI + Botón "Buscar en ARCA"
   - Por ahora: Botón solo muestra loading state (funcionalidad futura)
   - Placeholder: "Ingresá un CUIT o DNI y buscá en ARCA"

2. **Razón Social:** (REQUERIDO)
   - Input con validación
   - Label con asterisco rojo

3. **Contacto:** (Grid 2 columnas)
   - Email (type="email")
   - Teléfono (type="tel")

4. **Información Fiscal:** (Card con bg-muted)
   - Muestra: tax_id_type | legal_entity_type | tax_category
   - Botón "Editar" → abre `fiscal-info-dialog.tsx`
   - Grid de 3 columnas
   - Default: CUIT/CUIL | Física | Consumidor Final

5. **Botones Expandibles:**
   - "+ Agregar dirección" (variant ghost, full width)
     - Abre `address-dialog.tsx`
     - Después de guardar, muestra resumen de dirección
   
   - "+ Agregar información comercial" (variant ghost, full width)
     - Abre `commercial-info-dialog.tsx`
     - Después de guardar, muestra resumen

6. **Footer:**
   - Botón "Cancelar" (outline)
   - Botón "Crear Proveedor" / "Guardar Cambios" (primary)

**Estado interno:**
- Usar React state para almacenar:
  - fiscalInfo: { tax_id_type, legal_entity_type, tax_category }
  - addressInfo: { street_address, apartment, postal_code, province, city }
  - commercialInfo: { trade_name, business_description, payment_terms }

---

## Dialog 2: Información Fiscal

### Componente: `components/proveedores/fiscal-info-dialog.tsx`

**Dialog anidado sobre el principal**

**Campos:**

1. **Tipo de Documento** (Select):
   - DNI
   - CUIT/CUIL

2. **Personería** (Select):
   - Física
   - Jurídica

3. **Categoría Impositiva** (Select):
   - Responsable Inscripto
   - Consumidor Final (default)
   - Monotributista
   - Exento
   - IVA no alcanzado

**Behavior:**
- Al guardar: actualiza state en dialog principal
- Cierra dialog anidado
- Actualiza card de info fiscal

---

## Dialog 3: Agregar Dirección

### Componente: `components/proveedores/address-dialog.tsx`

**Campos:**

1. **Dirección** (Input, requerido):
   - Placeholder: "Av. Corrientes 1234"
   - Sin label visible

2. **Grid 2 columnas:**
   - Depto/Piso (Input): "4° B"
   - Código Postal (Input): "1234"

3. **Provincia** (Combobox, requerido):
   - Lista de provincias argentinas
   - Con búsqueda
   - Al seleccionar: filtra ciudades

4. **Ciudad** (Combobox, requerido):
   - Filtrada por provincia seleccionada
   - Con búsqueda
   - Disabled hasta que se seleccione provincia

**Validaciones:**
- Dirección: requerido
- Provincia: requerido
- Ciudad: requerido

---

## Dialog 4: Información Comercial

### Componente: `components/proveedores/commercial-info-dialog.tsx`

**Campos:**

1. **Nombre Comercial** (Input):
   - Placeholder: "Ej: La Tienda de Ana"

2. **Descripción** (Textarea, 3-4 líneas):
   - Placeholder: "Ej: Contador, Servicio de limpieza, etc."

3. **Condición de Pago** (Select o Combobox):
   - Contado
   - 7 días
   - 15 días
   - 30 días
   - 45 días
   - 60 días
   - 90 días
   - 120 días

---

## Servicios

### Archivo: `lib/services/suppliers.ts`

```typescript
import { createClient } from '@/lib/supabase/client'

// Obtener proveedores con filtros
async function getSuppliers(filters?: {
  search?: string
  active?: boolean
}): Promise<Supplier[]> {
  const supabase = createClient()
  
  let query = supabase
    .from('suppliers')
    .select('*')
    .order('name')
  
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,tax_id.ilike.%${filters.search}%`)
  }
  
  if (filters?.active !== undefined) {
    query = query.eq('active', filters.active)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// Obtener proveedor por ID
async function getSupplierById(id: string): Promise<Supplier> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

// Crear proveedor
async function createSupplier(supplier: SupplierInsert): Promise<Supplier> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('suppliers')
    .insert(supplier)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Actualizar proveedor
async function updateSupplier(id: string, supplier: SupplierUpdate): Promise<Supplier> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('suppliers')
    .update(supplier)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Eliminar proveedor (soft delete)
async function deleteSupplier(id: string): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('suppliers')
    .update({ active: false })
    .eq('id', id)
  
  if (error) throw error
}
```

---

## Validaciones

### Archivo: `lib/validations/supplier.ts`

```typescript
import { z } from 'zod'

export const supplierSchema = z.object({
  name: z.string().min(1, 'La razón social es requerida'),
  tax_id: z.string().optional().nullable(),
  tax_id_type: z.string().default('CUIT'),
  legal_entity_type: z.string().default('Física'),
  tax_category: z.string().default('Consumidor Final'),
  email: z.string().email('Email inválido').optional().nullable(),
  phone: z.string().optional().nullable(),
  street_address: z.string().optional().nullable(),
  apartment: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  trade_name: z.string().optional().nullable(),
  business_description: z.string().optional().nullable(),
  payment_terms: z.string().optional().nullable(),
  contact_person: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  active: z.boolean().default(true),
})

export type SupplierFormData = z.infer<typeof supplierSchema>
```

---

## Constantes: Provincias y Ciudades

### Archivo: `lib/constants/argentina-locations.ts`

```typescript
export const PROVINCIAS = [
  'Buenos Aires',
  'CABA',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucumán',
]

// Ciudades por provincia (ejemplo simplificado)
export const CIUDADES_POR_PROVINCIA: Record<string, string[]> = {
  'Buenos Aires': ['La Plata', 'Mar del Plata', 'Bahía Blanca', 'Tandil'],
  'CABA': ['CABA'],
  'Córdoba': ['Córdoba', 'Villa Carlos Paz', 'Río Cuarto'],
  'Santa Fe': ['Rosario', 'Santa Fe', 'Rafaela'],
  'Mendoza': ['Mendoza', 'San Rafael', 'Luján de Cuyo'],
  // ... agregar más según necesites
  // Por ahora con algunos ejemplos está bien
}
```

---

## Tipos TypeScript

```typescript
import { Database } from '@/lib/supabase/database.types'

type Supplier = Database['public']['Tables']['suppliers']['Row']
type SupplierInsert = Database['public']['Tables']['suppliers']['Insert']
type SupplierUpdate = Database['public']['Tables']['suppliers']['Update']
```

---

## Componentes shadcn/ui Necesarios

Instalar estos si no los tenés:

```bash
npx shadcn@latest add table
npx shadcn@latest add dialog
npx shadcn@latest add alert-dialog
npx shadcn@latest add popover
npx shadcn@latest add command
npx shadcn@latest add select
npx shadcn@latest add textarea
npx shadcn@latest add separator
npx shadcn@latest add skeleton
npx shadcn@latest add pagination
npx shadcn@latest add dropdown-menu
```

---

## Criterios de Éxito

✅ Listado de proveedores con búsqueda y filtros
✅ Crear proveedor con dialogs anidados
✅ Editar proveedor (mismo dialog)
✅ Ver detalle de proveedor
✅ Archivar/eliminar proveedor
✅ Paginación funcional
✅ Estados de loading/empty/error
✅ Validaciones con Zod
✅ Toasts de feedback
✅ Responsive design
✅ Links a WhatsApp y Google Maps
✅ Formato de documento y teléfono

---

## Notas Importantes

- **NO** usar Prisma, solo Supabase client
- Componentes en kebab-case
- Funciones en camelCase
- Usar tipos generados de Supabase
- Mensajes en español
- Mantener estilo New York de shadcn
- Dialog de proveedor debe ser **reutilizable** (para usar después en crear productos)
- Por ahora, "Buscar en ARCA" solo loading state (funcionalidad futura)
- Botones "Importar" y "Exportar" solo visuales por ahora
- Link a `/compras/nueva` aunque compras no exista aún
- Combobox para provincia y ciudad (filtrado)

---

## Prioridad de Implementación

1. ✅ Servicios y validaciones (`suppliers.ts`, `supplier.ts`)
2. ✅ Constantes de ubicaciones (`argentina-locations.ts`)
3. ✅ Dialogs anidados (fiscal, address, commercial)
4. ✅ Dialog principal (supplier-dialog.tsx)
5. ✅ Tabla de proveedores (supplier-table.tsx)
6. ✅ Página de listado (`proveedores/page.tsx`)
7. ✅ Página de detalle (`proveedores/[id]/page.tsx`)

---

**¡RECUERDA!** Lee `claude.md` para entender las convenciones del proyecto antes de empezar.

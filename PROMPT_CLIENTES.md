# Tarea: Implementar Módulo Completo de Clientes

## Contexto del Proyecto

Sistema POS Lemar - Next.js 16, TypeScript, Supabase, shadcn/ui (New York style)

**IMPORTANTE:** Lee primero el archivo `claude.md` en la raíz del proyecto para entender convenciones, estructura y patrones de código.

---

## Base de Datos

### Tabla: customers (YA EXISTE)

```sql
CREATE TABLE public.customers (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  trade_name text,
  tax_id text,
  tax_id_type text DEFAULT 'DNI',
  legal_entity_type text DEFAULT 'Física',
  tax_category text DEFAULT 'Consumidor Final',
  email text,
  phone text,
  street_address text,
  apartment text,
  postal_code text,
  province text,
  city text,
  assigned_seller_id uuid REFERENCES public.users(id),
  price_list_id uuid,  -- Por ahora NULL, sin FK (tabla no existe aún)
  payment_terms text,
  notes text,
  active boolean DEFAULT true,
  created_at timestamp,
  updated_at timestamp
);
```

**Campos clave:**
- `name` - Razón Social (requerido)
- `trade_name` - Nombre comercial
- `tax_id` + `tax_id_type` - Documento fiscal
- `assigned_seller_id` - FK a users (vendedor asignado)
- `price_list_id` - Por ahora NULL (sin tabla, para futuro)
- `payment_terms` - Condiciones de pago

---

## Estructura de Archivos a Crear

```
app/(dashboard)/clientes/
├── page.tsx                    # Listado de clientes (CREAR)
└── [id]/
    └── page.tsx                # Detalle del cliente (CREAR - después)

components/clientes/
├── customer-dialog.tsx         # Dialog principal crear/editar (CREAR)
├── customer-table.tsx          # Tabla de clientes (CREAR)
├── fiscal-info-dialog.tsx      # REUTILIZAR de proveedores
├── address-dialog.tsx          # REUTILIZAR de proveedores
└── commercial-info-dialog.tsx  # Dialog de info comercial (CREAR)

lib/services/
└── customers.ts                # CRUD de clientes (CREAR)

lib/validations/
└── customer.ts                 # Schemas Zod (CREAR)
```

**NOTA:** Reutilizar componentes de proveedores donde sea posible (fiscal-info-dialog, address-dialog).

---

## Página: Listado de Clientes

### Archivo: `app/(dashboard)/clientes/page.tsx`

**Layout visual:**
```
┌────────────────────────────────────────────────────────────┐
│ Clientes                       [Importar] [+ Nuevo (N)]    │
├────────────────────────────────────────────────────────────┤
│ [🔍 Buscar...] [Estado ▼] [Exportar]                       │
├────────────────────────────────────────────────────────────┤
│ Nombre          Documento        Teléfono      Acciones    │
│ ─────────────────────────────────────────────────────────  │
│ Juan Pérez      DNI 12345678    11-1234-5678   [⋮]         │
│ Acme Corp       CUIT 20-...     11-8765-4321   [⋮]         │
│                                                             │
│                              Página 1 de 5  [← 1 2 3 →]    │
└────────────────────────────────────────────────────────────┘
```

**Funcionalidades:**

1. **Header:**
   - H1: "Clientes"
   - Botón "Importar" (outline, ícono FileUp) - solo visual por ahora
   - Botón "Nuevo cliente" (primary, ícono Plus, badge "N")

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
   
   - Botón "Exportar" (outline, ícono Download) - solo visual por ahora

3. **Tabla:**
   - Columnas: Nombre | Documento | Teléfono | Acciones
   - Nombre: `name` (font-medium)
   - Documento: `tax_id_type` + `tax_id` (ej: "CUIT 20-12345678-9" o "-")
   - Teléfono: `phone` formateado (o "-")
   - Acciones (DropdownMenu):
     - Ver detalles (Pencil) → `/clientes/[id]`
     - Crear venta (ShoppingCart) → `/ventas/nueva?customerId=[id]`
     - Separator
     - Archivar (Archive, text-orange-600) → AlertDialog
     - Eliminar (Trash2, text-destructive) → AlertDialog

4. **AlertDialogs para Archivar/Desarchivar:**
   
   **Archivar:**
   - Título: "¿Estás seguro que querés archivar este cliente?"
   - Descripción: "Esta acción archivará el cliente "{nombre}". Podés desarchivarlo en cualquier momento."
   - Botones: "Cancelar" (outline) | "Archivar cliente" (destructive)
   
   **Desarchivar:**
   - Título: "¿Estás seguro que querés desarchivar este cliente?"
   - Descripción: "Esta acción desarchivará el cliente "{nombre}" y volverá a estar disponible."
   - Botones: "Cancelar" (outline) | "Desarchivar cliente" (default)

5. **Estados:**
   - Loading: Skeleton en filas
   - Empty: Card con mensaje + botón "Nuevo cliente"
   - Error: Mensaje + botón "Reintentar"

6. **Paginación:**
   - Componente Pagination de shadcn
   - Texto "Mostrando X de Y resultados"
   - Controles de navegación

---

## Dialog Principal: Crear/Editar Cliente

### Componente: `components/clientes/customer-dialog.tsx`

**IMPORTANTE:** Basar este componente en `components/proveedores/supplier-dialog.tsx` usando el mismo patrón.

**Props:**
```typescript
interface CustomerDialogProps {
  mode: 'create' | 'edit'
  customerId?: string
  trigger?: React.ReactNode
  onSuccess?: (customer: Customer) => void
}
```

**Layout visual:**
```
┌──────────────────────────────────────────────────────────┐
│ Crear Cliente                                         [X]│
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
│ │ DNI        Física        Consumidor Final         │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ + Agregar dirección                                      │
│ + Agregar información comercial                          │
│                                                          │
│                          [Cancelar] [Crear Cliente]      │
└──────────────────────────────────────────────────────────┘
```

**Secciones:**

1. **Búsqueda en ARCA:**
   - Input para CUIT/DNI + Botón "Buscar en ARCA"
   - Por ahora: Botón solo muestra loading state (funcionalidad futura)

2. **Razón Social:** (REQUERIDO)
   - Input con validación
   - Label con asterisco rojo

3. **Contacto:** (Grid 2 columnas)
   - Email (type="email")
   - Teléfono (type="tel")

4. **Información Fiscal:** (Card con bg-muted)
   - Muestra: tax_id_type | legal_entity_type | tax_category
   - Botón "Editar" → **REUTILIZA** `fiscal-info-dialog.tsx` de proveedores
   - Default: DNI | Física | Consumidor Final

5. **Botones Expandibles:**
   - "+ Agregar dirección" (variant ghost, full width)
     - **REUTILIZA** `address-dialog.tsx` de proveedores
   
   - "+ Agregar información comercial" (variant ghost, full width)
     - Abre `commercial-info-dialog.tsx` (nuevo)

6. **Footer:**
   - Botón "Cancelar" (outline)
   - Botón "Crear Cliente" / "Guardar Cambios" (primary)

---

## Dialog: Información Comercial

### Componente: `components/clientes/commercial-info-dialog.tsx`

**Dialog anidado sobre el principal**

**Campos:**

1. **Nombre Comercial** (Input):
   - Placeholder: "Ej: La Tienda de Ana"
   - Opcional

2. **Descripción** (Textarea, 3-4 líneas):
   - Placeholder: "Ej: Cliente frecuente"
   - Opcional

3. **Vendedor Asignado** (Combobox):
   - Placeholder: "Seleccioná un vendedor..."
   - Query: `SELECT id, name FROM users WHERE role = 'SELLER' AND active = true`
   - Con búsqueda
   - Opcional

4. **Lista de Precios** (Select - DISABLED):
   - Mostrar select disabled con mensaje: "Disponible próximamente"
   - Placeholder: "Seleccioná una lista de precios..."
   - Tooltip: "Esta función estará disponible cuando se cree el módulo de listas de precios"

5. **Condición de Pago** (Select):
   - Placeholder: "Seleccioná una condición de pago..."
   - Opciones:
     - Contado
     - 7 días
     - 15 días
     - 30 días
     - 45 días
     - 60 días
     - 90 días
     - 120 días

**Behavior:**
- Al guardar: actualiza state en dialog principal
- Cierra dialog anidado
- Muestra resumen en dialog principal

---

## Servicios

### Archivo: `lib/services/customers.ts`

```typescript
import { createClient } from '@/lib/supabase/client'

// Obtener clientes con filtros
async function getCustomers(filters?: {
  search?: string
  active?: boolean
}): Promise<Customer[]> {
  const supabase = createClient()
  
  let query = supabase
    .from('customers')
    .select(`
      *,
      assigned_seller:users!assigned_seller_id(id, name)
    `)
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

// Obtener cliente por ID
async function getCustomerById(id: string): Promise<Customer> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('customers')
    .select(`
      *,
      assigned_seller:users!assigned_seller_id(id, name)
    `)
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

// Crear cliente
async function createCustomer(customer: CustomerInsert): Promise<Customer> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('customers')
    .insert(customer)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Actualizar cliente
async function updateCustomer(id: string, customer: CustomerUpdate): Promise<Customer> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('customers')
    .update(customer)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Archivar cliente (soft delete)
async function archiveCustomer(id: string): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('customers')
    .update({ active: false })
    .eq('id', id)
  
  if (error) throw error
}

// Desarchivar cliente
async function unarchiveCustomer(id: string): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('customers')
    .update({ active: true })
    .eq('id', id)
  
  if (error) throw error
}

// Obtener vendedores (para dropdown)
async function getSellers(): Promise<User[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('role', 'SELLER')
    .eq('active', true)
    .order('name')
  
  if (error) throw error
  return data || []
}
```

---

## Validaciones

### Archivo: `lib/validations/customer.ts`

```typescript
import { z } from 'zod'

export const customerSchema = z.object({
  name: z.string().min(1, 'La razón social es requerida'),
  trade_name: z.string().optional().nullable(),
  tax_id: z.string().optional().nullable(),
  tax_id_type: z.string().default('DNI'),
  legal_entity_type: z.string().default('Física'),
  tax_category: z.string().default('Consumidor Final'),
  email: z.string().email('Email inválido').optional().nullable(),
  phone: z.string().optional().nullable(),
  street_address: z.string().optional().nullable(),
  apartment: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  assigned_seller_id: z.string().uuid().optional().nullable(),
  price_list_id: z.string().uuid().optional().nullable(),
  payment_terms: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  active: z.boolean().default(true),
})

export type CustomerFormData = z.infer<typeof customerSchema>
```

---

## Tipos TypeScript

```typescript
import { Database } from '@/lib/supabase/database.types'

type Customer = Database['public']['Tables']['customers']['Row']
type CustomerInsert = Database['public']['Tables']['customers']['Insert']
type CustomerUpdate = Database['public']['Tables']['customers']['Update']
```

---

## Componentes a Reutilizar

**De `components/proveedores/`:**
- ✅ `fiscal-info-dialog.tsx` - Reutilizar tal cual
- ✅ `address-dialog.tsx` - Reutilizar tal cual

**Ubicaciones ya existe en:**
- ✅ `lib/constants/argentina-locations.ts` - Provincias y ciudades

---

## Componentes shadcn/ui Necesarios

Los mismos que proveedores (ya deberían estar instalados):
- table, dialog, alert-dialog, popover, command
- select, textarea, separator, skeleton, pagination
- dropdown-menu, form, input, button, badge

---

## Criterios de Éxito

✅ Listado de clientes con búsqueda y filtros
✅ Crear cliente con dialogs anidados
✅ Editar cliente (mismo dialog)
✅ Archivar/desarchivar con AlertDialogs
✅ Eliminar cliente (AlertDialog)
✅ Paginación funcional
✅ Estados de loading/empty/error
✅ Validaciones con Zod
✅ Toasts de feedback
✅ Responsive design
✅ Selector de vendedor (de tabla users)
✅ Campo de lista de precios disabled con tooltip
✅ Reutilización de componentes de proveedores

---

## Notas Importantes

- **NO** usar Prisma, solo Supabase client
- **REUTILIZAR** componentes de proveedores donde sea posible
- Dialog de cliente debe ser **reutilizable** (para usar después en ventas)
- Campo `price_list_id` existe pero sin FK (tabla no existe aún)
- Select de "Lista de Precios" debe estar DISABLED con mensaje
- "Buscar en ARCA" solo loading state por ahora
- Botones "Importar" y "Exportar" solo visuales
- Link a `/ventas/nueva` aunque ventas no exista aún
- Combobox para vendedor con búsqueda
- AlertDialogs tanto para archivar como desarchivar
- Componentes en kebab-case
- Mensajes en español
- Mantener estilo New York de shadcn

---

## Prioridad de Implementación

1. ✅ Servicios y validaciones (`customers.ts`, `customer.ts`)
2. ✅ Dialog de información comercial (nuevo)
3. ✅ Dialog principal de cliente (adaptado de proveedores)
4. ✅ Tabla de clientes (customer-table.tsx)
5. ✅ Página de listado (`clientes/page.tsx`)
6. ⏳ Página de detalle (`clientes/[id]/page.tsx`) - DESPUÉS

---

**¡IMPORTANTE!** 
- Lee `claude.md` para convenciones del proyecto
- Reutilizá componentes de proveedores (fiscal-info-dialog, address-dialog)
- El módulo es MUY similar a proveedores, usa eso como referencia

---

## Diferencias clave con Proveedores

| Aspecto | Proveedores | Clientes |
|---------|-------------|----------|
| Tabla | `suppliers` | `customers` |
| Info Comercial | Nombre comercial + descripción + condición pago | + Vendedor asignado + Lista de precios (disabled) |
| Acción crear | "Crear compra" | "Crear venta" |
| Link | `/compras/nueva?proveedor=[id]` | `/ventas/nueva?customerId=[id]` |
| Default fiscal | CUIT/CUIL | DNI |

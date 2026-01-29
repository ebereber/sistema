# Sistema POS Lemar

Sistema de Punto de Venta (POS) completo desarrollado con Next.js 16, TypeScript, Supabase y shadcn/ui.

---

## 📋 Información del Proyecto

- **Nombre:** Lemar POS
- **Empresa:** Lemar (Logo: Lightbulb)
- **Stack:** Next.js 16 + TypeScript + Supabase + shadcn/ui
- **Package Manager:** pnpm
- **Estilo:** New York theme (Zinc color scheme)

---

## 🏗️ Arquitectura del Proyecto

### Stack Tecnológico

```
- Framework: Next.js 16 (App Router)
- Lenguaje: TypeScript
- Base de datos: Supabase (PostgreSQL)
- Autenticación: Supabase Auth
- ORM: Cliente directo de Supabase (NO Prisma)
- Estilos: Tailwind CSS
- Componentes UI: shadcn/ui (New York style, Zinc colors)
- Iconos: Lucide React
- Formularios: React Hook Form + Zod
- Temas: next-themes (dark/light mode)
- Package Manager: pnpm
```

### Documentación

### Uso de Context7

Use Context7 MCP when I need library/API documentation, code generation, setup or configuration help.

### Bibliotecas Específicas

- Next.js: use library /vercel/next.js for API and docs
- [Otras bibliotecas con sus IDs de Context7]

### Convenciones de Código Next.js 16

- Usa Server Components por defecto
- Solo agrega 'use client' cuando sea estrictamente necesario (interactividad, hooks, eventos)
- Prioriza el App Router sobre Pages Router
- Usa las últimas características de Next.js 16

### Estructura de Carpetas

```
app/
├── (auth)/                    # Autenticación (se asume por componentes de auth)
├── (dashboard)/               # Route group - Dashboard principal
│   ├── clientes/
│   │   ├── [id]/             # Detalle de cliente
│   │   └── page.tsx          # Listado de clientes
│   ├── compras/
│   │   ├── [id]/
│   │   │   ├── editar/       # Editar compra
│   │   │   └── page.tsx      # Detalle compra
│   │   ├── nueva/            # Nueva compra
│   │   └── page.tsx          # Listado de compras
│   ├── configuracion/
│   │   ├── categorias/       # Gestión de categorías
│   │   ├── colaboradores/    # Gestión de personal
│   │   ├── listas-precios/   # Gestión de listas
│   │   ├── medios-de-pago/   # Métodos de pago
│   │   ├── puntos-de-venta/  # POS config
│   │   ├── ubicaciones/      # Sucursales/Depósitos + Cajas registradoras
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── presupuestos/
│   │   ├── [id]/             # Detalle presupuesto
│   │   └── page.tsx          # Listado
│   ├── productos/
│   │   ├── [id]/             # Editar producto
│   │   ├── nuevo/            # Crear producto
│   │   └── page.tsx          # Listado principal
│   ├── proveedores/
│   │   ├── [id]/             # Detalle proveedor
│   │   └── page.tsx          # Listado
│   ├── turnos/
│   │   ├── [id]/             # Detalle de turno
│   │   └── page.tsx          # Listado de turnos
│   ├── ventas/
│   │   ├── [id]/             # Detalle venta
│   │   ├── nueva/            # Nueva venta (POS)
│   │   └── page.tsx          # Listado de ventas
│   ├── layout.tsx            # Layout con sidebar
│   └── page.tsx              # Home del dashboard
├── layout.tsx                # Layout raíz
└── page.tsx                  # Landing/Redirect

components/
├── clientes/                 # Diálogos y tablas de clientes
│   ├── commercial-info-dialog.tsx
│   ├── customer-dialog.tsx
│   └── customer-table.tsx
├── compras/                  # Componentes de compras
│   ├── delete-purchase-dialog.tsx
│   └── purchase-form.tsx
├── configuracion/            # Componentes de administración
│   ├── assign-pos-dialog.tsx
│   ├── category-form-sheet.tsx
│   ├── location-card.tsx
│   ├── pos-table.tsx
│   ├── price-list-dialog.tsx
│   └── ... (otros componentes de config)
├── productos/               # Gestión de stock y productos
│   ├── archive-product-dialog.tsx
│   ├── bulk-actions-bar.tsx
│   ├── price-history-dialog.tsx
│   ├── stock-management-dialog.tsx
│   └── ... (otros componentes de productos)
├── proveedores/             # Gestión de proveedores
│   ├── address-dialog.tsx
│   ├── commercial-info-dialog.tsx
│   ├── fiscal-info-dialog.tsx
│   ├── supplier-dialog.tsx
│   └── supplier-table.tsx
├── sidebar/                 # Estructura de navegación
│   ├── app-header.tsx
│   ├── app-sidebar.tsx
│   ├── command-menu.tsx
│   ├── nav-main.tsx
│   └── user-menu.tsx
├── ui/                      # Componentes base shadcn/ui
│   ├── file-upload.tsx      # Upload de archivos/imágenes
│   └── ... (otros componentes shadcn)
├── ventas/                  # Componentes del punto de venta
│   ├── active-shift-dialog.tsx
│   ├── add-note-dialog.tsx
│   ├── cart-panel.tsx
│   ├── cash-in-dialog.tsx
│   ├── cash-out-dialog.tsx
│   ├── checkout-dialog.tsx
│   ├── close-shift-dialog.tsx
│   ├── customer-select-dialog.tsx
│   ├── open-shift-dialog.tsx
│   └── product-search-panel.tsx
├── auth-button.tsx          # Componentes de sesión
├── login-form.tsx
└── theme-switcher.tsx

hooks/
├── use-active-shift.ts       # Hook para gestión de turnos de caja
├── use-debounce.ts           # Hook para optimizar búsquedas
└── use-mobile.ts             # Detección de dispositivos

lib/
├── constants/
│   └── argentina-locations.ts # Datos geográficos
├── services/                 # Lógica de API/Supabase
│   ├── categories.ts
│   ├── customers.ts
│   ├── locations.ts
│   ├── payment-methods.ts
│   ├── products.ts
│   ├── purchases.ts          # Servicio de compras
│   ├── sales.ts
│   ├── shifts.ts             # Servicio de turnos de caja
│   ├── suppliers.ts
│   └── ...
├── supabase/                 # Configuración de cliente/servidor
│   ├── client.ts
│   ├── proxy.ts
│   └── server.ts
├── utils/
│   └── currency.ts           # Formateo de dinero
├── validations/              # Schemas de Zod por entidad
│   ├── category.ts
│   ├── customer.ts
│   ├── sale.ts
│   ├── supplier.ts
│   └── ...
└── utils.ts                 # Utilidades generales
```

### Ventajas de esta Estructura

**Route Groups:**

- `(auth)` - Rutas de autenticación sin el prefijo /auth en la URL
- `(dashboard)` - Rutas del dashboard que comparten el layout con sidebar

**Beneficios:**

- ✅ URLs limpias: `/login` en lugar de `/auth/login`
- ✅ Layout separado: Auth sin sidebar, Dashboard con sidebar
- ✅ Mejor organización visual en el árbol de carpetas
- ✅ Facilita agregar más route groups en el futuro

---

## 🎨 Convenciones de Diseño

### Nomenclatura

**Componentes:** kebab-case

```typescript
// ✅ Correcto
product - list.tsx;
sale - form.tsx;
customer - card.tsx;

// ❌ Incorrecto
ProductList.tsx;
SaleForm.tsx;
```

**Servicios:** camelCase

```typescript
// ✅ Correcto
getProducts();
createCustomer();
updateSale();
```

**Tipos:** PascalCase

```typescript
// ✅ Correcto
type Product = Database["public"]["Tables"]["products"]["Row"];
type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"];
```

### shadcn/ui Configuration

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

**Características del estilo New York:**

- Componentes con bordes más definidos
- Sombras sutiles
- Espaciado más compacto
- Look más tradicional y profesional
- Perfecto para aplicaciones empresariales/POS

### Colores y Temas

```css
/* Theme: Zinc */
Light Mode:
  - Background: white / zinc-50
  - Foreground: zinc-950
  - Primary: zinc-900
  - Border: zinc-200

Dark Mode:
  - Background: zinc-950
  - Foreground: zinc-50
  - Primary: zinc-50
  - Border: zinc-800
```

### Tipografía

```typescript
// Fuente: Inter (instalada con shadcn)
text-xs:    12px  // Labels, badges
text-sm:    14px  // Texto normal, inputs
text-base:  16px  // Texto importante
text-lg:    18px  // Subtítulos
text-xl:    20px  // Títulos de sección
text-2xl:   24px  // Títulos principales
text-3xl:   30px  // Página principal

// Pesos
font-normal:    400
font-medium:    500
font-semibold:  600
font-bold:      700
```

---

## 🗺️ Navegación del Sistema

### Sidebar Structure

```
🏢 Lemar (Lightbulb icon)

📍 Nueva Venta          → /ventas/nueva
   (Botón principal destacado)

🛒 Ventas              → /ventas
   ├─ Clientes         → /clientes
   ├─ Cobranzas        → /cobranzas
   └─ Presupuestos     → /presupuestos

💰 Turnos              → /turnos

📦 Productos           → /productos
   └─ Transferencias   → /transferencias

🛍️ Compras            → /compras
   ├─ Órdenes          → /compras/ordenes
   ├─ Proveedores      → /proveedores
   └─ Pagos            → /compras/pagos
```

### Rutas Implementadas

**✅ Completadas:**

**Autenticación (Route group: `(auth)`):**

- `/login` - Inicio de sesión
- `/sign-up` - Registro
- `/sign-up-success` - Confirmación de registro
- `/forgot-password` - Recuperar contraseña
- `/update-password` - Actualizar contraseña
- `/confirm` - Confirmación de email
- `/error` - Errores de autenticación

**Dashboard (Route group: `(dashboard)`):**

- `/` - Home/Dashboard
- `/ventas` - Listado de ventas
- `/ventas/nueva` - POS (Punto de venta)
- `/ventas/[id]` - Detalle de venta
- `/productos` - Listado de productos
- `/productos/nuevo` - Crear producto
- `/productos/[id]` - Editar producto
- `/clientes` - Listado de clientes
- `/clientes/[id]` - Detalle de cliente
- `/presupuestos` - Listado de presupuestos
- `/presupuestos/[id]` - Detalle de presupuesto
- `/proveedores` - Listado de proveedores
- `/proveedores/[id]` - Detalle de proveedor
- `/turnos` - Listado de turnos de caja
- `/turnos/[id]` - Detalle de turno
- `/compras` - Listado de compras
- `/compras/nueva` - Nueva compra
- `/compras/[id]` - Detalle de compra
- `/compras/[id]/editar` - Editar compra
- `/configuracion/ubicaciones` - Ubicaciones + Cajas registradoras

**📋 Pendientes:**

- `/cobranzas` - Gestión de cobranzas
- `/transferencias` - Transferencias de stock
- `/compras/ordenes` - Órdenes de compra
- `/compras/pagos` - Pagos a proveedores

---

## 🗄️ Base de Datos (Supabase)

### Conexión

```typescript
// Cliente para componentes browser
import { supabase } from "@/lib/supabase/client";

// Cliente para server components
import { createServerSupabaseClient } from "@/lib/supabase/server";
```

## Estructura de Base de Datos (Supabase)

### Tablas Implementadas ✅

```sql
-- Usuarios (extiende auth.users)
public.users (
  id uuid,
  email text,
  name text,
  role user_role, -- 'ADMIN' | 'SELLER' | 'VIEWER' | 'CASHIER'
  active boolean,
  created_at, updated_at
)

-- Ubicaciones/Sucursales
public.locations (
  id uuid,
  name text,
  address text,
  is_main boolean, -- Solo una puede ser true
  active boolean,
  created_at, updated_at
)

-- Puntos de Venta
public.point_of_sale (
  id uuid,
  number integer unique,
  name text,
  is_digital boolean, -- true = e-commerce, false = físico
  location_id uuid, -- null si is_digital = true
  enabled_for_arca boolean,
  active boolean,
  created_at, updated_at
)

-- Cajas Registradoras
public.cash_registers (
  id uuid,
  name text,
  location_id uuid references locations(id),
  is_default boolean default false,
  active boolean default true,
  created_at, updated_at
)

-- Turnos de Caja
public.cash_register_shifts (
  id uuid,
  cash_register_id uuid references cash_registers(id),
  opened_by uuid references auth.users(id),
  closed_by uuid references auth.users(id),
  opening_amount numeric(12,2) default 0,
  closing_amount numeric(12,2),
  expected_amount numeric(12,2),
  discrepancy numeric(12,2),
  previous_counted_amount numeric(12,2), -- Monto contado del turno anterior
  left_in_cash numeric(12,2), -- Monto que queda en caja al cerrar
  status text default 'open', -- 'open' | 'closed'
  opened_at timestamptz default now(),
  closed_at timestamptz
)

-- Movimientos de Caja
public.cash_register_movements (
  id uuid,
  shift_id uuid references cash_register_shifts(id),
  type text, -- 'cash_in' | 'cash_out'
  amount numeric(12,2),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
)

-- Categorías (jerárquicas)
public.categories (
  id uuid,
  name text,
  description text,
  parent_id uuid, -- Self-reference para jerarquía
  active boolean,
  created_at, updated_at
)

-- Proveedores
public.suppliers (
  id uuid,
  name text,
  trade_name text,
  tax_id text,
  tax_id_type text, -- 'CUIT', 'CUIL', 'DNI'
  legal_entity_type text, -- 'Física', 'Jurídica'
  tax_category text, -- 'Consumidor Final', etc.
  email text,
  phone text,
  street_address text,
  apartment text,
  postal_code text,
  province text,
  city text,
  contact_person text,
  business_description text,
  payment_terms text,
  notes text,
  active boolean,
  created_at, updated_at
)

-- Productos
public.products (
  id uuid,
  name text,
  description text,
  product_type product_type, -- 'PRODUCT' | 'SERVICE' | 'KIT'
  sku text unique,
  barcode text unique,
  oem_code text,
  category_id uuid,
  default_supplier_id uuid,
  price numeric(10,2),
  cost numeric(10,2),
  margin_percentage numeric(5,2),
  tax_rate numeric(5,2) default 21,
  currency text default 'ARS',
  track_stock boolean default false,
  stock_quantity integer default 0, -- Stock total (suma de todas ubicaciones)
  min_stock integer,
  visibility text default 'SALES_AND_PURCHASES',
  image_url text,
  active boolean,
  created_at, updated_at
)

-- Stock por Ubicación
public.stock (
  id uuid,
  product_id uuid,
  location_id uuid,
  quantity integer default 0,
  updated_at,
  unique(product_id, location_id)
)

-- Movimientos de Stock (Auditoría)
public.stock_movements (
  id uuid,
  product_id uuid,
  location_from_id uuid,
  location_to_id uuid,
  quantity integer,
  reason text,
  reference_type text, -- 'SALE' | 'PURCHASE' | 'TRANSFER' | 'ADJUSTMENT'
  reference_id uuid,
  created_by uuid,
  created_at
)

-- Historial de Precios (Auditoría)
public.price_history (
  id uuid,
  product_id uuid,
  cost numeric(10,2),
  price numeric(10,2),
  margin_percentage numeric(5,2),
  tax_rate numeric(5,2),
  reason text,
  created_by uuid,
  created_at
)

-- Listas de Precios
public.price_lists (
  id uuid,
  name text,
  description text,
  is_automatic boolean default true,
  adjustment_type text default 'AUMENTO',
  adjustment_percentage numeric(5,2) default 0,
  includes_tax boolean default true,
  active boolean,
  created_at, updated_at
)

-- Clientes
public.customers (
  id uuid,
  name text,
  trade_name text,
  tax_id text,
  tax_id_type text default 'DNI',
  legal_entity_type text default 'Física',
  tax_category text default 'Consumidor Final',
  email text,
  phone text,
  street_address text,
  apartment text,
  postal_code text,
  province text,
  city text,
  assigned_seller_id uuid,
  price_list_id uuid,
  payment_terms text,
  notes text,
  active boolean,
  created_at, updated_at
)

-- Ventas
public.sales (
  id uuid,
  sale_number text unique, -- Formato: XXX-XXXXX-XXXXXXXX
  customer_id uuid,
  seller_id uuid,
  shift_id uuid references cash_register_shifts(id), -- Turno de caja asociado
  subtotal numeric(12,2),
  discount numeric(12,2),
  tax numeric(12,2),
  total numeric(12,2),
  status text, -- 'completed' | 'cancelled' | 'refunded'
  notes text,
  -- Campos para notas de crédito y devoluciones
  credit_note_id uuid, -- Si es una venta con NC aplicada
  exchange_sale_id uuid, -- Si es un cambio, referencia a la venta original
  is_exchange boolean default false,
  created_at, updated_at
)

-- Items de Venta
public.sale_items (
  id uuid,
  sale_id uuid,
  product_id uuid,
  quantity integer,
  unit_price numeric(10,2),
  discount numeric(10,2),
  subtotal numeric(12,2),
  created_at
)

-- Pagos de Venta
public.sale_payments (
  id uuid,
  sale_id uuid,
  payment_method_id uuid,
  amount numeric(12,2),
  created_at
)

-- Compras
public.purchases (
  id uuid,
  purchase_number text unique, -- Formato: CPR-XXXXX-XXXXXXXX (generado automático)
  supplier_id uuid references suppliers(id),
  location_id uuid references locations(id),
  voucher_type text, -- '90' = Comprobante X, '95' = NC X, etc.
  voucher_number text, -- Número de factura del proveedor
  invoice_date date,
  due_date date,
  accounting_date date,
  subtotal numeric(12,2) default 0,
  discount numeric(12,2) default 0,
  tax numeric(12,2) default 0,
  total numeric(12,2) default 0,
  status text default 'completed', -- 'draft' | 'completed' | 'cancelled'
  products_received boolean default false,
  notes text,
  attachment_url text, -- URL del PDF/imagen de factura
  tax_category text,
  created_by uuid,
  created_at, updated_at,
  -- Constraint único para evitar duplicados
  unique(supplier_id, voucher_type, voucher_number) where status != 'cancelled'
)

-- Items de Compra
public.purchase_items (
  id uuid,
  purchase_id uuid references purchases(id) on delete cascade,
  product_id uuid references products(id),
  name text,
  sku text,
  quantity integer default 1,
  unit_cost numeric(12,2) default 0,
  subtotal numeric(12,2) default 0,
  type text default 'product', -- 'product' | 'custom'
  created_at
)
```

### Funciones SQL Importantes

```sql
-- Generar número de compra automático
generate_purchase_number(location_id_param uuid) RETURNS text
-- Formato: CPR-XXXXX-XXXXXXXX

-- Aumentar stock desde compra
increase_stock_from_purchase(p_product_id uuid, p_location_id uuid, p_quantity integer)
-- Inserta o actualiza stock en la ubicación

-- Disminuir stock
decrease_stock(p_product_id uuid, p_location_id uuid, p_quantity integer)
-- Reduce stock (usado al eliminar compras)

-- Verificar duplicados de compra
-- Se usa índice único: (supplier_id, voucher_type, voucher_number) WHERE status != 'cancelled'
```

### Tipos TypeScript

```typescript
// Generar tipos desde Supabase
// pnpm supabase gen types typescript --project-id "ref" > lib/supabase/database.types.ts

import { Database } from "@/lib/supabase/database.types";

type Product = Database["public"]["Tables"]["products"]["Row"];
type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];
```

### RLS (Row Level Security)

**Estado actual:** Deshabilitado para desarrollo rápido

**Seguridad:** Manejada en el código (middleware + validaciones)

**Futuro:** Habilitar RLS en producción

---

## 🔧 Patrones de Código

### Servicios (lib/services/)

**Template estándar:**

```typescript
import { supabase } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/database.types";

type Entity = Database["public"]["Tables"]["entities"]["Row"];
type EntityInsert = Database["public"]["Tables"]["entities"]["Insert"];
type EntityUpdate = Database["public"]["Tables"]["entities"]["Update"];

/**
 * Obtener todas las entidades
 */
export async function getEntities(filters?: { /* filtros opcionales */ }) {
  let query = supabase
    .from("entities")
    .select("*")
    .order("created_at", { ascending: false });

  // Aplicar filtros...

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Obtener una entidad por ID
 */
export async function getEntityById(id: string) {
  const { data, error } = await supabase
    .from("entities")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Crear una entidad
 */
export async function createEntity(entity: EntityInsert) {
  const { data, error } = await supabase
    .from("entities")
    .insert(entity)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Actualizar una entidad
 */
export async function updateEntity(id: string, entity: EntityUpdate) {
  const { data, error } = await supabase
    .from("entities")
    .update(entity)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Eliminar una entidad (soft delete)
 */
export async function deleteEntity(id: string) {
  const { error } = await supabase
    .from("entities")
    .update({ active: false })
    .eq("id", id);

  if (error) throw error;
}
```

### Validaciones (lib/validations/)

**Template estándar:**

```typescript
import { z } from "zod";

export const entitySchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  // ... otros campos
});

export const createEntitySchema = entitySchema.omit({
  // campos auto-generados
});

export const updateEntitySchema = entitySchema.partial();

export type EntityFormData = z.infer<typeof entitySchema>;
```

### Componentes de Formulario

**Template estándar:**

```typescript
'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Form, FormField, ... } from '@/components/ui/form'
import { toast } from 'sonner'

import { createEntity, updateEntity } from '@/lib/services/entities'
import { entitySchema, type EntityFormData } from '@/lib/validations/entity'

interface EntityFormProps {
  initialData?: EntityFormData & { id?: string }
  mode: 'create' | 'edit'
}

export function EntityForm({ initialData, mode }: EntityFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<EntityFormData>({
    resolver: zodResolver(entitySchema),
    defaultValues: initialData || {
      // valores por defecto
    },
  })

  async function onSubmit(data: EntityFormData) {
    setIsLoading(true)

    try {
      if (mode === 'create') {
        await createEntity(data)
        toast.success('Creado correctamente')
      } else {
        await updateEntity(initialData!.id!, data)
        toast.success('Actualizado correctamente')
      }

      router.push('/entities')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Campos del formulario */}

        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {mode === 'create' ? 'Crear' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
```

### Server Components (Páginas)

```typescript
// app/(dashboard)/entities/page.tsx
import { getEntities } from "@/lib/services/entities";

export default async function EntitiesPage() {
  const entities = await getEntities();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Título</h1>
          <p className="text-muted-foreground">Descripción</p>
        </div>
        <Button asChild>
          <Link href="/entities/nuevo">Nuevo</Link>
        </Button>
      </div>

      {/* Contenido */}
    </div>
  );
}
```

**Nota sobre Route Groups:**

- Las páginas en `(auth)/` NO tienen el sidebar (layout mínimo)
- Las páginas en `(dashboard)/` SÍ tienen el sidebar (layout completo)
- Los route groups NO afectan la URL final

```
Archivo:                          URL:
app/(auth)/login/page.tsx    →   /login
app/(dashboard)/ventas/page.tsx → /ventas
```

---

## 📦 Componentes UI Comunes

### Empty State

```typescript
<div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
  <div className="rounded-full bg-muted p-4 mb-4">
    <Icon className="h-8 w-8 text-muted-foreground" />
  </div>
  <h3 className="font-semibold text-lg mb-2">Sin datos</h3>
  <p className="text-sm text-muted-foreground mb-4">
    Descripción del estado vacío
  </p>
  <Button>Acción</Button>
</div>
```

### Loading State

```typescript
<div className="flex items-center justify-center p-8">
  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
</div>
```

### Stats Card

```typescript
<Card>
  <div className="p-6 flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-muted-foreground">Label</p>
      <h3 className="text-2xl font-bold">Valor</h3>
    </div>
    <Icon className="h-4 w-4 text-muted-foreground" />
  </div>
</Card>
```

### Dropdown Actions

```typescript
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <MoreVertical className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem asChild>
      <Link href={`/entities/${id}`}>
        <Pencil className="mr-2 h-4 w-4" />
        Editar
      </Link>
    </DropdownMenuItem>
    <DropdownMenuItem
      onClick={() => handleDelete(id)}
      className="text-destructive"
    >
      <Trash2 className="mr-2 h-4 w-4" />
      Eliminar
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## 🚀 Comandos Útiles

```bash
# Desarrollo
pnpm dev

# Build
pnpm build

# Generar tipos de Supabase
pnpm supabase gen types typescript --project-id "ref" > lib/supabase/database.types.ts

# Agregar componentes shadcn
pnpm dlx shadcn@latest add [component]

# Instalar dependencias
pnpm install

# Limpiar
pnpm clean
```

---

## ⚙️ Variables de Entorno

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 📝 Notas Importantes

### NO usar Prisma

- ✅ Usar cliente directo de Supabase
- ✅ Tipos generados desde Supabase
- ❌ NO instalar Prisma

### RLS Deshabilitado

- Seguridad manejada en código
- Middleware protege rutas
- Validar autenticación en server components

### Nomenclatura

- Componentes: kebab-case
- Funciones: camelCase
- Tipos: PascalCase
- Constantes: UPPER_SNAKE_CASE

### Responsive

- Mobile-first approach
- Breakpoints: sm(640), md(768), lg(1024), xl(1280)
- Sidebar oculto en móvil

### Estado y Carga

- Siempre mostrar loading states
- Siempre manejar empty states
- Siempre capturar errores con try-catch
- Usar toasts para feedback (sonner)

---

## 🎯 Estado de Desarrollo

### ✅ Módulos Completados

1. **Autenticación** - Login, registro, recuperación
2. **Productos** - CRUD, stock por ubicación, precios
3. **Clientes** - CRUD, info fiscal, direcciones
4. **Proveedores** - CRUD, info fiscal, comercial
5. **Ventas** - POS, listado, detalle, notas de crédito, cambios
6. **Turnos de Caja** - Apertura, cierre, arqueo, movimientos
7. **Compras** - CRUD, stock, duplicar, eliminar, adjuntos

### 🔨 En Desarrollo

- Pagos a proveedores
- Órdenes de compra

### 📋 Pendientes

- Cobranzas
- Transferencias de stock
- Reportes
- Facturación ARCA/AFIP
- Dashboard con métricas

---

## 🐛 Debugging

### Errores Comunes

**Error de Supabase Auth:**

```typescript
// Verificar que el usuario esté autenticado
const {
  data: { user },
} = await supabase.auth.getUser();
if (!user) redirect("/auth/login");
```

**Error de Tipos:**

```bash
# Regenerar tipos de Supabase
pnpm supabase gen types typescript --project-id "ref" > lib/supabase/database.types.ts
```

**Error de shadcn:**

```bash
# Verificar configuración en components.json
# Style debe ser "new-york"
# Base color debe ser "zinc"
```

**Error de relaciones en Supabase (406):**

```typescript
// ❌ Evitar relaciones anidadas en queries
.select(`*, relation(*, nested_relation(*))`)

// ✅ Usar relaciones planas
.select(`*, relation(id, name, other_field)`)
```

---

## 📚 Referencias

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Zod](https://zod.dev)
- [React Hook Form](https://react-hook-form.com)

---

**Última actualización:** Enero 2026
**Versión:** 0.2.0 (MVP con Compras)

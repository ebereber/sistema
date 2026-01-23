# Tarea: Implementar Módulo de Medios de Pago - `/configuracion/medios-de-pago`

## Contexto del Proyecto

Sistema POS Lemar - Next.js 16, TypeScript, Supabase, shadcn/ui (New York style)

**IMPORTANTE:** Lee primero el archivo `claude.md` en la raíz del proyecto para entender convenciones, estructura y patrones de código.

---

## Alcance de esta Tarea

**IMPLEMENTAR:**
✅ Tabla `payment_methods` en Supabase con seed data
✅ Pantalla `/configuracion/medios-de-pago` con tabla
✅ CRUD completo (Crear, Editar, Eliminar)
✅ Dialog de 2 pasos (selección tipo → formulario)
✅ Búsqueda con debounce
✅ Validaciones con Zod
✅ Protección de métodos del sistema

---

## 1. SCHEMA DE SUPABASE

### Tablas ya creadas en supabase:

```sql
-- =====================================================
-- TABLA: payment_methods
-- =====================================================

create table public.payment_methods (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  type text not null check (type in ('EFECTIVO', 'CHEQUE', 'TARJETA', 'TRANSFERENCIA', 'OTRO')),
  icon text not null,  -- Nombre del icono de lucide-react
  fee_percentage numeric(5, 2) default 0 not null check (fee_percentage >= 0 and fee_percentage <= 100),
  fee_fixed numeric(10, 2) default 0 not null check (fee_fixed >= 0),
  requires_reference boolean default false not null,
  availability text not null default 'VENTAS_Y_COMPRAS' check (availability in ('VENTAS', 'COMPRAS', 'VENTAS_Y_COMPRAS')),
  is_active boolean default true not null,
  is_system boolean default false not null,  -- true = no se puede eliminar
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Trigger para updated_at
create trigger update_payment_methods_updated_at
  before update on payment_methods
  for each row
  execute function update_updated_at_column();

-- Índices
create index idx_payment_methods_type on payment_methods(type);
create index idx_payment_methods_active on payment_methods(is_active);
create index idx_payment_methods_availability on payment_methods(availability);

-- =====================================================
-- SEED DATA: Métodos de pago básicos
-- =====================================================

INSERT INTO payment_methods (name, type, icon, fee_percentage, fee_fixed, requires_reference, availability, is_system) VALUES
('Efectivo', 'EFECTIVO', 'Banknote', 0, 0, false, 'VENTAS_Y_COMPRAS', true),
('QR', 'TRANSFERENCIA', 'Smartphone', 1, 0, false, 'VENTAS_Y_COMPRAS', true),
('Tarjeta', 'TARJETA', 'CreditCard', 2, 0, false, 'VENTAS_Y_COMPRAS', true),
('Transferencia', 'TRANSFERENCIA', 'Building2', 0, 0, true, 'VENTAS_Y_COMPRAS', true);
```

---

## 2. ESTRUCTURA DE ARCHIVOS

```
app/(dashboard)/configuracion/medios-de-pago/
├── page.tsx                          # Página principal
└── _components/
    ├── payment-methods-table.tsx     # Tabla con búsqueda
    ├── type-selector-dialog.tsx      # Dialog paso 1: selección de tipo
    ├── payment-method-form-dialog.tsx # Dialog paso 2: formulario
    └── delete-confirmation-dialog.tsx # Confirmación de eliminación

lib/services/
└── payment-methods.ts                # Funciones CRUD

lib/validations/
└── payment-method.ts                 # Schemas de Zod

types/
└── payment-method.ts                 # TypeScript interfaces
```

---

## 3. TIPOS E INTERFACES

### Archivo: `types/payment-method.ts`

```typescript
export type PaymentMethodType =
  | "EFECTIVO"
  | "CHEQUE"
  | "TARJETA"
  | "TRANSFERENCIA"
  | "OTRO";

export type PaymentMethodAvailability =
  | "VENTAS"
  | "COMPRAS"
  | "VENTAS_Y_COMPRAS";

export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  icon: string; // Nombre del icono de lucide-react
  fee_percentage: number;
  fee_fixed: number;
  requires_reference: boolean;
  availability: PaymentMethodAvailability;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export type PaymentMethodInsert = Omit<
  PaymentMethod,
  "id" | "created_at" | "updated_at"
>;
export type PaymentMethodUpdate = Partial<PaymentMethodInsert>;

// Mapeo de tipos a iconos
export const PAYMENT_TYPE_CONFIG = {
  EFECTIVO: {
    icon: "Banknote",
    label: "Efectivo",
    description: "Efectivo en pesos o dólares",
  },
  CHEQUE: {
    icon: "FileCheck",
    label: "Cheque",
    description: "Cheques propios o de terceros",
  },
  TARJETA: {
    icon: "CreditCard",
    label: "Tarjeta",
    description:
      "POS o QR de Payway, Clover, u otro que gestione lotes y cupones.",
  },
  TRANSFERENCIA: {
    icon: "Building2",
    label: "Transferencia",
    description: "QR con dinero en cuenta, transferencias, ubicaciones, etc.",
  },
  OTRO: {
    icon: "DollarSign",
    label: "Otro",
    description: "Ej: Gift cards, puntos, cupones.",
  },
} as const;
```

---

## 4. VALIDACIONES CON ZOD

### Archivo: `lib/validations/payment-method.ts`

```typescript
import { z } from "zod";

export const paymentMethodSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100, "El nombre no puede exceder 100 caracteres"),

  type: z.enum(["EFECTIVO", "CHEQUE", "TARJETA", "TRANSFERENCIA", "OTRO"], {
    required_error: "Selecciona un tipo de medio de pago",
  }),

  availability: z.enum(["VENTAS", "COMPRAS", "VENTAS_Y_COMPRAS"], {
    required_error: "Selecciona la disponibilidad",
  }),

  fee_percentage: z.coerce
    .number()
    .min(0, "La comisión no puede ser negativa")
    .max(100, "La comisión no puede exceder 100%")
    .default(0),

  fee_fixed: z.coerce
    .number()
    .min(0, "La comisión fija no puede ser negativa")
    .default(0),

  requires_reference: z.boolean().default(false),

  is_active: z.boolean().default(true),
});

export type PaymentMethodFormData = z.infer<typeof paymentMethodSchema>;
```

---

## 5. SERVICIOS (CRUD)

### Archivo: `lib/services/payment-methods.ts`

```typescript
import { createClient } from "@/lib/supabase/client";
import type {
  PaymentMethod,
  PaymentMethodInsert,
  PaymentMethodUpdate,
} from "@/types/payment-method";

/**
 * Get all payment methods
 */
export async function getPaymentMethods(filters?: {
  search?: string;
  isActive?: boolean;
}): Promise<PaymentMethod[]> {
  const supabase = createClient();

  let query = supabase
    .from("payment_methods")
    .select("*")
    .order("is_system", { ascending: false })
    .order("name", { ascending: true });

  if (filters?.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }

  if (filters?.isActive !== undefined) {
    query = query.eq("is_active", filters.isActive);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Get payment method by ID
 */
export async function getPaymentMethodById(id: string): Promise<PaymentMethod> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create payment method
 */
export async function createPaymentMethod(
  paymentMethod: PaymentMethodInsert,
): Promise<PaymentMethod> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("payment_methods")
    .insert(paymentMethod)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update payment method
 */
export async function updatePaymentMethod(
  id: string,
  updates: PaymentMethodUpdate,
): Promise<PaymentMethod> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("payment_methods")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete payment method
 */
export async function deletePaymentMethod(id: string): Promise<void> {
  const supabase = createClient();

  // Verificar si es del sistema
  const { data: method } = await supabase
    .from("payment_methods")
    .select("is_system")
    .eq("id", id)
    .single();

  if (method?.is_system) {
    throw new Error("No se puede eliminar un método de pago del sistema");
  }

  const { error } = await supabase
    .from("payment_methods")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * Format fee for display
 */
export function formatFee(feePercentage: number, feeFixed: number): string {
  const hasPercentage = feePercentage > 0;
  const hasFixed = feeFixed > 0;

  if (!hasPercentage && !hasFixed) return "Sin costo";
  if (hasPercentage && !hasFixed) return `${feePercentage}%`;
  if (!hasPercentage && hasFixed) return `$${feeFixed.toFixed(2)}`;
  return `${feePercentage}% + $${feeFixed.toFixed(2)}`;
}
```

---

## 6. PÁGINA PRINCIPAL

### Archivo: `app/(dashboard)/configuracion/medios-de-pago/page.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search } from 'lucide-react'
import { PaymentMethodsTable } from './_components/payment-methods-table'
import { TypeSelectorDialog } from './_components/type-selector-dialog'
import { useDebounce } from '@/hooks/use-debounce'
import { getPaymentMethods } from '@/lib/services/payment-methods'
import type { PaymentMethod, PaymentMethodType } from '@/types/payment-method'
import { toast } from 'sonner'

export default function MediosDePagoPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeSelectorOpen, setTypeSelectorOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<PaymentMethodType | null>(null)
  const [formDialogOpen, setFormDialogOpen] = useState(false)

  const debouncedSearch = useDebounce(search, 300)

  // Load payment methods
  useEffect(() => {
    loadPaymentMethods()
  }, [debouncedSearch])

  async function loadPaymentMethods() {
    setIsLoading(true)
    try {
      const data = await getPaymentMethods({
        search: debouncedSearch || undefined
      })
      setPaymentMethods(data)
    } catch (error) {
      toast.error('Error al cargar medios de pago')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle type selection (Paso 1)
  function handleTypeSelect(type: PaymentMethodType) {
    setSelectedType(type)
    setTypeSelectorOpen(false)
    setFormDialogOpen(true)
  }

  // Handle keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          setTypeSelectorOpen(true)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Medios de Pago</h1>
        <p className="text-muted-foreground">
          Configura los medios de pago disponibles para ventas y compras
        </p>
      </div>

      {/* Search and Create */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre de medio de pago..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Button onClick={() => setTypeSelectorOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Medio de Pago
          <kbd className="ml-2 hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground sm:inline-block">
            N
          </kbd>
        </Button>
      </div>

      {/* Table */}
      <PaymentMethodsTable
        paymentMethods={paymentMethods}
        isLoading={isLoading}
        onRefresh={loadPaymentMethods}
      />

      {/* Type Selector Dialog (Paso 1) */}
      <TypeSelectorDialog
        open={typeSelectorOpen}
        onOpenChange={setTypeSelectorOpen}
        onTypeSelect={handleTypeSelect}
      />

      {/* Form Dialog (Paso 2) */}
      {/* Se implementa en el siguiente componente */}
    </div>
  )
}
```

---

## 7. COMPONENTE: TABLA

### Archivo: `app/(dashboard)/configuracion/medios-de-pago/_components/payment-methods-table.tsx`

**Estructura:**

- Usar `<Table>` de shadcn/ui
- Columnas: Nombre (con icono), Comisión, Referencia, Disponibilidad, Menú
- Icono en círculo gris claro
- Badge para disponibilidad
- Dropdown con opciones Editar/Eliminar
- Si `is_system = true`, no mostrar opción Eliminar

**Funcionalidades:**

- Mostrar loading skeleton
- Empty state si no hay resultados
- Formatear comisión con `formatFee()`
- Al editar, abrir el form dialog con datos pre-cargados
- Al eliminar, abrir dialog de confirmación

---

## 8. COMPONENTE: TYPE SELECTOR (Paso 1)

### Archivo: `app/(dashboard)/configuracion/medios-de-pago/_components/type-selector-dialog.tsx`

**Estructura:**

- Dialog con título "Agregar Medio de Pago"
- 5 botones en lista vertical (uno por tipo)
- Cada botón tiene:
  - Icono en círculo gris claro a la izquierda
  - Nombre en bold
  - Descripción en gris
  - ChevronRight a la derecha
- Al hacer click, llama `onTypeSelect(type)` y cierra el dialog

**Código base:**

```typescript
'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'
import { PAYMENT_TYPE_CONFIG } from '@/types/payment-method'
import type { PaymentMethodType } from '@/types/payment-method'
import * as Icons from 'lucide-react'

interface TypeSelectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTypeSelect: (type: PaymentMethodType) => void
}

export function TypeSelectorDialog({
  open,
  onOpenChange,
  onTypeSelect
}: TypeSelectorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar Medio de Pago</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {Object.entries(PAYMENT_TYPE_CONFIG).map(([type, config]) => {
            const Icon = Icons[config.icon as keyof typeof Icons] as any

            return (
              <Button
                key={type}
                variant="ghost"
                className="w-full justify-start h-auto py-4"
                onClick={() => onTypeSelect(type as PaymentMethodType)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold">{config.label}</p>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 9. COMPONENTE: FORMULARIO (Paso 2)

### Archivo: `app/(dashboard)/configuracion/medios-de-pago/_components/payment-method-form-dialog.tsx`

**Estructura:**

- Dialog con título "Agregar Medio de Pago" o "Editar Medio de Pago"
- Form con react-hook-form + Zod
- Campos:
  - **Nombre** (Input requerido)
  - **Tipo** (Select, disabled si is_system o en modo crear)
  - **Disponibilidad** (Select)
  - **Comisión (%)** (Input number)
  - **Comisión Fija ($)** (Input number)
  - **Requiere Referencia** (Switch)
- Footer:
  - Botón "Atrás" (volver al type selector solo en modo crear)
  - Botón "Crear/Actualizar"

**Props:**

```typescript
interface PaymentMethodFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: PaymentMethodType; // Tipo seleccionado en paso 1
  paymentMethod?: PaymentMethod; // Si viene, es edición
  onSuccess: () => void;
  onBack?: () => void; // Solo en modo crear
}
```

**Lógica:**

- Si `paymentMethod` existe → modo edición
- Si no existe → modo crear
- Al guardar, llamar `createPaymentMethod` o `updatePaymentMethod`
- Mostrar toast de éxito/error
- Llamar `onSuccess()` para recargar la tabla

---

## 10. COMPONENTE: CONFIRMACIÓN ELIMINAR

### Archivo: `app/(dashboard)/configuracion/medios-de-pago/_components/delete-confirmation-dialog.tsx`

**Estructura:**

- AlertDialog de shadcn/ui
- Título: "¿Eliminar medio de pago?"
- Descripción: "Esta acción no se puede deshacer. El medio de pago '{nombre}' será eliminado permanentemente."
- Botones: Cancelar, Eliminar (variant="destructive")

**Lógica:**

- Llamar `deletePaymentMethod(id)`
- Si es del sistema, mostrar error
- Toast de éxito/error
- Recargar tabla

---

## 11. REGLAS DE NEGOCIO

1. **Métodos del sistema** (`is_system = true`):
   - NO se pueden eliminar
   - Se PUEDE editar nombre, comisiones, disponibilidad, etc.
   - En el dropdown, no mostrar opción "Eliminar"

2. **Iconos**:
   - Se asignan automáticamente según el tipo
   - No son editables por el usuario
   - Se obtienen de `PAYMENT_TYPE_CONFIG`

3. **Validaciones**:
   - Nombre: requerido, máximo 100 caracteres
   - Comisión %: 0-100
   - Comisión fija: >= 0
   - Al menos una puede ser 0

4. **Formato de comisión en tabla**:
   - Ambas 0: "Sin costo"
   - Solo %: "2%"
   - Solo fija: "$100"
   - Ambas: "2% + $100"

5. **Búsqueda**:
   - Filtrar por nombre (case insensitive)
   - Debounce de 300ms

---

## 12. ESTILOS Y UI

### Badges de disponibilidad:

```typescript
const availabilityVariants = {
  VENTAS: "default",
  COMPRAS: "secondary",
  VENTAS_Y_COMPRAS: "outline",
};

const availabilityLabels = {
  VENTAS: "Ventas",
  COMPRAS: "Compras",
  VENTAS_Y_COMPRAS: "Ventas y Compras",
};
```

### Icono con círculo gris:

```typescript
<div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
  <Icon className="h-5 w-5" />
</div>
```

---

## 13. TESTING CHECKLIST

✅ Crear nuevo método de pago (flujo completo de 2 pasos)
✅ Editar método existente
✅ Eliminar método propio (no del sistema)
✅ Intentar eliminar método del sistema (debe mostrar error)
✅ Búsqueda funciona con debounce
✅ Validaciones de formulario funcionan
✅ Comisiones se formatean correctamente en tabla
✅ Keyboard shortcut "N" abre el type selector
✅ Toast notifications se muestran correctamente
✅ Loading states funcionan

---

## Criterios de Éxito

✅ Tabla muestra 4 métodos del sistema por defecto
✅ Se pueden crear métodos personalizados
✅ Se pueden editar todos los campos excepto tipo (en sistema)
✅ No se pueden eliminar métodos del sistema
✅ Búsqueda filtra por nombre
✅ Comisiones se muestran formateadas
✅ Iconos se asignan automáticamente según tipo
✅ UI coincide con el diseño de las imágenes
✅ Validaciones funcionan correctamente
✅ Responsive design

---

**¡RECUERDA!** Lee `claude.md` para convenciones del proyecto.

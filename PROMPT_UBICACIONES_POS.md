# Tarea: Implementar Módulos de Ubicaciones y Puntos de Venta

## Contexto del Proyecto

Sistema POS Lemar - Next.js 16, TypeScript, Supabase, shadcn/ui (New York style)

**IMPORTANTE:** Lee primero el archivo `claude.md` en la raíz del proyecto para entender convenciones, estructura y patrones de código.

---

## Base de Datos

### Tablas (YA EXISTEN)

**1. locations:**
```sql
CREATE TABLE public.locations (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  address text,
  is_main boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamp,
  updated_at timestamp
);
```

**2. point_of_sale:**
```sql
CREATE TABLE public.point_of_sale (
  id uuid PRIMARY KEY,
  number integer NOT NULL UNIQUE,
  name text NOT NULL,
  is_digital boolean DEFAULT false,
  location_id uuid REFERENCES locations(id),
  enabled_for_arca boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamp,
  updated_at timestamp
);
```

**Constraint importante:**
- Si `is_digital = false` → `location_id` es REQUERIDO
- Si `is_digital = true` → `location_id` debe ser NULL (no tiene ubicación física)

**Regla de asignación:**
- Un punto de venta puede estar en UNA sola ubicación (o ninguna si es digital)
- Una ubicación puede tener MÚLTIPLES puntos de venta

---

## Estructura de Archivos a Crear

```
app/(dashboard)/configuracion/
├── ubicaciones/
│   └── page.tsx                    # Cards con tabs (CREAR)
└── puntos-de-venta/
    └── page.tsx                    # Tabla de POS (CREAR)

components/configuracion/
├── location-sheet.tsx              # Sheet agregar/editar ubicación (CREAR)
├── location-card.tsx               # Card de ubicación con secciones (CREAR)
├── assign-pos-dialog.tsx           # Dialog asignar POS a ubicación (CREAR)
├── pos-sheet.tsx                   # Sheet agregar/editar POS (CREAR)
└── pos-table.tsx                   # Tabla de POS (CREAR)

lib/services/
├── locations.ts                    # CRUD ubicaciones (CREAR)
└── point-of-sale.ts                # CRUD puntos de venta (CREAR)

lib/validations/
├── location.ts                     # Schemas (CREAR)
└── point-of-sale.ts                # Schemas (CREAR)
```

---

## MÓDULO 1: PUNTOS DE VENTA

### Página: `/configuracion/puntos-de-venta`

**Archivo:** `app/(dashboard)/configuracion/puntos-de-venta/page.tsx`

**Layout visual:**
```
┌────────────────────────────────────────────────────────────┐
│ Puntos de Venta                    [+ Agregar POS (N)]     │
├────────────────────────────────────────────────────────────┤
│ Número  Nombre    Estado   ARCA    Acciones                │
│ ──────────────────────────────────────────────────────     │
│ 1       Ejemplo   Activo   No      [⋮]                     │
│ 4       E-comm    Activo   No      [⋮]                     │
└────────────────────────────────────────────────────────────┘
```

**Funcionalidades:**

1. **Header:**
   - H1: "Puntos de Venta"
   - Botón "Agregar punto de venta" (primary, ícono Plus, badge "N")

2. **Tabla:**
   - Columnas: Número | Nombre | Estado | Habilitado para ARCA | Acciones
   - Número: `number` (ej: "1", "4")
   - Nombre: `name` (font-medium)
   - Estado: Badge "Activo" / "Inactivo" (`active`)
   - ARCA: Badge "Sí" / "No" (`enabled_for_arca`)
   - Acciones (DropdownMenu):
     - Editar (Pencil)
     - Eliminar (Trash2, destructive) → AlertDialog

3. **Estados:**
   - Loading: Skeleton
   - Empty: "No hay puntos de venta creados" + botón
   - Error: Mensaje + "Reintentar"

---

### Sheet: Crear/Editar Punto de Venta

**Componente:** `components/configuracion/pos-sheet.tsx`

**Props:**
```typescript
interface POSSheetProps {
  mode: 'create' | 'edit'
  posId?: string
  onSuccess?: (pos: PointOfSale) => void
}
```

**Layout:**
```
┌────────────────────────────────────────────┐
│ Agregar Punto de Venta                  [X]│
├────────────────────────────────────────────┤
│ Número *                                   │
│ [Ingresá el número]                        │
│                                            │
│ Nombre *                                   │
│ [Principal]                                │
│                                            │
│ ☑ Punto de venta digital (no físico)      │
│ Para ventas online o e-commerce           │
│                                            │
│ Ubicación *                                │
│ [Seleccioná una ubicación ▼]              │
│                                            │
│ ☐ Usar para facturación electrónica...    │
│                                            │
│              [Cancelar] [Crear POS]        │
└────────────────────────────────────────────┘
```

**Campos:**

1. **Número** (Input number, requerido):
   - Placeholder: "Ingresá el número"
   - Min: 1
   - Único (validar)

2. **Nombre** (Input text, requerido):
   - Placeholder: "Principal"

3. **Checkbox: Punto de venta digital**
   - Label: "Punto de venta digital (no físico)"
   - Descripción: "Para ventas online o e-commerce"
   - **LÓGICA IMPORTANTE:**
     - ✅ Si checked → Ocultar campo "Ubicación"
     - ❌ Si unchecked → Mostrar campo "Ubicación" (requerido)

4. **Ubicación** (Select, condicional):
   - **Solo visible si NO es digital**
   - Placeholder: "Seleccioná una ubicación"
   - Query: `SELECT id, name FROM locations WHERE active = true`
   - Requerido si visible

5. **Checkbox: ARCA**
   - Label: "Usar para facturación electrónica en ARCA"

**Validaciones:**
- Número único
- Si no es digital → ubicación requerida
- Si es digital → ubicación debe ser NULL

---

## MÓDULO 2: UBICACIONES

### Página: `/configuracion/ubicaciones`

**Archivo:** `app/(dashboard)/configuracion/ubicaciones/page.tsx`

**Layout visual:**
```
┌────────────────────────────────────────────────────────────┐
│ [Ubicaciones] [Terminales] [Cajas]                         │
├────────────────────────────────────────────────────────────┤
│                                   [+ Agregar ubicación (N)]│
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 🏪 Principal             [Por defecto]            [⋮]  ││
│ │                                                         ││
│ │ > 🏬 Puntos de venta (2)                    [+ Agregar] ││
│ │   #00001 · Ejemplo                                      ││
│ │   #00004 · Punto de Venta                               ││
│ │                                                         ││
│ │ > 👥 Sin colaboradores asignados            [+ Agregar] ││
│ │                                                         ││
│ │ > 💰 Cajas (1)                              [+ Agregar] ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 🏪 Deposito                                        [⋮]  ││
│ │                                                         ││
│ │ > 🏬 Sin puntos de venta asignados          [+ Agregar] ││
│ │ > 👥 Sin colaboradores asignados            [+ Agregar] ││
│ │ > 💰 Sin cajas asignadas                    [+ Agregar] ││
│ └─────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────┘
```

**Funcionalidades:**

1. **Tabs:**
   - Ubicaciones (activo)
   - Terminales (disabled, futuro)
   - Cajas (disabled, futuro)

2. **Header:**
   - Botón "Agregar ubicación" (primary, ícono Plus, badge "N")

3. **Cards de Ubicaciones:**
   
   **Card Header:**
   - Ícono Store
   - Nombre de ubicación (H3, bold)
   - Badge "Por defecto" (si `is_main = true`)
   - Dropdown actions (⋮):
     - Archivar (destructive)
     - Eliminar (destructive) → AlertDialog

   **Secciones Colapsables:**

   a) **Puntos de venta:**
   - Header:
     - Ícono Store
     - "Puntos de venta" + Badge con cantidad
     - Botón "+ Agregar"
     - Ícono ChevronDown (expandir/colapsar)
   - Contenido:
     - Lista: `#{number} · {name}`
     - Si vacío: "Sin puntos de venta asignados" (gris)

   b) **Colaboradores:**
   - Header:
     - Ícono Users
     - "Sin colaboradores asignados" (gris, no colapsable)
     - Botón "+ Agregar" (disabled, futuro)

   c) **Cajas:**
   - Header:
     - Ícono CashRegister
     - "Cajas" + Badge con cantidad
     - Botón "+ Agregar" (disabled, futuro)
     - Ícono ChevronDown

---

### Sheet: Crear/Editar Ubicación

**Componente:** `components/configuracion/location-sheet.tsx`

**Layout:**
```
┌────────────────────────────────────────────┐
│ Agregar Ubicación                       [X]│
├────────────────────────────────────────────┤
│ Nombre *                                   │
│ [Ubicación Principal]                      │
│                                            │
│ Dirección                                  │
│ [Dirección de la ubicación...]             │
│                                            │
│ ☐ Ubicación por defecto                   │
│ Esta ubicación se usará por defecto...    │
│                                            │
│              [Cancelar] [Crear Ubicación]  │
└────────────────────────────────────────────┘
```

**Campos:**

1. **Nombre** (Input, requerido):
   - Placeholder: "Ubicación Principal"

2. **Dirección** (Textarea, opcional):
   - Placeholder: "Dirección de la ubicación..."
   - Rows: 3

3. **Checkbox: Por defecto**
   - Label: "Ubicación por defecto"
   - Descripción: "Esta ubicación se usará por defecto en nuevas operaciones"
   - **LÓGICA:** Solo puede haber UNA ubicación con `is_main = true`
   - Si se marca nueva → desmarcar la anterior automáticamente

---

### Dialog: Asignar Punto de Venta a Ubicación

**Componente:** `components/configuracion/assign-pos-dialog.tsx`

**Se abre desde:** Botón "+ Agregar" en sección "Puntos de venta" de una ubicación

**Lógica de asignación:**

```
CASO 1 - Punto de venta SIN asignar:
- Mostrar en lista disponible
- Click → Asignar directamente (sin diálogo de reasignación)

CASO 2 - Punto de venta YA asignado a otra ubicación:
- Mostrar en sección "Asignados a otra ubicación"
- Mostrar: "#00001 · Ejemplo · Actualmente en Deposito"
- Click → Abrir Dialog de confirmación de reasignación

CASO 3 - TODOS asignados:
- Mostrar: "No hay puntos de venta disponibles para asignar"
- Deshabilitar botón "Aplicar"
```

**Layout:**
```
┌────────────────────────────────────────────┐
│ Asignar Puntos de Venta                 [X]│
├────────────────────────────────────────────┤
│ [🔍 Buscar punto de venta...]              │
│                                            │
│ Disponibles                                │
│ ☐ #00002 · Secundario                     │
│ ☐ #00003 · Online                         │
│                                            │
│ Asignados a otra ubicación                 │
│ ☐ #00001 · Ejemplo                        │
│   Actualmente en Deposito                  │
│                                            │
│              [Limpiar] [Aplicar]           │
└────────────────────────────────────────────┘
```

**Al aplicar con POS de otra ubicación:**

Dialog de confirmación:
```
┌────────────────────────────────────────────┐
│ Reasignar punto de venta                   │
├────────────────────────────────────────────┤
│ Los siguientes puntos de venta se          │
│ reasignarán a Principal:                   │
│                                            │
│ • #00001 · Ejemplo                         │
│   Actualmente en Deposito                  │
│                                            │
│              [Cancelar] [Reasignar]        │
└────────────────────────────────────────────┘
```

**Después de confirmar:**
- El POS se quita de ubicación anterior
- Se asigna a nueva ubicación
- Ambas cards se actualizan automáticamente

---

## Servicios

### Archivo: `lib/services/locations.ts`

```typescript
import { createClient } from '@/lib/supabase/client'

// Obtener ubicaciones
async function getLocations(): Promise<Location[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('locations')
    .select(`
      *,
      point_of_sale(id, number, name)
    `)
    .eq('active', true)
    .order('is_main', { ascending: false })
    .order('name')
  
  if (error) throw error
  return data || []
}

// Obtener por ID
async function getLocationById(id: string): Promise<Location> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

// Crear ubicación
async function createLocation(location: LocationInsert): Promise<Location> {
  const supabase = createClient()
  
  // Si is_main = true, desmarcar las demás
  if (location.is_main) {
    await supabase
      .from('locations')
      .update({ is_main: false })
      .eq('is_main', true)
  }
  
  const { data, error } = await supabase
    .from('locations')
    .insert(location)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Actualizar ubicación
async function updateLocation(id: string, location: LocationUpdate): Promise<Location> {
  const supabase = createClient()
  
  // Si is_main = true, desmarcar las demás
  if (location.is_main) {
    await supabase
      .from('locations')
      .update({ is_main: false })
      .eq('is_main', true)
      .neq('id', id)
  }
  
  const { data, error } = await supabase
    .from('locations')
    .update(location)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Archivar ubicación
async function archiveLocation(id: string): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('locations')
    .update({ active: false })
    .eq('id', id)
  
  if (error) throw error
}

// Eliminar ubicación
async function deleteLocation(id: string): Promise<void> {
  const supabase = createClient()
  
  // Verificar que no tenga puntos de venta
  const { data: pos, error: checkError } = await supabase
    .from('point_of_sale')
    .select('id')
    .eq('location_id', id)
    .limit(1)
  
  if (checkError) throw checkError
  
  if (pos && pos.length > 0) {
    throw new Error('No se puede eliminar una ubicación con puntos de venta asignados')
  }
  
  const { error } = await supabase
    .from('locations')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}
```

---

### Archivo: `lib/services/point-of-sale.ts`

```typescript
import { createClient } from '@/lib/supabase/client'

// Obtener puntos de venta
async function getPointsOfSale(): Promise<PointOfSale[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('point_of_sale')
    .select(`
      *,
      location:locations(id, name)
    `)
    .eq('active', true)
    .order('number')
  
  if (error) throw error
  return data || []
}

// Obtener por ID
async function getPOSById(id: string): Promise<PointOfSale> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('point_of_sale')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

// Crear punto de venta
async function createPOS(pos: POSInsert): Promise<PointOfSale> {
  const supabase = createClient()
  
  // Validar: si no es digital, debe tener ubicación
  if (!pos.is_digital && !pos.location_id) {
    throw new Error('Los puntos de venta físicos deben tener una ubicación asignada')
  }
  
  // Validar: si es digital, no debe tener ubicación
  if (pos.is_digital && pos.location_id) {
    throw new Error('Los puntos de venta digitales no pueden tener ubicación')
  }
  
  const { data, error } = await supabase
    .from('point_of_sale')
    .insert(pos)
    .select()
    .single()
  
  if (error) {
    if (error.code === '23505') {
      throw new Error('Ya existe un punto de venta con ese número')
    }
    throw error
  }
  
  return data
}

// Actualizar punto de venta
async function updatePOS(id: string, pos: POSUpdate): Promise<PointOfSale> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('point_of_sale')
    .update(pos)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Asignar POS a ubicación (reasigna si ya tiene una)
async function assignPOSToLocation(posId: string, locationId: string): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('point_of_sale')
    .update({ location_id: locationId })
    .eq('id', posId)
  
  if (error) throw error
}

// Obtener POS disponibles para asignar a una ubicación
async function getAvailablePOS(currentLocationId?: string): Promise<{
  available: PointOfSale[]
  assignedToOther: Array<PointOfSale & { location: Location }>
}> {
  const supabase = createClient()
  
  const { data: allPOS, error } = await supabase
    .from('point_of_sale')
    .select(`
      *,
      location:locations(id, name)
    `)
    .eq('active', true)
    .eq('is_digital', false)
    .order('number')
  
  if (error) throw error
  
  const available = allPOS?.filter(pos => !pos.location_id) || []
  const assignedToOther = allPOS?.filter(pos => 
    pos.location_id && pos.location_id !== currentLocationId
  ) || []
  
  return { available, assignedToOther }
}

// Eliminar POS
async function deletePOS(id: string): Promise<void> {
  const supabase = createClient()
  
  // TODO: Verificar que no tenga ventas asociadas
  
  const { error } = await supabase
    .from('point_of_sale')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}
```

---

## Validaciones

### `lib/validations/location.ts`

```typescript
import { z } from 'zod'

export const locationSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  address: z.string().optional().nullable(),
  is_main: z.boolean().default(false),
  active: z.boolean().default(true),
})
```

### `lib/validations/point-of-sale.ts`

```typescript
import { z } from 'zod'

export const posSchema = z.object({
  number: z.number().int().min(1, 'El número debe ser mayor a 0'),
  name: z.string().min(1, 'El nombre es requerido'),
  is_digital: z.boolean().default(false),
  location_id: z.string().uuid().optional().nullable(),
  enabled_for_arca: z.boolean().default(false),
  active: z.boolean().default(true),
}).refine(
  (data) => {
    // Si no es digital, debe tener ubicación
    if (!data.is_digital && !data.location_id) return false
    // Si es digital, no debe tener ubicación
    if (data.is_digital && data.location_id) return false
    return true
  },
  {
    message: 'Los puntos de venta físicos deben tener ubicación, los digitales no',
    path: ['location_id'],
  }
)
```

---

## Componentes shadcn/ui Necesarios

Ya deberían estar instalados:
- table, sheet, dialog, alert-dialog, tabs
- select, checkbox, input, textarea, button, badge
- dropdown-menu, form, card, separator

---

## Criterios de Éxito

✅ CRUD de puntos de venta
✅ CRUD de ubicaciones
✅ Checkbox "digital" oculta/muestra ubicación
✅ Solo una ubicación puede ser "por defecto"
✅ Cards de ubicaciones con secciones colapsables
✅ Asignar POS a ubicación
✅ Reasignar POS (quita de anterior)
✅ Validar: no eliminar ubicación con POS asignados
✅ Validar: número de POS único
✅ Dialog de confirmación al reasignar
✅ Estados: disponibles vs asignados a otra ubicación
✅ Búsqueda de POS en dialog de asignación
✅ Toasts de feedback
✅ Loading/Empty states

---

## Notas Importantes

- **NO** usar Prisma, solo Supabase
- Solo UNA ubicación puede tener `is_main = true`
- POS físicos deben tener `location_id`
- POS digitales NO deben tener `location_id`
- Un POS solo puede estar en UNA ubicación
- Al reasignar, quitar de ubicación anterior automáticamente
- Tabs de Terminales y Cajas disabled (futuro)
- Sección de Colaboradores muestra estado vacío (futuro)
- Componentes en kebab-case
- Mensajes en español
- Mantener estilo New York

---

## Prioridad de Implementación

1. ✅ Servicios y validaciones (ambos módulos)
2. ✅ CRUD de Puntos de Venta (página + sheet + tabla)
3. ✅ CRUD de Ubicaciones (página + sheet + cards)
4. ✅ Dialog de asignar POS a ubicación
5. ✅ Lógica de reasignación

---

**¡RECUERDA!** Lee `claude.md` para convenciones del proyecto.

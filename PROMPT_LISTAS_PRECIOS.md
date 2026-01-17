# Tarea: Implementar Módulo de Listas de Precios

## Contexto del Proyecto

Sistema POS Lemar - Next.js 16, TypeScript, Supabase, shadcn/ui (New York style)

**IMPORTANTE:** Lee primero el archivo `claude.md` en la raíz del proyecto para entender convenciones, estructura y patrones de código.

---

## Base de Datos

### Tabla: price_lists (YA EXISTE Y ESTÁ ACTUALIZADA)

```sql
CREATE TABLE public.price_lists (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  description text,
  is_automatic boolean DEFAULT true,
  adjustment_type text DEFAULT 'AUMENTO',
  adjustment_percentage numeric(5, 2) DEFAULT 0,
  includes_tax boolean DEFAULT true,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

**Campos clave:**
- `name` - Nombre de la lista (requerido)
- `is_automatic` - Si es lista automática (true) o manual (false)
- `adjustment_type` - Tipo de ajuste: 'AUMENTO' o 'DESCUENTO'
- `adjustment_percentage` - Porcentaje de ajuste (0-100)
- `includes_tax` - Si los precios incluyen IVA

**Lógica de cálculo:**
```
Precio base: $100
Lista "Mayorista": DESCUENTO 15%
Resultado: $100 - 15% = $85

Precio base: $100
Lista "Premium": AUMENTO 10%
Resultado: $100 + 10% = $110
```

---

## Estructura de Archivos a Crear

```
app/(dashboard)/configuracion/listas-precios/
└── page.tsx                    # Listado de listas de precios (CREAR)

components/configuracion/
├── price-list-dialog.tsx       # Dialog crear/editar (CREAR)
└── price-list-table.tsx        # Tabla de listas (CREAR)

lib/services/
└── price-lists.ts              # CRUD de listas (CREAR)

lib/validations/
└── price-list.ts               # Schemas Zod (CREAR)
```

---

## Página: Listas de Precios

### Archivo: `app/(dashboard)/configuracion/listas-precios/page.tsx`

**Layout visual:**
```
┌────────────────────────────────────────────────────────────┐
│ Listas de Precios              [+ Agregar lista (N)]       │
├────────────────────────────────────────────────────────────┤
│ Nombre     Tipo      Porcentaje   IVA      Acciones        │
│ ────────────────────────────────────────────────────────   │
│ Mayorista  Automática  -15%      Incluido    [⋮]           │
│ Premium    Automática  +10%      Incluido    [⋮]           │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Funcionalidades:**

1. **Header:**
   - H1: "Listas de Precios"
   - Botón "Agregar lista de precios" (primary, ícono Plus, badge "N")

2. **Tabla:**
   - Columnas: Nombre | Tipo de Cálculo | Porcentaje | IVA | Acciones
   - Nombre: `name` (font-medium)
   - Tipo: Badge "Automática" o "Manual"
   - Porcentaje: 
     - Si AUMENTO: "+{porcentaje}%" (color verde)
     - Si DESCUENTO: "-{porcentaje}%" (color rojo)
   - IVA: Badge "Incluido" o "No incluido"
   - Acciones (DropdownMenu):
     - Editar (Pencil) → Abre dialog en modo edición
     - Eliminar (Trash2, text-destructive) → AlertDialog

3. **Estado vacío:**
   - Ícono DollarSign en círculo gris
   - Título: "No hay listas de precios"
   - Subtítulo: "Creá tu primera lista de precios para aplicar descuentos o aumentos automáticos."
   - Botón "Agregar lista de precios"

4. **AlertDialog para eliminar:**
   - Título: "¿Eliminar lista de precios?"
   - Descripción: "Esta acción no se puede deshacer. Los clientes con esta lista asignada quedarán sin lista de precios."
   - Botones: "Cancelar" | "Eliminar" (destructive)

---

## Dialog: Crear/Editar Lista de Precios

### Componente: `components/configuracion/price-list-dialog.tsx`

**Props:**
```typescript
interface PriceListDialogProps {
  mode: 'create' | 'edit'
  priceListId?: string
  trigger?: React.ReactNode
  onSuccess?: (priceList: PriceList) => void
}
```

**Layout visual:**
```
┌──────────────────────────────────────────────────────────┐
│ Agregar Lista de Precios                              [X]│
├──────────────────────────────────────────────────────────┤
│ Nombre                                                   │
│ [Lista de precios mayorista]                             │
│                                                          │
│ ☑ Lista de precios automática                           │
│ Las listas automáticas aplican un porcentaje...         │
│                                                          │
│ Porcentaje de Ajuste                                     │
│ [Descuento ▼] [15] %                                     │
│                                                          │
│ ☑ Precios con IVA incluido                              │
│ Ejemplo: $100 (IVA 21% incluido) = $82,64 + $17,36.     │
│                                                          │
│                          [Cancelar] [Crear Lista]        │
└──────────────────────────────────────────────────────────┘
```

**Secciones:**

1. **Nombre:** (REQUERIDO)
   - Label: "Nombre"
   - Input con placeholder: "Lista de precios mayorista"
   - Validación requerida

2. **Checkbox: Lista automática**
   - Label: "Lista de precios automática"
   - Checked por defecto
   - Descripción: "Las listas automáticas aplican un porcentaje de ajuste sobre el precio base."
   - Si checked → Mostrar sección de Porcentaje
   - Si unchecked → Ocultar sección (para futuro: lista manual)

3. **Porcentaje de Ajuste:** (Solo si automática)
   - Label: "Porcentaje de Ajuste"
   - Fila con 3 elementos:
     - Select de tipo: "Aumento" | "Descuento" (40% ancho)
     - Input numérico: valor del porcentaje (40% ancho)
     - Texto: "%" (20% ancho)
   - Validación: 0-100

4. **Checkbox: IVA incluido**
   - Label: "Precios con IVA incluido"
   - Checked por defecto
   - Descripción: "Ejemplo: $100 (IVA 21% incluido) = $82,64 + $17,36."
   - Si unchecked → Descripción "Ejemplo: $100 + IVA = $121."

5. **Footer:**
   - Botón "Cancelar" (outline)
   - Botón "Crear Lista de Precios" / "Guardar Cambios" (primary)

**Estado interno:**
```typescript
const [isAutomatic, setIsAutomatic] = useState(true)
const [adjustmentType, setAdjustmentType] = useState('AUMENTO')
const [adjustmentPercentage, setAdjustmentPercentage] = useState(0)
const [includesTax, setIncludesTax] = useState(true)
```

---

## Servicios

### Archivo: `lib/services/price-lists.ts`

```typescript
import { createClient } from '@/lib/supabase/client'

// Obtener listas de precios activas
async function getPriceLists(): Promise<PriceList[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('price_lists')
    .select('*')
    .eq('active', true)
    .order('name')
  
  if (error) throw error
  return data || []
}

// Obtener lista por ID
async function getPriceListById(id: string): Promise<PriceList> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('price_lists')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

// Crear lista de precios
async function createPriceList(priceList: PriceListInsert): Promise<PriceList> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('price_lists')
    .insert(priceList)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Actualizar lista de precios
async function updatePriceList(id: string, priceList: PriceListUpdate): Promise<PriceList> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('price_lists')
    .update(priceList)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Eliminar lista de precios
async function deletePriceList(id: string): Promise<void> {
  const supabase = createClient()
  
  // Verificar si tiene clientes asignados
  const { data: customers, error: checkError } = await supabase
    .from('customers')
    .select('id')
    .eq('price_list_id', id)
    .limit(1)
  
  if (checkError) throw checkError
  
  if (customers && customers.length > 0) {
    throw new Error('No se puede eliminar una lista de precios con clientes asignados')
  }
  
  // Si no tiene clientes, eliminar
  const { error } = await supabase
    .from('price_lists')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Calcular precio con lista aplicada
function calculatePriceWithList(
  basePrice: number,
  priceList: PriceList
): number {
  if (!priceList.is_automatic) return basePrice
  
  const percentage = priceList.adjustment_percentage / 100
  
  if (priceList.adjustment_type === 'DESCUENTO') {
    return basePrice * (1 - percentage)
  } else {
    return basePrice * (1 + percentage)
  }
}
```

---

## Validaciones

### Archivo: `lib/validations/price-list.ts`

```typescript
import { z } from 'zod'

export const priceListSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional().nullable(),
  is_automatic: z.boolean().default(true),
  adjustment_type: z.enum(['AUMENTO', 'DESCUENTO']).default('AUMENTO'),
  adjustment_percentage: z.number()
    .min(0, 'El porcentaje debe ser mayor o igual a 0')
    .max(100, 'El porcentaje no puede ser mayor a 100')
    .default(0),
  includes_tax: z.boolean().default(true),
  active: z.boolean().default(true),
})

export type PriceListFormData = z.infer<typeof priceListSchema>
```

---

## Tipos TypeScript

```typescript
import { Database } from '@/lib/supabase/database.types'

type PriceList = Database['public']['Tables']['price_lists']['Row']
type PriceListInsert = Database['public']['Tables']['price_lists']['Insert']
type PriceListUpdate = Database['public']['Tables']['price_lists']['Update']
```

---

## Componentes shadcn/ui Necesarios

Ya deberían estar instalados:
- table, dialog, alert-dialog, select
- input, checkbox, button, badge
- dropdown-menu, form

---

## Actualización en Clientes

**DESPUÉS de crear este módulo:**

En `components/clientes/commercial-info-dialog.tsx`:

```typescript
// ANTES (disabled):
<Select disabled>
  <SelectTrigger>
    <SelectValue placeholder="Disponible próximamente" />
  </SelectTrigger>
</Select>

// DESPUÉS (habilitado):
<FormField
  control={form.control}
  name="price_list_id"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Lista de Precios</FormLabel>
      <Select onValueChange={field.onChange} value={field.value}>
        <SelectTrigger>
          <SelectValue placeholder="Seleccioná una lista..." />
        </SelectTrigger>
        <SelectContent>
          {priceLists.map(list => (
            <SelectItem key={list.id} value={list.id}>
              {list.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormItem>
  )}
/>
```

---

## Criterios de Éxito

✅ Listado de listas de precios
✅ Crear lista con porcentaje de ajuste
✅ Editar lista existente
✅ Eliminar lista (con validación de uso)
✅ Badge de tipo (Automática/Manual)
✅ Badge de IVA (Incluido/No incluido)
✅ Porcentaje con signo (+ ó -)
✅ Estados de loading/empty/error
✅ Validaciones con Zod
✅ Toasts de feedback
✅ Función helper de cálculo de precio

---

## Notas Importantes

- **NO** usar Prisma, solo Supabase client
- Componentes en kebab-case
- Funciones en camelCase
- Mensajes en español
- Mantener estilo New York de shadcn
- Checkbox de "lista automática" checked por defecto
- Si unchecked, ocultar sección de porcentaje (para futuro)
- No permitir eliminar si tiene clientes asignados
- Mostrar porcentaje con signo: "+10%" o "-15%"
- Color verde para aumentos, rojo para descuentos

---

## Prioridad de Implementación

1. ✅ Servicios y validaciones
2. ✅ Dialog de crear/editar
3. ✅ Tabla de listas
4. ✅ Página de listado
5. ⏳ Actualizar dialog de clientes (después)

---

**¡RECUERDA!** Lee `claude.md` para convenciones del proyecto.

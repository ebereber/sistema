# Tarea: Checkout - Parte A - Bugs, DB y Integración con Carrito

## Contexto del Proyecto

Sistema POS Lemar - Next.js 16, TypeScript, Supabase, shadcn/ui (New York style)

**IMPORTANTE:** Lee primero el archivo `claude.md` en la raíz del proyecto para entender convenciones, estructura y patrones de código.

---

## Alcance de esta Tarea

**IMPLEMENTAR:**
✅ Corregir bug de parsing de montos en pago dividido
✅ Integrar checkout con datos del carrito
✅ Guardar venta completa en la base de datos
✅ Generar número de venta automático

**NO IMPLEMENTAR (Parte B):**
❌ Modularizar componentes del checkout
❌ Traer medios de pago desde la DB
❌ Facturación AFIP

---

## 1. PROBLEMA CRÍTICO: Parsing de Montos

### Bug Actual:

Cuando el total es `$4.220,40` y el usuario ingresa `4220,40`, se calcula mal el restante.

**Causa:** El código limpia los puntos (separadores de miles) PERO el usuario puede ingresar el número SIN puntos.

Ejemplo:

- Total: `4220.40` (en sistema)
- Usuario ingresa: `"4220,40"`
- Código limpia: `"4220,40"` → reemplaza coma por punto → `"4220.40"` → `4220.40` ✅
- Usuario ingresa: `"4.220,40"`
- Código limpia: `"4.220,40"` → remueve punto → `"4220,40"` → reemplaza coma → `"4220.40"` ✅

**PERO:**

- Total: `4220.40`
- Usuario ve en pantalla: `$4.220,40` (formateado)
- Usuario ingresa: `4220` (sin decimales)
- Código parsea: `4220` → `4220.00` ✅
- Restante: `4220.40 - 4220.00 = 0.40` ✅ (esto está bien)

**El problema real está en otro lado.** Necesito ver el código de `formatPrice` para entender bien.

### Solución:

Usar una función centralizada para parsear montos argentinos:

```typescript
// lib/utils/currency.ts

/**
 * Parsea un string de monto en formato argentino a número
 * Ejemplos válidos:
 * - "4220,40" → 4220.40
 * - "4.220,40" → 4220.40
 * - "4220" → 4220
 * - "$4.220,40" → 4220.40
 */
export function parseArgentineCurrency(value: string): number {
  if (!value) return 0;

  // Remover símbolos de moneda y espacios
  let cleaned = value.replace(/[$\s]/g, "");

  // Si tiene punto Y coma, asumir formato argentino (punto = miles, coma = decimal)
  if (cleaned.includes(".") && cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  }
  // Si solo tiene coma, asumir que es decimal
  else if (cleaned.includes(",")) {
    cleaned = cleaned.replace(",", ".");
  }
  // Si solo tiene punto, puede ser miles o decimal
  // Heurística: si hay más de un punto, son miles. Si hay uno solo, verificar posición
  else if (cleaned.includes(".")) {
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      // Múltiples puntos = separadores de miles
      cleaned = cleaned.replace(/\./g, "");
    } else if (parts.length === 2) {
      // Un solo punto - verificar si es decimal o miles
      // Si la parte decimal tiene 2 dígitos o menos, es decimal
      // Si tiene más, probablemente sea miles
      if (parts[1].length <= 2) {
        // Asumir decimal (ej: "4220.40")
        // No hacer nada, ya está en formato correcto
      } else {
        // Asumir miles (ej: "4.220")
        cleaned = cleaned.replace(".", "");
      }
    }
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Formatea un número a formato de moneda argentina
 * 4220.40 → "$4.220,40"
 */
export function formatArgentineCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
```

### Aplicar en CheckoutDialog:

```typescript
// Reemplazar esta línea:
const cleanAmount = currentSplitAmount
  .replace(/[$\s]/g, "")
  .replace(/\./g, "")
  .replace(",", ".");

// Por:
const currentAmount = parseArgentineCurrency(currentSplitAmount);

// Y eliminar esta línea (ya no es necesaria):
const currentAmount = parseFloat(cleanCurrentAmount) || 0;
```

---

## 2. SCHEMA DE SUPABASE

### Tablas YA CREADAS:

```sql
-- =====================================================
-- TABLA: sales
-- =====================================================

create table public.sales (
  id uuid default uuid_generate_v4() primary key,
  sale_number text not null unique,  -- Formato: COM-00001-00000001
  customer_id uuid references customers(id) on delete set null,
  seller_id uuid references users(id) on delete set null,
  location_id uuid references locations(id) on delete set null,

  -- Montos
  subtotal numeric(10, 2) not null,
  discount numeric(10, 2) default 0 not null,
  tax numeric(10, 2) not null,
  total numeric(10, 2) not null,

  -- Información adicional
  notes text null,
  status text not null default 'COMPLETED' check (status in ('COMPLETED', 'PENDING', 'CANCELLED')),

  -- Comprobante
  voucher_type text not null default 'COMPROBANTE_X' check (voucher_type in ('COMPROBANTE_X', 'FACTURA_A', 'FACTURA_B', 'FACTURA_C')),

  -- Fechas
  sale_date timestamp with time zone not null default timezone('utc'::text, now()),
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),

  -- Metadata
  created_by uuid references users(id) on delete set null
);

-- Trigger para updated_at
create trigger update_sales_updated_at
  before update on sales
  for each row
  execute function update_updated_at_column();

-- Índices
create index idx_sales_customer on sales(customer_id);
create index idx_sales_seller on sales(seller_id);
create index idx_sales_location on sales(location_id);
create index idx_sales_date on sales(sale_date);
create index idx_sales_status on sales(status);
create index idx_sales_number on sales(sale_number);

-- =====================================================
-- TABLA: sale_items
-- =====================================================

create table public.sale_items (
  id uuid default uuid_generate_v4() primary key,
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid references products(id) on delete set null,

  -- Detalles del producto (guardamos snapshot por si se elimina el producto)
  description text not null,
  sku text null,
  quantity numeric(10, 2) not null,
  unit_price numeric(10, 2) not null,

  -- Descuentos e impuestos
  discount numeric(10, 2) default 0 not null,
  tax_rate numeric(5, 2) default 0 not null,

  -- Total del item
  total numeric(10, 2) not null,

  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- Índices
create index idx_sale_items_sale on sale_items(sale_id);
create index idx_sale_items_product on sale_items(product_id);

-- =====================================================
-- TABLA: payments
-- =====================================================

create table public.payments (
  id uuid default uuid_generate_v4() primary key,
  sale_id uuid not null references sales(id) on delete cascade,
  payment_method_id uuid references payment_methods(id) on delete set null,

  -- Detalles del pago
  method_name text not null,  -- Snapshot del nombre del método
  amount numeric(10, 2) not null,
  reference text null,  -- Número de referencia (cheque, transferencia, etc.)

  payment_date timestamp with time zone not null default timezone('utc'::text, now()),
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- Índices
create index idx_payments_sale on payments(sale_id);
create index idx_payments_method on payments(payment_method_id);
create index idx_payments_date on payments(payment_date);

-- =====================================================
-- FUNCIÓN: Generar número de venta
-- =====================================================

create or replace function generate_sale_number(location_id_param uuid)
returns text
language plpgsql
as $$
declare
  location_code text;
  next_number integer;
  sale_number text;
begin
  -- Obtener código de ubicación (ej: "00001")
  select
    lpad(row_number() over (order by created_at)::text, 5, '0')
  into location_code
  from locations
  where id = location_id_param;

  if location_code is null then
    location_code := '00001';
  end if;

  -- Obtener siguiente número secuencial para esta ubicación
  select coalesce(max(
    substring(sale_number from 'COM-[0-9]+-([0-9]+)')::integer
  ), 0) + 1
  into next_number
  from sales
  where sale_number like 'COM-' || location_code || '-%';

  -- Generar número formato: COM-00001-00000001
  sale_number := 'COM-' || location_code || '-' || lpad(next_number::text, 8, '0');

  return sale_number;
end;
$$;
```

---

## 3. INTEGRACIÓN CON CARRITO

### Modificar `app/(dashboard)/ventas/nueva/page.tsx`:

Agregar estado para abrir el checkout:

```typescript
const [checkoutOpen, setCheckoutOpen] = useState(false)

// Función handleContinue (ya existe, modificar)
const handleContinue = useCallback(() => {
  if (cartItems.length === 0) {
    toast.error("Carrito vacío", {
      description: "Agrega productos al carrito para continuar",
    });
    return;
  }

  // Abrir checkout dialog
  setCheckoutOpen(true)
}, [cartItems.length]);

// Al final del return, agregar:
<CheckoutDialog
  open={checkoutOpen}
  onOpenChange={setCheckoutOpen}
  cartItems={cartItems}
  customer={customer}
  globalDiscount={globalDiscount}
  note={note}
  saleDate={saleDate}
  onSuccess={handleSaleSuccess}
/>

// Nueva función para limpiar después de venta exitosa
function handleSaleSuccess(saleNumber: string) {
  // Limpiar carrito
  setCartItems([])
  setGlobalDiscount(null)
  setNote('')
  setCustomer(DEFAULT_CUSTOMER)

  toast.success(`Venta confirmada: ${saleNumber}`)

  // Cerrar checkout
  setCheckoutOpen(false)
}
```

### Modificar `components/ventas/checkout-dialog.tsx`:

Actualizar las props:

```typescript
interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartItems: CartItem[];
  customer: SelectedCustomer;
  globalDiscount: GlobalDiscount | null;
  note: string;
  saleDate: Date;
  onSuccess: (saleNumber: string) => void;
}

export function CheckoutDialog({
  open,
  onOpenChange,
  cartItems,
  customer,
  globalDiscount,
  note,
  saleDate,
  onSuccess,
}: CheckoutDialogProps) {
  // Calcular totales desde el carrito
  const totals = calculateCartTotals(cartItems, globalDiscount);
  const { subtotal, tax, total } = totals;

  // ... resto del código ...

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);

      // Preparar datos de la venta
      const saleData = {
        customer_id: customer.id === "default" ? null : customer.id,
        subtotal,
        discount: totals.totalDiscounts,
        tax,
        total,
        notes: note || null,
        status: isPending ? "PENDING" : "COMPLETED",
        voucher_type: selectedVoucher,
        sale_date: saleDate.toISOString(),
      };

      // Preparar items
      const items = cartItems.map((item) => ({
        product_id: item.productId,
        description: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unit_price: item.price,
        discount:
          item.discount?.type === "percentage"
            ? (item.price * item.quantity * item.discount.value) / 100
            : item.discount?.value || 0,
        tax_rate: item.taxRate,
        total: calculateItemTotal(item),
      }));

      // Preparar pagos
      const payments =
        currentView === "split-payment"
          ? splitPayments.map((p) => ({
              payment_method_id: p.methodId,
              method_name: p.methodName,
              amount: p.amount,
              reference: p.reference || null,
            }))
          : selectedPaymentMethod
            ? [
                {
                  payment_method_id: selectedPaymentMethod,
                  method_name:
                    paymentMethods.find((m) => m.id === selectedPaymentMethod)
                      ?.name || "",
                  amount: total,
                  reference: null,
                },
              ]
            : [];

      // Guardar venta
      const sale = await createSale(saleData, items, payments);

      setSaleNumber(sale.sale_number);
      setCurrentView("confirmation");

      // Notificar éxito después de mostrar confirmación
      setTimeout(() => {
        onSuccess(sale.sale_number);
      }, 2000);
    } catch (error) {
      console.error("Error al crear venta:", error);
      toast.error("Error al confirmar la venta");
    } finally {
      setIsSubmitting(false);
    }
  };
}
```

---

## 4. SERVICIOS

### Crear `lib/services/sales.ts`:

```typescript
import { createClient } from "@/lib/supabase/client";

export interface SaleInsert {
  customer_id: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes: string | null;
  status: "COMPLETED" | "PENDING" | "CANCELLED";
  voucher_type: string;
  sale_date: string;
}

export interface SaleItemInsert {
  product_id: string | null;
  description: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  total: number;
}

export interface PaymentInsert {
  payment_method_id: string;
  method_name: string;
  amount: number;
  reference: string | null;
}

/**
 * Crear venta completa con items y pagos
 */
export async function createSale(
  saleData: SaleInsert,
  items: SaleItemInsert[],
  payments: PaymentInsert[],
) {
  const supabase = createClient();

  // 1. Generar número de venta
  const { data: saleNumber, error: numberError } = await supabase.rpc(
    "generate_sale_number",
    {
      location_id_param: null, // TODO: obtener de usuario actual
    },
  );

  if (numberError) throw numberError;

  // 2. Crear venta
  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .insert({
      ...saleData,
      sale_number: saleNumber,
      // TODO: obtener de usuario actual
      seller_id: null,
      location_id: null,
      created_by: null,
    })
    .select()
    .single();

  if (saleError) throw saleError;

  // 3. Crear items
  const itemsWithSaleId = items.map((item) => ({
    ...item,
    sale_id: sale.id,
  }));

  const { error: itemsError } = await supabase
    .from("sale_items")
    .insert(itemsWithSaleId);

  if (itemsError) throw itemsError;

  // 4. Crear pagos
  const paymentsWithSaleId = payments.map((payment) => ({
    ...payment,
    sale_id: sale.id,
  }));

  const { error: paymentsError } = await supabase
    .from("payments")
    .insert(paymentsWithSaleId);

  if (paymentsError) throw paymentsError;

  // 5. TODO: Actualizar stock (en otra tarea)

  return sale;
}
```

---

## 5. TIPOS

### Actualizar `types/sale.ts`:

```typescript
export interface Sale {
  id: string;
  sale_number: string;
  customer_id: string | null;
  seller_id: string | null;
  location_id: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes: string | null;
  status: "COMPLETED" | "PENDING" | "CANCELLED";
  voucher_type: string;
  sale_date: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string | null;
  description: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  total: number;
  created_at: string;
}

export interface Payment {
  id: string;
  sale_id: string;
  payment_method_id: string | null;
  method_name: string;
  amount: number;
  reference: string | null;
  payment_date: string;
  created_at: string;
}
```

---

## 6. CORRECCIONES ADICIONALES

### En CheckoutDialog, corregir todas las referencias a `parseArgentineCurrency`:

```typescript
// Importar la función
import {
  parseArgentineCurrency,
  formatArgentineCurrency,
} from "@/lib/utils/currency";

// Reemplazar en handlePaymentMethodClick:
const amount = parseArgentineCurrency(currentSplitAmount);

// Reemplazar el cálculo de currentAmount:
const currentAmount = parseArgentineCurrency(currentSplitAmount);
```

---

## 7. TESTING CHECKLIST

✅ Crear venta con un solo medio de pago
✅ Crear venta con pago dividido (2 métodos)
✅ Crear venta con pago dividido (3+ métodos)
✅ Parsing correcto de montos con comas argentinas
✅ Número de venta se genera correctamente
✅ Venta se guarda en DB con todos los datos
✅ Items se guardan correctamente
✅ Pagos se guardan correctamente
✅ Carrito se limpia después de venta exitosa
✅ Toast de confirmación se muestra
✅ Vista de confirmación muestra número de venta

---

## 8. NOTAS IMPORTANTES

- Por ahora NO implementar actualización de stock (lo haremos después)
- Por ahora `seller_id` y `location_id` son null (cuando implementemos autenticación los llenamos)
- El número de venta se genera automáticamente con formato `COM-00001-00000001`
- Los items guardan un snapshot del producto por si se elimina
- Los pagos guardan el nombre del método por si se elimina

---

## Criterios de Éxito

✅ Bug de parsing de montos corregido
✅ Tabla sales y relacionadas creadas en Supabase
✅ Venta se crea correctamente en DB
✅ Checkout recibe datos del carrito
✅ Número de venta se genera automáticamente
✅ Carrito se limpia después de venta exitosa
✅ Vista de confirmación muestra datos correctos

---

**¡RECUERDA!** Lee `claude.md` para convenciones del proyecto.

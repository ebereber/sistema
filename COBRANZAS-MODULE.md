# Módulo de Cobranzas (Customer Payments)

## Resumen

El módulo de cobranzas gestiona los **Recibos de Cobro (RCB)** que documentan cada evento de cobro vinculado a una venta. Cada vez que se cobra total o parcialmente una venta, se genera un RCB.

---

## Principio fundamental

- La **venta** (COM) es el comprobante de lo que se vendió
- El **recibo** (RCB) es el comprobante de lo que se cobró
- Son documentos separados aunque se generen al mismo tiempo

---

## Tablas de la base de datos

### `customer_payments`
Recibo de cobro principal.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| payment_number | text | Número RCB-XXXXX-XXXXXXXX |
| customer_id | uuid | FK → customers |
| payment_date | timestamptz | Fecha del cobro |
| total_amount | numeric(12,2) | Monto total cobrado |
| notes | text | Notas opcionales |
| status | text | `completed` \| `cancelled` |
| cancelled_at | timestamptz | Fecha de anulación |
| created_by | uuid | FK → users |

### `customer_payment_allocations`
Vincula un RCB con las ventas que cubre.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| customer_payment_id | uuid | FK → customer_payments |
| sale_id | uuid | FK → sales |
| amount | numeric(12,2) | Monto aplicado a esta venta |

### `customer_payment_methods`
Métodos de pago utilizados en el RCB.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| customer_payment_id | uuid | FK → customer_payments |
| payment_method_id | uuid | FK → payment_methods |
| method_name | text | Nombre del método |
| amount | numeric(12,2) | Monto pagado con este método |
| reference | text | Referencia (nro tarjeta, transferencia, etc) |
| cash_register_id | uuid | FK → cash_registers |

### Campos en `sales` relacionados

| Campo | Tipo | Descripción |
|-------|------|-------------|
| amount_paid | numeric(10,2) | Total cobrado hasta el momento |
| due_date | timestamptz | Fecha de vencimiento (ventas pendientes) |
| status | text | `COMPLETED` cuando amount_paid >= total |

---

## Flujos

### 1. Venta con pago completo

```
Checkout → createSale()
  ├── Crea venta (status: COMPLETED, amount_paid: total)
  ├── Crea registros en `payments` (tabla legacy)
  ├── Genera RCB automáticamente
  │   ├── customer_payments (payment_number: RCB-00001-XXXXXXXX)
  │   ├── customer_payment_allocations (vincula RCB → venta, amount: total)
  │   └── customer_payment_methods (métodos de pago usados)
  └── Descuenta stock
```

**Resultado:**
- 1 venta (COM) con status COMPLETED
- 1 recibo (RCB) por el total

### 2. Venta con pago parcial (pendiente)

```
Checkout → createSale()
  ├── Crea venta (status: PENDING, amount_paid: lo pagado)
  ├── Crea registros en `payments` (tabla legacy)
  ├── Genera RCB automáticamente por lo pagado
  └── Descuenta stock
```

**Resultado:**
- 1 venta (COM) con status PENDING y saldo pendiente
- 1 recibo (RCB) por el monto pagado

### 3. Cobro de saldo pendiente

```
/cobranzas/nueva → createCustomerPayment()
  ├── Genera RCB
  ├── Crea allocations (vincula a la venta)
  ├── Crea métodos de pago
  └── Actualiza sale.amount_paid
      └── Si amount_paid >= total → status: COMPLETED
```

**Resultado:**
- Venta actualizada (puede pasar a COMPLETED)
- Nuevo RCB por el saldo cobrado

### 4. Venta 100% pendiente (sin pago)

```
Checkout → createSale()
  ├── Crea venta (status: PENDING, amount_paid: 0)
  ├── NO crea payments
  ├── NO genera RCB (no hay cobro)
  └── Descuenta stock
```

**Resultado:**
- 1 venta (COM) con status PENDING
- 0 recibos (se crean después desde /cobranzas/nueva)

### 5. Exchange (cambio) con pago

```
Checkout → createExchange()
  ├── Crea NC por devoluciones
  ├── Crea nueva venta
  ├── Crea registros en `payments` (tabla legacy)
  ├── Genera RCB automáticamente por lo pagado
  └── Ajusta stock
```

### 6. Anulación de cobranza

```
/cobranzas/[id] → cancelCustomerPayment()
  ├── Revierte amount_paid en cada venta asociada
  ├── Recalcula status de ventas (COMPLETED → PENDING si corresponde)
  └── Marca RCB como cancelled
```

**Nota:** El RCB anulado sigue visible en "Créditos aplicados" pero marcado como anulado. No se eliminan registros para mantener trazabilidad.

---

## Relación entre RCBs (Créditos aplicados)

Cuando una venta tiene múltiples RCBs, cada uno muestra los demás como "Créditos aplicados":

```
Venta COM-00001-00000065 ($7,700)
  ├── RCB-00001-00000011 ($4,700) - pago inicial
  └── RCB-00001-00000012 ($3,000) - cobro de saldo

En el detalle de RCB-00001-00000011:
  Comprobantes cobrados: COM-00001-00000065 → Aplicado: $4,700 | Saldo: $0
  Créditos aplicados: RCB-00001-00000012 → $3,000

En el detalle de RCB-00001-00000012:
  Comprobantes cobrados: COM-00001-00000065 → Aplicado: $3,000 | Saldo: $0
  Créditos aplicados: RCB-00001-00000011 → $4,700
```

El "Saldo venta" siempre muestra el saldo **actual** de la venta, no el saldo al momento del cobro.

---

## Archivos del módulo

### Servicio
- `lib/services/customer-payments.ts` — Toda la lógica de negocio

### Páginas
- `app/(dashboard)/cobranzas/page.tsx` — Listado con filtros y paginación
- `app/(dashboard)/cobranzas/nueva/page.tsx` — Crear cobranza (soporta `?saleId=xxx`)
- `app/(dashboard)/cobranzas/[id]/page.tsx` — Detalle con anulación y notas

### Integración con ventas
- `lib/services/sales.ts` → `createSale()` genera RCB automáticamente (paso 5.5)
- `lib/services/sales.ts` → `createExchange()` genera RCB automáticamente
- `lib/services/sales.ts` → `getSaleById()` carga RCBs via `getPaymentsBySaleId()`
- `app/(dashboard)/ventas/[id]/page.tsx` — Muestra RCBs con links a `/cobranzas/[id]`

### Base de datos
- Función SQL: `generate_customer_payment_number(pos_number)` — Genera RCB-XXXXX-XXXXXXXX

---

## Cálculos

### Saldo pendiente de una venta
```
saldo = sale.total - sale.amount_paid
```

### Comisión por método de pago
```
fee = (method.amount * method.fee_percentage / 100) + method.fee_fixed
```
Se calcula desde `customer_payment_receipts` en el detalle de venta.

### Total pagado (detalle de venta)
```
totalPaid = sum(customer_payment_receipts[].amount)
```

---

## Tabla legacy: `payments`

La tabla `payments` vincula pagos directamente a ventas sin pasar por un RCB. Se mantiene por compatibilidad pero los datos nuevos se escriben en ambas tablas.

**Plan de migración:**
1. ✅ Escritura dual: `createSale` y `createExchange` escriben en `payments` Y en `customer_payments`
2. ✅ Lectura migrada: el detalle de venta lee desde `customer_payment_receipts`
3. ⬚ Pendiente: eliminar escritura en `payments` cuando todas las vistas lean de `customer_payments`
4. ⬚ Pendiente: migrar datos históricos de `payments` a `customer_payments`
5. ⬚ Pendiente: deprecar tabla `payments`

---

## Tipos de Supabase

Los tipos se generan con:
```bash
pnpm dlx supabase gen types typescript --project-id gwnahktmcvocyewnvjkg > lib/supabase/database.types.ts
```

Configurados en:
- `lib/supabase/client.ts` → `createBrowserClient<Database>()`
- `lib/supabase/server.ts` → `createServerClient<Database>()`

**Regenerar cada vez que se modifica el schema de la base de datos.**

# Prompt para Claude Code — Tienda Nube: Webhooks + Stock Bidireccional + Órdenes

## PASO 0: Leer archivos existentes

Antes de escribir código, leé estos archivos para entender el contexto:

```
cat app/api/tiendanube/webhooks/route.ts
cat lib/actions/tiendanube.ts
cat lib/services/tiendanube.ts
cat lib/tiendanube.ts
cat lib/actions/sales.ts
cat types/tiendanube.ts
```

Usá **Context7 MCP** para verificar sintaxis de Next.js 16 si es necesario.

---

## CONTEXTO

Ya tenemos implementado:

- OAuth con Tienda Nube ✅
- Sync de productos TN → Local ✅
- Webhook endpoint (app/api/tiendanube/webhooks/route.ts) ✅
- registerWebhooksAction en lib/actions/tiendanube.ts ✅
- syncStockToTiendanubeAction en lib/actions/tiendanube.ts ✅
- pushOrderToTiendanubeAction en lib/actions/tiendanube.ts ✅
- Página de integraciones en /configuracion/integraciones ✅

Lo que falta es **conectar las piezas** para que todo funcione automáticamente.

---

## TAREA 1: Registrar Webhooks automáticamente

**Problema:** `registerWebhooksAction` existe pero nunca se llama.

**Solución:**

### 1a. Registrar webhooks al conectar la tienda

En `app/api/tiendanube/auth/callback/route.ts`, después de guardar el store exitosamente y antes del redirect final, llamar a `registerWebhooksAction(storeId)`. Importar la función desde `@/lib/actions/tiendanube`. Wrappear en try/catch porque si falla el registro de webhooks no debe bloquear la conexión.

Después de registrar webhooks exitosamente, actualizar `tiendanube_stores` con `webhooks_registered: true`. Agregar esta columna boolean (default false) a la tabla `tiendanube_stores`. Antes de registrar webhooks, verificar si ya están registrados para evitar llamadas innecesarias a la API de TN.

### 1b. Botón manual en la página de integraciones

En `components/configuracion/integraciones-page-client.tsx`, agregar un botón "Registrar webhooks" que llame a `registerWebhooksAction`. Mostrarlo solo si la tienda está conectada. Mostrar resultado con toast (cuántos webhooks se registraron ok y cuáles fallaron).

### 1c. Verificar que la URL del webhook es accesible

Los webhooks usan `process.env.NEXT_PUBLIC_APP_URL` como base URL. Verificar que en el callback se usa la URL del túnel: `https://7fdtm4f2-3000.brs.devtunnels.ms/api/tiendanube/webhooks`

---

## TAREA 2: Stock bidireccional — Cuando se vende en el POS, actualizar stock en Tienda Nube

**Problema:** `syncStockToTiendanubeAction` existe pero no se llama cuando se concreta una venta.

**Solución:**

Buscar dónde se procesan las ventas en el POS. Revisar:

- `lib/actions/sales.ts` — buscar la función que crea ventas (probablemente `createSaleAction` o similar)
- `components/ventas/checkout-dialog.tsx` o `components/ventas/checkout/` — el flujo de checkout

Después de que una venta se completa exitosamente (después de descontar stock local), agregar un paso que:

1. Busque los `product_id` de los items de la venta
2. Para cada producto, verifique si tiene mapping en `tiendanube_product_map`
3. Si tiene mapping, llame a `syncStockToTiendanubeAction(productId, storeId)` para ese producto

**IMPORTANTE:** Este paso debe ser **no-bloqueante**. Si falla la sync a Tienda Nube, la venta local ya se completó y no debe revertirse. Usar try/catch y loggear errores silenciosamente.

Opciones de implementación (elegir la mejor):

**Opción A — En el server action de ventas (RECOMENDADO):**
Después de crear la venta y descontar stock, agregar un bloque que sincronice a TN.

CRITICAL:

- Usar `Promise.allSettled` para que si falla un producto, los demás se sincronicen igual.
- La sync debe ser NO-BLOQUEANTE: el usuario del POS no debe esperar a que TN responda para ver su ticket de venta.
- Si TODO el bloque de sync a TN falla, la venta local ya se completó y NO debe revertirse.

```typescript
// Al final del action de crear venta, después de todo lo demás:
try {
  const { data: store } = await supabaseAdmin
    .from("tiendanube_stores")
    .select("store_id")
    .limit(1)
    .maybeSingle();

  if (store) {
    const productIds = saleItems
      .filter((item) => item.product_id)
      .map((item) => item.product_id!);

    // Buscar todos los mappings de una sola vez (1 query, no N)
    const { data: mappings } = await supabaseAdmin
      .from("tiendanube_product_map")
      .select("local_product_id, tiendanube_product_id, tiendanube_variant_id")
      .eq("store_id", store.store_id)
      .in("local_product_id", productIds);

    if (mappings && mappings.length > 0) {
      // Sync todos en paralelo, sin bloquear si alguno falla
      const results = await Promise.allSettled(
        mappings
          .filter((m) => m.tiendanube_variant_id)
          .map((m) =>
            syncStockToTiendanubeAction(m.local_product_id, store.store_id),
          ),
      );

      // Log errores sin bloquear
      results.forEach((r, i) => {
        if (r.status === "rejected") {
          console.error(
            `Error syncing product ${mappings[i].local_product_id} to TN:`,
            r.reason,
          );
        }
      });
    }
  }
} catch (err) {
  console.error("Error syncing stock to Tiendanube after sale:", err);
  // No throw — la venta ya se completó
}
```

**Opción B — Helper separado:**
Crear una función `syncSaleStockToTiendanube(saleItems)` en `lib/actions/tiendanube.ts` que reciba los items de la venta y haga el sync. Llamarla desde el action de ventas.

---

## TAREA 3: Recibir órdenes de Tienda Nube como ventas locales

**Problema:** El webhook de `orders/created` solo hace `revalidateTag("sales")` pero no crea una venta local.

**Solución:**

### 3a. Crear función para importar una orden de TN como venta local

En `lib/actions/tiendanube.ts`, crear:

```typescript
export async function importTiendanubeOrderAction(
  storeId: string,
  tiendanubeOrderId: number,
  userId: string,
): Promise<{ saleId: string }>;
```

Esta función debe:

1. Llamar a `getTiendanubeOrders` (o un nuevo `getTiendanubeOrder(storeId, orderId)`) para obtener los datos de la orden
2. Mapear los productos de la orden TN a productos locales usando `tiendanube_product_map`. IMPORTANTE: buscar por `tiendanube_variant_id` (no solo por product_id) para soportar productos con talles/colores en el futuro. Cada line item de la orden de TN tiene `product_id` y `variant_id`.
3. Crear una venta local en la tabla `sales` con:
   - `sale_number`: generar uno nuevo (buscar el último sale_number y sumar 1, o usar un prefijo como "TN-{orderId}")
   - `voucher_type`: "COMPROBANTE_X"
   - `status`: "COMPLETED" (o mapear desde el status de TN)
   - `location_id`: location principal (is_main = true)
   - `notes`: "Pedido de Tienda Nube #{orderId}"
   - `subtotal`, `tax`, `total`, `discount`: mapear desde la orden TN
4. Crear los `sale_items` correspondientes
5. Descontar stock local (crear stock records y stock_movements con reference_type "SALE")
6. NO crear registros de pago (payment) porque el pago se gestiona en TN

### 3b. Modificar el webhook handler

En `app/api/tiendanube/webhooks/route.ts`, modificar el case `orders/created`.

⚠️ CRÍTICO — IDEMPOTENCIA: Tienda Nube re-envía webhooks si tu server tarda en responder. El PRIMER paso del handler debe ser verificar si la orden ya fue importada consultando `tiendanube_order_map`. Si ya existe, retornar 200 OK inmediatamente sin hacer nada. Esto evita ventas duplicadas y descuentos dobles de stock.

```typescript
case "orders/created":
  if (entityId) {
    try {
      // CHECK IDEMPOTENCIA: verificar si ya importamos esta orden
      const { data: existingOrder } = await supabaseAdmin
        .from("tiendanube_order_map")
        .select("id")
        .eq("store_id", storeId)
        .eq("tiendanube_order_id", entityId)
        .maybeSingle()

      if (!existingOrder) {
        await importTiendanubeOrderAction(storeId, entityId, store.user_id)
      }
    } catch (err) {
      console.error(`Webhook: Error importing order ${entityId}:`, err)
    }
  }
  revalidateTag("sales", "minutes")
  break
```

### 3c. Evitar duplicados

Antes de crear la venta, verificar que no exista ya una venta con un `notes` o campo que contenga el order ID de TN. Opción: agregar una columna `external_order_id` a `sales` o usar la tabla `settings` para trackear órdenes ya importadas.

La opción más limpia sería crear una tabla de mapeo (similar a `tiendanube_product_map`):

```sql
CREATE TABLE tiendanube_order_map (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id text NOT NULL,
  local_sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  tiendanube_order_id bigint NOT NULL,
  imported_at timestamptz DEFAULT now(),
  UNIQUE(store_id, tiendanube_order_id)
);
```

---

## NOTAS IMPORTANTES

- Seguir las convenciones del proyecto: `"use server"` en actions, `supabaseAdmin` para mutaciones, `revalidateTag` después de mutar.
- El header de API de Tienda Nube es `Authentication: bearer` (NO `Authorization`) y `User-Agent` es OBLIGATORIO.
- Rate limit de TN: 2 req/s. Si sincronizás stock de muchos productos post-venta, espaciar las llamadas.
- Los precios de TN vienen como strings ("1500.00"), los nombres como i18n ({es: "..."}).
- No romper el flujo de ventas existente — la sync a TN debe ser no-bloqueante.
- Revisar `lib/actions/sales.ts` para entender el flujo actual de ventas antes de modificarlo.

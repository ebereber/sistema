# Integración Tienda Nube — Prompt para Claude Code

## PASO 0: Consultá la documentación actualizada

Antes de escribir CUALQUIER código, usá **Context7 MCP** para resolver:

```
use context7 to resolve: next.js 16 app router route handlers (GET, POST in app/api)
use context7 to resolve: next.js 16 revalidateTag usage in server actions
use context7 to resolve: supabase-js v2 createClient server-side in next.js app router
```

Luego revisá la estructura actual del proyecto con `tree` o `ls` antes de crear archivos, para respetar las convenciones existentes (alias `@/`, estructura de carpetas, naming, etc.).

---

## CONTEXTO DEL PROYECTO

### Stack

- **Next.js 16** (App Router)
- **Supabase** (DB + Auth + RLS)
- **TypeScript** estricto
- **pnpm** como package manager

### Variables de entorno (`.env.local`):

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://gwnahktmcvocyewnvjkg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=***
SUPABASE_SERVICE_ROLE_KEY=***
TIENDANUBE_APP_ID=25885
TIENDANUBE_CLIENT_SECRET=dbe5d98f4660ba17cb0918d5a0f5fa615a32ebb24785aeee
NEXT_PUBLIC_APP_URL=https://7fdtm4f2-3000.brs.devtunnels.ms
```

### Túnel de desarrollo activo:

`https://7fdtm4f2-3000.brs.devtunnels.ms`

### URLs en el panel de Partners de Tienda Nube:

- **Redirect URI:** `https://7fdtm4f2-3000.brs.devtunnels.ms/api/tiendanube/auth/callback`
- **App URL:** `https://7fdtm4f2-3000.brs.devtunnels.ms`

---

## ESTRUCTURA DEL PROYECTO

```
app/
  (auth)/         → login, sign-up, forgot-password, etc.
  (dashboard)/    → layout.tsx + todas las páginas del POS:
    productos/    ventas/       compras/      ordenes/
    clientes/     proveedores/  inventario/   presupuestos/
    cobranzas/    pagos/        turnos/       reportes/
    configuracion/
    page.tsx      → dashboard home

components/       → componentes organizados por feature
  ventas/         compras/      turnos/       cobranzas/
  ordenes/        configuracion/ reportes/    sidebar/ ui/

lib/
  services/       → queries a Supabase (lectura)
    products.ts, products-cached.ts, sales.ts, sales-cached.ts,
    customers.ts, categories.ts, locations.ts, stock, etc.
  actions/        → server actions (mutaciones)
    products.ts, sales.ts, customers.ts, categories.ts,
    locations.ts, purchases.ts, etc.
  supabase/
    admin.ts      → supabaseAdmin (service role client)
    server.ts     → createClient() para server components
    client.ts     → createBrowserClient() para client components

types/
  sale.ts, payment-method.ts
```

### Convenciones del proyecto:

- **Services** (`lib/services/`): funciones de lectura. Las cached usan `unstable_cache` + `revalidateTag`.
- **Actions** (`lib/actions/`): server actions con `"use server"`. Usan `supabaseAdmin` (service role). Llaman `revalidateTag()` tras mutar.
- **Naming**: archivos en kebab-case, funciones en camelCase con sufijo `Action` (ej: `createProductAction`).
- **Imports**: alias `@/` para la raíz del proyecto.

---

## SCHEMA DE SUPABASE (TABLAS RELEVANTES PARA LA INTEGRACIÓN)

### products

```
id: uuid PK DEFAULT uuid_generate_v4()
name: text NOT NULL
sku: text NOT NULL
barcode: text NULL
description: text NULL
cost: numeric NULL
price: numeric NOT NULL
margin_percentage: numeric NULL
tax_rate: numeric NOT NULL DEFAULT 21
currency: text NOT NULL DEFAULT 'ARS'
stock_quantity: integer NULL DEFAULT 0
min_stock: integer NULL
track_stock: boolean NULL DEFAULT false
active: boolean NULL DEFAULT true
visibility: text NULL DEFAULT 'SALES_AND_PURCHASES'
product_type: product_type NOT NULL DEFAULT 'PRODUCT'
category_id: uuid NULL → categories.id
default_supplier_id: uuid NULL → suppliers.id
image_url: text NULL
oem_code: text NULL
created_at: timestamptz
updated_at: timestamptz
```

### stock

```
id: uuid PK
product_id: uuid NOT NULL → products.id
location_id: uuid NOT NULL → locations.id
quantity: integer NOT NULL DEFAULT 0
updated_at: timestamptz
```

### stock_movements

```
id: uuid PK
product_id: uuid NOT NULL → products.id
location_from_id: uuid NULL → locations.id
location_to_id: uuid NULL → locations.id
quantity: integer NOT NULL
reason: text NULL
reference_id: uuid NULL
reference_type: text NULL  (valores: INITIAL, ADJUSTMENT, SALE, PURCHASE, TRANSFER)
created_by: uuid NULL → users.id
created_at: timestamptz
```

### sales

```
id: uuid PK
sale_number: text NOT NULL
sale_date: timestamptz
customer_id: uuid NULL → customers.id
seller_id: uuid NULL → users.id
location_id: uuid NULL → locations.id
shift_id: uuid NULL → cash_register_shifts.id
voucher_type: text NOT NULL DEFAULT 'COMPROBANTE_X'
subtotal: numeric NOT NULL
discount: numeric NOT NULL DEFAULT 0
tax: numeric NOT NULL
total: numeric NOT NULL
amount_paid: numeric NOT NULL DEFAULT 0
status: text NOT NULL DEFAULT 'COMPLETED'  (COMPLETED, CANCELLED, PENDING, CREDIT_NOTE)
due_date: timestamptz NULL
notes: text NULL
related_sale_id: uuid NULL → sales.id
created_by: uuid NULL → users.id
created_at: timestamptz
updated_at: timestamptz
```

### sale_items

```
id: uuid PK
sale_id: uuid NOT NULL → sales.id
product_id: uuid NULL → products.id
description: text NOT NULL
sku: text NULL
quantity: numeric NOT NULL
unit_price: numeric NOT NULL
discount: numeric NOT NULL DEFAULT 0
tax_rate: numeric NOT NULL DEFAULT 0
total: numeric NOT NULL
created_at: timestamptz
```

### customers

```
id: uuid PK
name: text NOT NULL
email: text NULL
phone: text NULL
tax_id: text NULL
tax_id_type: text NULL DEFAULT 'DNI'
tax_category: text NULL DEFAULT 'Consumidor Final'
legal_entity_type: text NULL
trade_name: text NULL
street_address: text NULL
apartment: text NULL
city: text NULL
province: text NULL
postal_code: text NULL
price_list_id: uuid NULL → price_lists.id
assigned_seller_id: uuid NULL → users.id
payment_terms: text NULL
notes: text NULL
active: boolean NULL DEFAULT true
created_at: timestamptz
updated_at: timestamptz
```

### categories

```
id: uuid PK
name: text NOT NULL
description: text NULL
parent_id: uuid NULL → categories.id (self-referential)
active: boolean NULL DEFAULT true
created_at: timestamptz
updated_at: timestamptz
```

### locations

```
id: uuid PK
name: text NOT NULL
address: text NULL
is_main: boolean NULL DEFAULT false
active: boolean NULL DEFAULT true
created_at: timestamptz
updated_at: timestamptz
```

### settings (key-value store)

```
id: uuid PK
key: text NOT NULL
value: jsonb NOT NULL
created_at: timestamptz
updated_at: timestamptz
```

---

## QUÉ IMPLEMENTAR

### 1. Tabla `tiendanube_stores` en Supabase

Crear migración SQL. Esta tabla guarda la conexión OAuth con Tienda Nube.

```sql
CREATE TABLE tiendanube_stores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id text UNIQUE NOT NULL,        -- user_id que devuelve Tienda Nube (es el store_id)
  store_name text,
  access_token text NOT NULL,
  scope text,
  connected_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tiendanube_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own stores"
  ON tiendanube_stores FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_tiendanube_stores_store_id ON tiendanube_stores(store_id);
CREATE INDEX idx_tiendanube_stores_user_id ON tiendanube_stores(user_id);
```

Opcionalmente crear una tabla `tiendanube_sync_log` para trackear sincronizaciones.

### 2. Flujo OAuth 2

#### ⚠️ URLs CRÍTICAS de Tienda Nube (NO confundir):

- **Iniciar autorización (redirect del user):** `https://www.tiendanube.com/apps/{app_id}/authorize`
- **Intercambiar code por token (POST server-side):** `https://www.tiendanube.com/apps/authorize/token`

#### `app/api/tiendanube/auth/route.ts`

```typescript
// GET → Redirige al usuario a Tienda Nube para autorizar
// URL correcta: https://www.tiendanube.com/apps/${TIENDANUBE_APP_ID}/authorize
// NO usar /apps/authorize/token (esa es solo para el POST)
```

#### `app/api/tiendanube/auth/callback/route.ts`

```typescript
// GET → Recibe ?code= de Tienda Nube
// POST a https://www.tiendanube.com/apps/authorize/token con:
//   - Headers: Content-Type: application/json, User-Agent: MiPOS (contacto@email.com)  ← OBLIGATORIO
//   - Body: { client_id, client_secret, grant_type: "authorization_code", code }
// Respuesta: { access_token, token_type, scope, user_id }
//   → user_id de Tienda Nube = store_id (ID de la tienda)
// Guardar en tiendanube_stores con el auth.uid() del usuario logueado
// Redirigir a /configuracion o /dashboard
```

### 3. Lib Tienda Nube (`lib/tiendanube.ts`)

Helper para llamar a la API. Puntos críticos:

```typescript
// Base URL: https://api.tiendanube.com/v1/${storeId}/${endpoint}
// Headers (TODOS obligatorios):
//   Authentication: bearer ${access_token}   ← NO es "Authorization", es "Authentication"
//   User-Agent: MiPOS (contacto@email.com)   ← Sin esto, Tienda Nube falla silenciosamente
//   Content-Type: application/json
// Rate limit: 2 req/s (bucket leaky) → implementar retry con backoff en status 429
```

Obtener el token desde Supabase usando `supabaseAdmin` (service role, no depender de RLS).

### 4. Service de Tienda Nube (`lib/services/tiendanube.ts`)

Seguir el patrón de los services existentes. Funciones:

```typescript
// Productos
getTiendanubeProducts(storeId: string, params?: { page?: number; per_page?: number })
getTiendanubeProduct(storeId: string, productId: number)

// Órdenes
getTiendanubeOrders(storeId: string, params?: { status?: string; page?: number })
createTiendanubeOrder(storeId: string, orderData: TiendanubeCreateOrder)

// Stock
updateTiendanubeVariantStock(storeId: string, productId: number, variantId: number, stock: number)

// Categorías
getTiendanubeCategories(storeId: string)
```

### 5. Actions de Tienda Nube (`lib/actions/tiendanube.ts`)

Seguir el patrón de las actions existentes (con `"use server"`, usando `supabaseAdmin`, llamando `revalidateTag`):

```typescript
// syncProductsFromTiendanubeAction(storeId: string, userId: string)
//   → Trae productos de Tienda Nube y los crea/actualiza en la tabla products local
//   → Mapear campos: name, sku, price, stock, images, categories
//   → Guardar el tiendanube_product_id en algún campo (usar oem_code o agregar columna)
//   → Crear stock records y stock_movements con reference_type: 'TIENDANUBE_SYNC'

// syncStockToTiendanubeAction(productId: string, storeId: string)
//   → Envía el stock local de un producto a Tienda Nube (PUT variant)

// pushOrderToTiendanubeAction(saleId: string, storeId: string)
//   → Crea una orden en Tienda Nube a partir de una venta local
```

### 6. Webhook endpoint (`app/api/tiendanube/webhooks/route.ts`)

```typescript
// POST → Recibe webhooks de Tienda Nube
// Topics relevantes: orders/created, orders/paid, products/updated, app/uninstalled
// Validar origen del request
// Procesar según topic y actualizar datos locales
```

### 7. Tabla de mapeo (opcional pero recomendado)

Para vincular IDs locales con IDs de Tienda Nube:

```sql
CREATE TABLE tiendanube_product_map (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id text NOT NULL,
  local_product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tiendanube_product_id bigint NOT NULL,
  tiendanube_variant_id bigint,
  last_synced_at timestamptz DEFAULT now(),
  UNIQUE(store_id, local_product_id),
  UNIQUE(store_id, tiendanube_product_id)
);
```

---

## MAPEO DE CAMPOS: Tienda Nube → POS Local

| Tienda Nube                 | Tabla local | Campo local      | Notas                            |
| --------------------------- | ----------- | ---------------- | -------------------------------- |
| product.name.es             | products    | name             | Tienda Nube usa i18n {es: "..."} |
| product.variants[0].sku     | products    | sku              |                                  |
| product.variants[0].barcode | products    | barcode          |                                  |
| product.variants[0].price   | products    | price            | Convertir string a numeric       |
| product.variants[0].cost    | products    | cost             |                                  |
| product.variants[0].stock   | stock       | quantity         | Por location                     |
| product.categories[0].id    | categories  | (mapear o crear) | Buscar por nombre o crear        |
| product.images[0].src       | products    | image_url        |                                  |
| order.id                    | sales       | (mapeo externo)  | No sobreescribir sale_number     |
| order.total                 | sales       | total            |                                  |
| order.products[]            | sale_items  |                  | Mapear via product_map           |

---

## DOCUMENTACIÓN API TIENDA NUBE (REFERENCIA RÁPIDA)

```
Base URL: https://api.tiendanube.com/v1/{store_id}/

GET  /products                  → Lista productos (paginado, 200/page max)
GET  /products/{id}             → Detalle de producto con variantes
POST /products                  → Crear producto
PUT  /products/{id}             → Actualizar producto
PUT  /products/{id}/variants/{id} → Actualizar variante (stock, precio)

GET  /orders                    → Lista órdenes
GET  /orders/{id}               → Detalle de orden
POST /orders                    → Crear orden

GET  /categories                → Lista categorías
POST /categories                → Crear categoría

POST /webhooks                  → Crear webhook
GET  /webhooks                  → Listar webhooks
DELETE /webhooks/{id}           → Eliminar webhook

Paginación: ?page=1&per_page=50 (máx 200)
Respuestas: los campos de texto (name, description) vienen como objeto i18n: { "es": "valor" }
Los precios vienen como strings: "1500.00" → parsear a number
```

---

## CHECKLIST FINAL

- [ ] Usé Context7 para verificar sintaxis de Next.js 16 y Supabase antes de codear
- [ ] Revisé la estructura del proyecto y seguí las convenciones existentes
- [ ] URL de inicio OAuth: `/apps/{app_id}/authorize` (NO `/apps/authorize/token`)
- [ ] URL de intercambio de token: POST a `/apps/authorize/token` con `User-Agent` obligatorio
- [ ] Header de API: `Authentication` (NO `Authorization`) + `User-Agent` en TODA llamada
- [ ] Tabla `tiendanube_stores` tiene `user_id` + RLS habilitado
- [ ] Los `access_tokens` NUNCA se exponen al cliente
- [ ] Retry con backoff para rate limits (429)
- [ ] Mapeo de campos i18n (name.es) y precios string→number
- [ ] Tabla de mapeo `tiendanube_product_map` para vincular IDs
- [ ] Las actions siguen el patrón existente: `"use server"`, `supabaseAdmin`, `revalidateTag`
- [ ] Los services siguen el patrón existente de lectura
- [ ] TypeScript estricto con interfaces para payloads de Tienda Nube

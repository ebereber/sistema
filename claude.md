# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm lint         # ESLint
pnpm start        # Start production server
```

No test framework is configured.

## Tech Stack

- **Next.js 16** (App Router, React 19, TypeScript 5)
- **Supabase** for PostgreSQL database + Auth (no ORM — direct Supabase client with auto-generated types)
- **Tailwind CSS 4** + shadcn/ui (Radix UI primitives)
- **Zustand** for client state (cart, purchase forms)
- **React Hook Form + Zod 4** for form validation
- **Integrations**: Tiendanube, MercadoLibre, AFIP (Argentine tax)

## Architecture

### Multi-Tenancy

Every main table has a non-nullable `organization_id`. This is the most critical pattern in the codebase.

- **Server actions**: call `getOrganizationId()` from `lib/auth/get-organization.ts` — returns the org_id from the authenticated user
- **Client services**: call `getClientOrganizationId()` from `lib/auth/get-client-organization.ts`
- **Webhook handlers** (Tiendanube/MercadoLibre): get org_id from `tiendanube_stores.organization_id` or `mercadolibre_accounts.organization_id` (no auth user in webhook context)
- Tables that inherit org context through FK (e.g., `sale_items` → `sales`) do NOT have their own `organization_id`

### Server Actions (Primary Data Pattern)

All mutations and most queries go through server actions in `lib/actions/`. The standard pattern:

```typescript
"use server";
import { getOrganizationId } from "@/lib/auth/get-organization";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";

export async function createSomethingAction(data: { ... }) {
  const organizationId = await getOrganizationId();
  const { data: result, error } = await supabaseAdmin
    .from("table")
    .insert({ ...data, organization_id: organizationId })
    .select()
    .single();
  if (error) throw error;
  revalidateTag("tag-name");
  return result;
}
```

Key conventions:

- Use `supabaseAdmin` (service role) for database operations in server actions
- Always filter by `organization_id` on reads
- Call `revalidateTag()` after mutations
- Action function names end with `Action` suffix
- When a function accepts a typed insert (e.g., `SupplierInsert`), use `Omit<Type, "organization_id">` in the parameter and inject org_id internally

### Supabase Clients

- `lib/supabase/admin.ts` — service role client (server actions, API routes)
- `lib/supabase/server.ts` — SSR client with cookie-based auth (server components)
- `lib/supabase/client.ts` — browser client (client components)
- `lib/supabase/database.types.ts` — auto-generated TypeScript types from Supabase

### Auth Flow

1. `middleware.ts` protects all routes except public ones (`/login`, `/sign-up`, `/forgot-password`, etc.) and API routes
2. `lib/auth/get-server-user.ts` fetches user record with role and `organization_id`
3. `lib/auth/permissions.ts` and `lib/auth/data-scope.ts` handle role-based access

### Directory Layout

- `app/(auth)/` — login, signup, password reset pages
- `app/(dashboard)/` — all protected app pages, one folder per module (ventas, clientes, productos, etc.)
- `app/api/` — webhook endpoints (Tiendanube, MercadoLibre), PDF generation, import templates
- `lib/actions/` — server actions (primary data layer, ~29 files)
- `lib/services/` — **deprecated** client-side services, being migrated to `lib/actions/`
- `lib/validations/` — Zod schemas for form validation
- `lib/store/` — Zustand stores (sale cart, purchase forms)
- `lib/auth/` — auth helpers and permission system
- `components/ui/` — shadcn/ui base components
- `components/{module}/` — module-specific components (ventas/, clientes/, etc.)
- `types/` — shared TypeScript type definitions
- `hooks/` — custom React hooks

### Key Modules

The app is a POS system (Sistema POS Lemar). Main business modules under `app/(dashboard)/`:

- **ventas** — Point of sale, sales management
- **clientes** — Customer management
- **productos** — Product catalog, pricing, inventory
- **compras / ordenes** — Purchases and purchase orders
- **cobranzas** — Customer payment collection / receivables
- **pagos** — Supplier payments
- **tesoreria** — Treasury: bank accounts, safe boxes, fund transfers
- **movimientos** — Financial movements / account transactions
- **turnos** — Cash register shift management
- **reportes** — Reports and analytics
- **inventario** — Stock management and adjustments
- **transferencias** — Inter-location stock transfers

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Optional (for integrations):

```
TIENDANUBE_APP_ID / TIENDANUBE_CLIENT_SECRET
MERCADOLIBRE_APP_ID / MERCADOLIBRE_CLIENT_SECRET
```

## Conventions

- The codebase is in **Spanish** (table names, UI text, comments, variable names in business logic)
- Path alias: `@/*` maps to the project root
- Toast notifications use `sonner` (import `toast` from `sonner`)
- PDF generation uses `@react-pdf/renderer` with endpoints in `app/api/pdf/`
- Date handling uses `date-fns`
- Number/currency formatting uses `react-number-format` and helpers in `lib/utils/currency.ts`

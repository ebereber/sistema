import { redirect } from "next/navigation";
import { Suspense } from "react";

import { IntegracionesPageClient } from "@/components/configuracion/integraciones-page-client";
import { Skeleton } from "@/components/ui/skeleton";
import { requirePermission } from "@/lib/auth/check-permission";
import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function IntegracionesPage() {
  await requirePermission("settings:write");
  return (
    <Suspense fallback={<PageSkeleton />}>
      <IntegracionesContent />
    </Suspense>
  );
}

async function IntegracionesContent() {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const organizationId = await getOrganizationId();

  const { data: store } = await supabaseAdmin
    .from("tiendanube_stores")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  // Get TN product mapping count if connected
  let syncedProductsCount = 0;
  if (store) {
    const { count } = await supabaseAdmin
      .from("tiendanube_product_map")
      .select("id", { count: "exact", head: true })
      .eq("store_id", store.store_id);

    syncedProductsCount = count || 0;
  }

  // Get MercadoLibre account for this organization
  const { data: meliAccount } = await supabaseAdmin
    .from("mercadolibre_accounts")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  let meliSyncedProductsCount = 0;
  if (meliAccount) {
    const { count } = await supabaseAdmin
      .from("mercadolibre_product_map")
      .select("id", { count: "exact", head: true })
      .eq("meli_user_id", meliAccount.meli_user_id);
    meliSyncedProductsCount = count || 0;
  }

  // Fetch active price lists for the MeLi price list selector
  const { data: priceLists } = await supabaseAdmin
    .from("price_lists")
    .select("id, name, adjustment_type, adjustment_percentage")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .order("name");

  return (
    <IntegracionesPageClient
      userId={user.id}
      initialStore={store}
      syncedProductsCount={syncedProductsCount}
      meliAccount={meliAccount}
      meliSyncedProductsCount={meliSyncedProductsCount}
      priceLists={priceLists || []}
    />
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-96" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

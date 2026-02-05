import { redirect } from "next/navigation";
import { Suspense } from "react";

import { IntegracionesPageClient } from "@/components/configuracion/integraciones-page-client";
import { Skeleton } from "@/components/ui/skeleton";
import { getServerUser } from "@/lib/auth/get-server-user";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function IntegracionesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <IntegracionesContent />
    </Suspense>
  );
}

async function IntegracionesContent() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const { data: store } = await supabaseAdmin
    .from("tiendanube_stores")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  // Get product mapping count if connected
  let syncedProductsCount = 0;
  if (store) {
    const { count } = await supabaseAdmin
      .from("tiendanube_product_map")
      .select("id", { count: "exact", head: true })
      .eq("store_id", store.store_id);

    syncedProductsCount = count || 0;
  }

  return (
    <IntegracionesPageClient
      userId={user.id}
      initialStore={store}
      syncedProductsCount={syncedProductsCount}
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

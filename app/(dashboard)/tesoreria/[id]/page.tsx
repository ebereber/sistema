import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";

import { getServerUser } from "@/lib/auth/get-server-user";
import { getCachedTreasuryAccountDetail } from "@/lib/services/treasury-cached";
import { TesoreriaDetailClient } from "@/components/tesoreria/tesoreria-detail-client";

interface TesoreriaDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}

export default async function TesoreriaDetailPage({
  params,
  searchParams,
}: TesoreriaDetailPageProps) {
  const { id } = await params;
  const { type } = await searchParams;

  return (
    <Suspense fallback={<PageSkeleton />}>
      <TesoreriaDetailContent id={id} type={type} />
    </Suspense>
  );
}

async function TesoreriaDetailContent({
  id,
  type,
}: {
  id: string;
  type?: string;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const accountType = (type as "bank" | "cash" | "safe") || "bank";

  const account = await getCachedTreasuryAccountDetail(id, accountType);

  if (!account) notFound();

  return <TesoreriaDetailClient account={account} />;
}

function PageSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <Skeleton className="h-4 w-24" />
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-8 w-36" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

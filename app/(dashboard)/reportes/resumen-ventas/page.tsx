import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ResumenVentasClient } from "@/components/reportes/resumen-ventas-client";
import { Skeleton } from "@/components/ui/skeleton";
import { getSalesReportAction } from "@/lib/actions/reports";
import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import { supabaseAdmin } from "@/lib/supabase/admin";

// ============================================================================
// Date range calculation
// ============================================================================

function calculateDateRanges(
  periodType: string,
  periodValue: number,
  periodUnit: string,
) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let dateFrom: Date;
  let dateTo: Date;
  let prevDateFrom: Date;
  let prevDateTo: Date;

  if (periodType === "this") {
    // "this" month/week/year — from start of unit to today
    if (periodUnit === "months") {
      dateFrom = new Date(today.getFullYear(), today.getMonth(), 1);
      dateTo = today;
      prevDateTo = new Date(dateFrom);
      prevDateTo.setDate(prevDateTo.getDate() - 1);
      prevDateFrom = new Date(
        prevDateTo.getFullYear(),
        prevDateTo.getMonth(),
        1,
      );
    } else if (periodUnit === "weeks") {
      const dayOfWeek = today.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      dateFrom = new Date(today);
      dateFrom.setDate(dateFrom.getDate() + mondayOffset);
      dateTo = today;
      prevDateTo = new Date(dateFrom);
      prevDateTo.setDate(prevDateTo.getDate() - 1);
      prevDateFrom = new Date(prevDateTo);
      prevDateFrom.setDate(prevDateFrom.getDate() - 6);
    } else if (periodUnit === "years") {
      dateFrom = new Date(today.getFullYear(), 0, 1);
      dateTo = today;
      prevDateTo = new Date(dateFrom);
      prevDateTo.setDate(prevDateTo.getDate() - 1);
      prevDateFrom = new Date(prevDateTo.getFullYear(), 0, 1);
    } else {
      // days — treat as "last 1 day"
      dateFrom = today;
      dateTo = today;
      prevDateTo = new Date(today);
      prevDateTo.setDate(prevDateTo.getDate() - 1);
      prevDateFrom = prevDateTo;
    }
  } else if (periodType === "previous") {
    // "previous" month/week/year
    if (periodUnit === "months") {
      dateFrom = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      dateTo = new Date(today.getFullYear(), today.getMonth(), 0);
      prevDateTo = new Date(dateFrom);
      prevDateTo.setDate(prevDateTo.getDate() - 1);
      prevDateFrom = new Date(
        prevDateTo.getFullYear(),
        prevDateTo.getMonth(),
        1,
      );
    } else if (periodUnit === "weeks") {
      const dayOfWeek = today.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const thisMonday = new Date(today);
      thisMonday.setDate(thisMonday.getDate() + mondayOffset);
      dateTo = new Date(thisMonday);
      dateTo.setDate(dateTo.getDate() - 1);
      dateFrom = new Date(dateTo);
      dateFrom.setDate(dateFrom.getDate() - 6);
      prevDateTo = new Date(dateFrom);
      prevDateTo.setDate(prevDateTo.getDate() - 1);
      prevDateFrom = new Date(prevDateTo);
      prevDateFrom.setDate(prevDateFrom.getDate() - 6);
    } else if (periodUnit === "years") {
      dateFrom = new Date(today.getFullYear() - 1, 0, 1);
      dateTo = new Date(today.getFullYear() - 1, 11, 31);
      prevDateTo = new Date(dateFrom);
      prevDateTo.setDate(prevDateTo.getDate() - 1);
      prevDateFrom = new Date(prevDateTo.getFullYear(), 0, 1);
    } else {
      // days — treat as yesterday
      dateTo = new Date(today);
      dateTo.setDate(dateTo.getDate() - 1);
      dateFrom = dateTo;
      prevDateTo = new Date(dateFrom);
      prevDateTo.setDate(prevDateTo.getDate() - 1);
      prevDateFrom = prevDateTo;
    }
  } else {
    // "last" N days/weeks/months/years
    dateTo = today;
    if (periodUnit === "weeks") {
      dateFrom = new Date(today);
      dateFrom.setDate(dateFrom.getDate() - periodValue * 7);
    } else if (periodUnit === "months") {
      dateFrom = new Date(today);
      dateFrom.setMonth(dateFrom.getMonth() - periodValue);
    } else if (periodUnit === "years") {
      dateFrom = new Date(today);
      dateFrom.setFullYear(dateFrom.getFullYear() - periodValue);
    } else {
      // days (default)
      dateFrom = new Date(today);
      dateFrom.setDate(dateFrom.getDate() - periodValue);
    }

    // Previous period = same duration before dateFrom
    const durationMs = dateTo.getTime() - dateFrom.getTime();
    prevDateTo = new Date(dateFrom);
    prevDateTo.setDate(prevDateTo.getDate() - 1);
    prevDateFrom = new Date(prevDateTo.getTime() - durationMs);
  }

  const fmt = (d: Date) => d.toISOString().substring(0, 10);
  return {
    dateFrom: fmt(dateFrom) + "T00:00:00",
    dateTo: fmt(dateTo) + "T23:59:59",
    prevDateFrom: fmt(prevDateFrom) + "T00:00:00",
    prevDateTo: fmt(prevDateTo) + "T23:59:59",
  };
}

// ============================================================================
// Page
// ============================================================================

export default async function ResumenVentasPage({
  searchParams,
}: {
  searchParams: Promise<{
    periodType?: string;
    periodValue?: string;
    periodUnit?: string;
    locationIds?: string;
    sellerIds?: string;
  }>;
}) {
  const params = await searchParams;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ResumenVentasContent searchParams={params} />
    </Suspense>
  );
}

async function ResumenVentasContent({
  searchParams,
}: {
  searchParams: {
    periodType?: string;
    periodValue?: string;
    periodUnit?: string;
    locationIds?: string;
    sellerIds?: string;
  };
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const organizationId = await getOrganizationId();

  // Parse filter params
  const periodType = searchParams.periodType || "last";
  const periodValue = Math.max(
    1,
    parseInt(searchParams.periodValue || "30", 10) || 30,
  );
  const periodUnit = searchParams.periodUnit || "days";
  const locationIds = searchParams.locationIds
    ? searchParams.locationIds.split(",").filter(Boolean)
    : undefined;
  const sellerIds = searchParams.sellerIds
    ? searchParams.sellerIds.split(",").filter(Boolean)
    : undefined;

  // Calculate date ranges
  const ranges = calculateDateRanges(periodType, periodValue, periodUnit);

  // Fetch report data + filter options in parallel
  const [reportData, locations, sellers] = await Promise.all([
    getSalesReportAction({
      ...ranges,
      locationIds,
      sellerIds,
    }),
    supabaseAdmin
      .from("locations")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .order("name")
      .then(({ data }) => data || []),
    supabaseAdmin
      .from("users")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .order("name")
      .then(({ data }) => data || []),
  ]);

  return (
    <ResumenVentasClient
      reportData={reportData}
      locations={locations}
      sellers={sellers}
      currentFilters={{
        periodType,
        periodValue: String(periodValue),
        periodUnit,
        locationIds: locationIds || [],
        sellerIds: sellerIds || [],
      }}
    />
  );
}

function PageSkeleton() {
  return (
    <div className="flex h-full flex-1 flex-col space-y-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-[400px] w-full" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-[280px]" />
        <Skeleton className="h-[280px]" />
      </div>
    </div>
  );
}

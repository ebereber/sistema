"use server";

import { getOrganizationId } from "@/lib/auth/get-organization";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeRelation } from "@/lib/supabase/types";

// ============================================================================
// Types
// ============================================================================

export interface SalesReportParams {
  dateFrom: string;
  dateTo: string;
  prevDateFrom: string;
  prevDateTo: string;
  locationIds?: string[];
  sellerIds?: string[];
}

export interface SalesReportMetric {
  id: string;
  label: string;
  value: number;
  change: number;
  previousValue: number;
  isCurrency: boolean;
}

export type ChartDataByMetric = Record<
  string,
  { date: string; current: number; previous: number }[]
>;

export interface SalesReportResult {
  metrics: SalesReportMetric[];
  chartData: ChartDataByMetric;
  bySeller: { seller: string; totalSales: number }[];
  byPos: { pos: string; totalSales: number }[];
  byPayment: { paymentMethod: string; totalSales: number }[];
  byReceipt: { receiptType: string; totalSales: number }[];
}

// ============================================================================
// Helpers
// ============================================================================

const VOUCHER_LABELS: Record<string, string> = {
  COMPROBANTE_X: "Comprobante X",
  FACTURA_A: "Factura A",
  FACTURA_B: "Factura B",
  FACTURA_C: "Factura C",
  NOTA_CREDITO_X: "Nota de Crédito X",
  NOTA_CREDITO_A: "Nota de Crédito A",
  NOTA_CREDITO_B: "Nota de Crédito B",
  NOTA_CREDITO_C: "Nota de Crédito C",
};

function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// Fetch sales WITH inline sale_items for per-day metric aggregation
async function fetchSalesWithItems(
  organizationId: string,
  dateFrom: string,
  dateTo: string,
  locationIds?: string[],
  sellerIds?: string[],
) {
  let query = supabaseAdmin
    .from("sales")
    .select(
      "id, sale_date, total, voucher_type, seller_id, location_id, sale_items(quantity, unit_cost, product:products(cost))",
    )
    .eq("organization_id", organizationId)
    .neq("status", "CANCELLED")
    .gte("sale_date", dateFrom)
    .lte("sale_date", dateTo)
    .limit(10000);

  if (locationIds && locationIds.length > 0) {
    query = query.in("location_id", locationIds);
  }
  if (sellerIds && sellerIds.length > 0) {
    query = query.in("seller_id", sellerIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

type SaleWithItems = Awaited<ReturnType<typeof fetchSalesWithItems>>[number];

// Per-day aggregate bucket
interface DailyAgg {
  totalSold: number;
  salesCount: number;
  units: number;
  cmv: number;
}

function emptyAgg(): DailyAgg {
  return { totalSold: 0, salesCount: 0, units: 0, cmv: 0 };
}

function buildDailyAggregates(sales: SaleWithItems[]) {
  const map = new Map<string, DailyAgg>();

  for (const sale of sales) {
    const day = sale.sale_date.substring(0, 10);
    const agg = map.get(day) || emptyAgg();
    const isNC = sale.voucher_type?.startsWith("NOTA_CREDITO");

    if (isNC) {
      agg.totalSold -= sale.total;
    } else {
      agg.totalSold += sale.total;
      agg.salesCount += 1;

      for (const item of sale.sale_items || []) {
        agg.units += item.quantity;
        const product = normalizeRelation(item.product);
        const cost = item.unit_cost ?? product?.cost ?? 0;
        agg.cmv += item.quantity * cost;
      }
    }

    map.set(day, agg);
  }

  return map;
}

function computeTotals(sales: SaleWithItems[]) {
  let totalSold = 0;
  let salesCount = 0;
  let units = 0;
  let cmv = 0;

  for (const sale of sales) {
    const isNC = sale.voucher_type?.startsWith("NOTA_CREDITO");

    if (isNC) {
      totalSold -= sale.total;
    } else {
      totalSold += sale.total;
      salesCount += 1;

      for (const item of sale.sale_items || []) {
        units += item.quantity;
        const product = normalizeRelation(item.product);
        const cost = item.unit_cost ?? product?.cost ?? 0;
        cmv += item.quantity * cost;
      }
    }
  }

  const avgPerSale = salesCount > 0 ? totalSold / salesCount : 0;
  const margin = totalSold - cmv;

  return { totalSold, salesCount, avgPerSale, units, margin };
}

// ============================================================================
// Main server action
// ============================================================================

export async function getSalesReportAction(
  params: SalesReportParams,
): Promise<SalesReportResult> {
  const organizationId = await getOrganizationId();

  // 1. Fetch sales (with items) for both periods in parallel
  const [currentSales, previousSales] = await Promise.all([
    fetchSalesWithItems(
      organizationId,
      params.dateFrom,
      params.dateTo,
      params.locationIds,
      params.sellerIds,
    ),
    fetchSalesWithItems(
      organizationId,
      params.prevDateFrom,
      params.prevDateTo,
      params.locationIds,
      params.sellerIds,
    ),
  ]);

  // 2. Compute overall metrics for both periods
  const curr = computeTotals(currentSales);
  const prev = computeTotals(previousSales);

  const metrics: SalesReportMetric[] = [
    {
      id: "total-vendido",
      label: "Total Vendido",
      value: curr.totalSold,
      change: calculateChange(curr.totalSold, prev.totalSold),
      previousValue: prev.totalSold,
      isCurrency: true,
    },
    {
      id: "cantidad-ventas",
      label: "Cantidad de Ventas",
      value: curr.salesCount,
      change: calculateChange(curr.salesCount, prev.salesCount),
      previousValue: prev.salesCount,
      isCurrency: false,
    },
    {
      id: "promedio-venta",
      label: "Promedio por Venta",
      value: curr.avgPerSale,
      change: calculateChange(curr.avgPerSale, prev.avgPerSale),
      previousValue: prev.avgPerSale,
      isCurrency: true,
    },
    {
      id: "unidades-vendidas",
      label: "Unidades Vendidas",
      value: curr.units,
      change: calculateChange(curr.units, prev.units),
      previousValue: prev.units,
      isCurrency: false,
    },
    {
      id: "margen-bruto",
      label: "Margen Bruto",
      value: curr.margin,
      change: calculateChange(curr.margin, prev.margin),
      previousValue: prev.margin,
      isCurrency: true,
    },
  ];

  // 3. Build per-metric daily chart data
  const currentAgg = buildDailyAggregates(currentSales);
  const previousAgg = buildDailyAggregates(previousSales);

  const currentStart = new Date(params.dateFrom);
  const currentEnd = new Date(params.dateTo);
  const prevStart = new Date(params.prevDateFrom);
  const periodDays =
    Math.ceil(
      (currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1;

  const chartData: ChartDataByMetric = {
    "total-vendido": [],
    "cantidad-ventas": [],
    "promedio-venta": [],
    "unidades-vendidas": [],
    "margen-bruto": [],
  };

  for (let i = 0; i < periodDays; i++) {
    const currentDay = new Date(currentStart);
    currentDay.setDate(currentDay.getDate() + i);
    const currentDayStr = currentDay.toISOString().substring(0, 10);

    const prevDay = new Date(prevStart);
    prevDay.setDate(prevDay.getDate() + i);
    const prevDayStr = prevDay.toISOString().substring(0, 10);

    const displayDate = currentDay.toLocaleDateString("es-AR", {
      month: "short",
      day: "numeric",
    });

    const c = currentAgg.get(currentDayStr) || emptyAgg();
    const p = previousAgg.get(prevDayStr) || emptyAgg();

    chartData["total-vendido"].push({
      date: displayDate,
      current: c.totalSold,
      previous: p.totalSold,
    });
    chartData["cantidad-ventas"].push({
      date: displayDate,
      current: c.salesCount,
      previous: p.salesCount,
    });
    chartData["promedio-venta"].push({
      date: displayDate,
      current: c.salesCount > 0 ? c.totalSold / c.salesCount : 0,
      previous: p.salesCount > 0 ? p.totalSold / p.salesCount : 0,
    });
    chartData["unidades-vendidas"].push({
      date: displayDate,
      current: c.units,
      previous: p.units,
    });
    chartData["margen-bruto"].push({
      date: displayDate,
      current: c.totalSold - c.cmv,
      previous: p.totalSold - p.cmv,
    });
  }

  // 4. By Seller
  const sellerTotals = new Map<string, number>();
  for (const sale of currentSales) {
    if (sale.voucher_type?.startsWith("NOTA_CREDITO")) continue;
    if (!sale.seller_id) continue;
    sellerTotals.set(
      sale.seller_id,
      (sellerTotals.get(sale.seller_id) ?? 0) + sale.total,
    );
  }

  const sellerIdList = Array.from(sellerTotals.keys());
  const sellerNames = new Map<string, string>();
  if (sellerIdList.length > 0) {
    const { data: users } = await supabaseAdmin
      .from("users")
      .select("id, name")
      .in("id", sellerIdList);
    for (const u of users || []) {
      sellerNames.set(u.id, u.name || u.id);
    }
  }

  const bySeller = Array.from(sellerTotals.entries())
    .map(([id, total]) => ({
      seller: sellerNames.get(id) || id,
      totalSales: total,
    }))
    .sort((a, b) => b.totalSales - a.totalSales);

  // 5. By POS (location)
  const posTotals = new Map<string, number>();
  for (const sale of currentSales) {
    if (sale.voucher_type?.startsWith("NOTA_CREDITO")) continue;
    if (!sale.location_id) continue;
    posTotals.set(
      sale.location_id,
      (posTotals.get(sale.location_id) ?? 0) + sale.total,
    );
  }

  const locationIdList = Array.from(posTotals.keys());
  const locationNames = new Map<string, string>();
  if (locationIdList.length > 0) {
    const { data: locs } = await supabaseAdmin
      .from("locations")
      .select("id, name")
      .in("id", locationIdList);
    for (const l of locs || []) {
      locationNames.set(l.id, l.name);
    }
  }

  const byPos = Array.from(posTotals.entries())
    .map(([id, total]) => ({
      pos: locationNames.get(id) || id,
      totalSales: total,
    }))
    .sort((a, b) => b.totalSales - a.totalSales);

  // 6. By Payment Method (sales → allocations → payment_methods)
  const allSaleIds = currentSales.map((s) => s.id);
  let byPayment: SalesReportResult["byPayment"] = [];

  if (allSaleIds.length > 0) {
    const allocChunks: string[][] = [];
    for (let i = 0; i < allSaleIds.length; i += 100) {
      allocChunks.push(allSaleIds.slice(i, i + 100));
    }

    const allocResults = await Promise.all(
      allocChunks.map(async (chunk) => {
        const { data, error } = await supabaseAdmin
          .from("customer_payment_allocations")
          .select("customer_payment_id")
          .in("sale_id", chunk);
        if (error) throw error;
        return data || [];
      }),
    );

    const paymentIds = [
      ...new Set(allocResults.flat().map((a) => a.customer_payment_id)),
    ];

    if (paymentIds.length > 0) {
      const methodChunks: string[][] = [];
      for (let i = 0; i < paymentIds.length; i += 100) {
        methodChunks.push(paymentIds.slice(i, i + 100));
      }

      const methodResults = await Promise.all(
        methodChunks.map(async (chunk) => {
          const { data, error } = await supabaseAdmin
            .from("customer_payment_methods")
            .select("method_name, amount")
            .in("customer_payment_id", chunk);
          if (error) throw error;
          return data || [];
        }),
      );

      const paymentMap = new Map<string, number>();
      for (const m of methodResults.flat()) {
        paymentMap.set(
          m.method_name,
          (paymentMap.get(m.method_name) ?? 0) + m.amount,
        );
      }

      byPayment = Array.from(paymentMap.entries())
        .map(([method, total]) => ({
          paymentMethod: method,
          totalSales: total,
        }))
        .sort((a, b) => b.totalSales - a.totalSales);
    }
  }

  // 7. By Receipt Type
  const receiptMap = new Map<string, number>();
  for (const sale of currentSales) {
    const type = sale.voucher_type || "Otro";
    const amount = sale.voucher_type?.startsWith("NOTA_CREDITO")
      ? -sale.total
      : sale.total;
    receiptMap.set(type, (receiptMap.get(type) ?? 0) + amount);
  }

  const byReceipt = Array.from(receiptMap.entries())
    .map(([type, total]) => ({
      receiptType: VOUCHER_LABELS[type] || type,
      totalSales: total,
    }))
    .sort((a, b) => b.totalSales - a.totalSales);

  return { metrics, chartData, bySeller, byPos, byPayment, byReceipt };
}

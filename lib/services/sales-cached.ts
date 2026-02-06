import "server-only"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { cacheLife, cacheTag } from "next/cache"
import type {
  GetSalesParams,
  SaleListItem,
  SaleWithDetails,
} from "./sales"

export async function getCachedSales(
  organizationId: string,
  params: GetSalesParams = {},
  scope?: {
    visibility: "own" | "assigned_locations" | "all"
    userId: string
    locationIds: string[]
  },
): Promise<{
  data: SaleListItem[]
  count: number
  totalPages: number
}> {
  "use cache"
  cacheTag("sales")
  cacheLife("minutes")

  const {
    search,
    status,
    dateFrom,
    dateTo,
    minAmount,
    maxAmount,
    sellerId,
    voucherType,
    page = 1,
    pageSize = 20,
  } = params

  let query = supabaseAdmin
    .from("sales")
    .select(
      `
      id,
      sale_number,
      sale_date,
      status,
      voucher_type,
      total,
      amount_paid,
      due_date,
      related_sale_id,
      customer:customers(id, name),
      seller:users!sales_seller_id_fkey(id, name),
      credit_notes:sales(id, sale_number, total)
    `,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .order("sale_date", { ascending: false })
    .order("created_at", { ascending: false })

  // Apply data scope
  if (scope) {
    switch (scope.visibility) {
      case "own":
        query = query.eq("seller_id", scope.userId)
        break
      case "assigned_locations":
        if (scope.locationIds.length === 0) {
          query = query.eq(
            "location_id",
            "00000000-0000-0000-0000-000000000000",
          )
        } else {
          query = query.in("location_id", scope.locationIds)
        }
        break
      case "all":
        break
    }
  }

  if (search) {
    query = query.ilike("sale_number", `%${search}%`)
  }

  if (status) {
    query = query.eq("status", status)
  }

  if (dateFrom) {
    query = query.gte("sale_date", dateFrom)
  }

  if (dateTo) {
    query = query.lte("sale_date", dateTo)
  }

  if (minAmount !== undefined) {
    query = query.gte("total", minAmount)
  }

  if (maxAmount !== undefined) {
    query = query.lte("total", maxAmount)
  }

  if (sellerId) {
    query = query.eq("seller_id", sellerId)
  }

  if (voucherType) {
    query = query.eq("voucher_type", voucherType)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) throw error

  // Map data — normalize relations
  const mappedData = await Promise.all(
    (data || []).map(async (item: Record<string, unknown>) => {
      let availableBalance: number | null = null

      // Si es NC, calcular saldo disponible
      const voucherType = item.voucher_type as string
      if (voucherType?.startsWith("NOTA_CREDITO")) {
        const { data: apps } = await supabaseAdmin
          .from("credit_note_applications")
          .select("amount")
          .eq("credit_note_id", item.id as string)

        const used =
          apps?.reduce((sum, a) => sum + Number(a.amount), 0) || 0
        availableBalance = (item.total as number) - used
      }

      const customer = Array.isArray(item.customer)
        ? item.customer[0]
        : item.customer
      const seller = Array.isArray(item.seller)
        ? item.seller[0]
        : item.seller

      return {
        id: item.id as string,
        sale_number: item.sale_number as string,
        sale_date: item.sale_date as string,
        status: item.status as SaleListItem["status"],
        voucher_type: voucherType,
        total: item.total as number,
        amount_paid: item.amount_paid as number,
        due_date: item.due_date as string | null,
        related_sale_id: item.related_sale_id as string | null,
        availableBalance,
        customer: customer as SaleListItem["customer"],
        seller: seller as SaleListItem["seller"],
        credit_notes: (item.credit_notes ||
          []) as SaleListItem["credit_notes"],
      }
    }),
  )

  return {
    data: mappedData,
    count: count || 0,
    totalPages: Math.ceil((count || 0) / pageSize),
  }
}

export async function getCachedSaleById(
  organizationId: string,
  id: string,
): Promise<SaleWithDetails | null> {
  "use cache"
  cacheTag("sales", `sale-${id}`)
  cacheLife("minutes")

  const { data, error } = await supabaseAdmin
    .from("sales")
    .select(
      `
      *,
      amount_paid,
      due_date,
      customer:customers(id, name, email, phone, tax_id, street_address, city),
      seller:users!sales_seller_id_fkey(id, name),
      location:locations(id, name),
      items:sale_items(
        *,
        product:products(id, name, image_url, cost)
      ),
      payments(
        *,
        payment_method:payment_methods(id, name, type, fee_percentage, fee_fixed)
      ),
      credit_notes:sales!related_sale_id(id, sale_number, total, created_at),
      applied_to_sales:credit_note_applications!credit_note_applications_credit_note_id_fkey(
        id,
        amount,
        created_at,
        applied_to_sale:sales!credit_note_applications_applied_to_sale_id_fkey(id, sale_number)
      ),
      applied_credit_notes:credit_note_applications!credit_note_applications_applied_to_sale_id_fkey(
        id,
        amount,
        created_at,
        credit_note:sales!credit_note_applications_credit_note_id_fkey(id, sale_number)
      )
    `,
    )
    .eq("organization_id", organizationId)
    .eq("id", id)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw error
  }

  const sale = data as unknown as SaleWithDetails

  // Get customer payment receipts
  const receipts = await getCachedPaymentsBySaleId(id)
  sale.customer_payment_receipts = receipts

  return sale
}

async function getCachedPaymentsBySaleId(
  saleId: string,
): Promise<SaleWithDetails["customer_payment_receipts"]> {
  const { data: allocations, error: allocationsError } = await supabaseAdmin
    .from("customer_payment_allocations")
    .select("id, amount, customer_payment_id")
    .eq("sale_id", saleId)

  if (allocationsError) throw allocationsError
  if (!allocations || allocations.length === 0) return []

  const paymentIds = allocations.map((a) => a.customer_payment_id)

  const { data: payments, error: paymentsError } = await supabaseAdmin
    .from("customer_payments")
    .select("id, payment_number, payment_date, status")
    .in("id", paymentIds)

  if (paymentsError) throw paymentsError

  const { data: methods, error: methodsError } = await supabaseAdmin
    .from("customer_payment_methods")
    .select(
      "customer_payment_id, method_name, amount, payment_method:payment_methods(fee_percentage, fee_fixed)",
    )
    .in("customer_payment_id", paymentIds)

  if (methodsError) throw methodsError

  return allocations.map((allocation) => {
    const payment = payments?.find(
      (p) => p.id === allocation.customer_payment_id,
    )
    const paymentMethods =
      methods?.filter(
        (m) => m.customer_payment_id === allocation.customer_payment_id,
      ) || []

    return {
      id: allocation.id,
      amount: allocation.amount,
      payment_id: allocation.customer_payment_id,
      payment_number: payment?.payment_number || "",
      payment_date: payment?.payment_date || "",
      payment_status: payment?.status || "",
      methods: paymentMethods.map((m) => {
        const pm = m.payment_method
        const feeData = Array.isArray(pm) ? pm[0] : pm
        return {
          method_name: m.method_name,
          amount: m.amount,
          fee_percentage: feeData?.fee_percentage ?? 0,
          fee_fixed: feeData?.fee_fixed ?? 0,
        }
      }),
    }
  })
}

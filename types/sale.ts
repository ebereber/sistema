export interface Sale {
  id: string
  sale_number: string
  customer_id: string | null
  seller_id: string | null
  location_id: string | null
  subtotal: number
  discount: number
  tax: number
  total: number
  notes: string | null
  status: "COMPLETED" | "PENDING" | "CANCELLED"
  voucher_type: string
  sale_date: string
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string | null
  description: string
  sku: string | null
  quantity: number
  unit_price: number
  discount: number
  tax_rate: number
  total: number
  created_at: string
}

export interface Payment {
  id: string
  sale_id: string
  payment_method_id: string | null
  method_name: string
  amount: number
  reference: string | null
  payment_date: string
  created_at: string
}

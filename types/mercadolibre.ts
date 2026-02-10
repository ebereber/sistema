export interface MeliItem {
  id: string;
  title: string;
  price: number;
  available_quantity: number;
  status: "active" | "paused" | "closed" | "under_review" | "inactive";
  pictures: Array<{ id: string; url: string; secure_url: string }>;
  category_id: string;
  variations: MeliVariation[];
  date_created: string;
  seller_custom_field: string | null;
}

export interface MeliVariation {
  id: number;
  price: number;
  available_quantity: number;
  attribute_combinations: Array<{
    id: string;
    name: string;
    value_name: string;
  }>;
  picture_ids: string[];
  seller_custom_field: string | null;
}

export interface MeliOrderItem {
  item: {
    id: string;
    title: string;
    variation_id: number | null;
    seller_sku: string | null;
  };
  quantity: number;
  unit_price: number;
  full_unit_price: number;
  sale_fee: number;
}

export interface MeliOrderBuyer {
  id: number;
  nickname: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface MeliOrderPayment {
  id: number;
  status: "approved" | "pending" | "rejected" | "refunded" | "cancelled";
  transaction_amount: number;
  total_paid_amount: number;
  payment_method_id: string;
  payment_type: string;
}

export interface MeliOrder {
  id: number;
  status: "confirmed" | "payment_required" | "payment_in_process" | "paid" | "partially_paid" | "cancelled";
  total_amount: number;
  paid_amount: number;
  currency_id: string;
  order_items: MeliOrderItem[];
  buyer: MeliOrderBuyer;
  payments: MeliOrderPayment[];
  date_created: string;
  date_closed: string | null;
  tags: string[];
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cash_register_movements: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          performed_by: string
          shift_id: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          performed_by: string
          shift_id: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          performed_by?: string
          shift_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_movements_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "cash_register_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_register_shifts: {
        Row: {
          cash_register_id: string
          closed_at: string | null
          closed_by: string | null
          counted_amount: number | null
          created_at: string
          discrepancy: number | null
          discrepancy_notes: string | null
          discrepancy_reason: string | null
          expected_amount: number | null
          id: string
          left_in_cash: number | null
          notes: string | null
          opened_at: string
          opened_by: string
          opening_amount: number
          status: string
          updated_at: string
        }
        Insert: {
          cash_register_id: string
          closed_at?: string | null
          closed_by?: string | null
          counted_amount?: number | null
          created_at?: string
          discrepancy?: number | null
          discrepancy_notes?: string | null
          discrepancy_reason?: string | null
          expected_amount?: number | null
          id?: string
          left_in_cash?: number | null
          notes?: string | null
          opened_at?: string
          opened_by: string
          opening_amount?: number
          status?: string
          updated_at?: string
        }
        Update: {
          cash_register_id?: string
          closed_at?: string | null
          closed_by?: string | null
          counted_amount?: number | null
          created_at?: string
          discrepancy?: number | null
          discrepancy_notes?: string | null
          discrepancy_reason?: string | null
          expected_amount?: number | null
          id?: string
          left_in_cash?: number | null
          notes?: string | null
          opened_at?: string
          opened_by?: string
          opening_amount?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_shifts_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          created_at: string
          id: string
          location_id: string
          name: string
          point_of_sale_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          name: string
          point_of_sale_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          name?: string
          point_of_sale_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_registers_point_of_sale_id_fkey"
            columns: ["point_of_sale_id"]
            isOneToOne: false
            referencedRelation: "point_of_sale"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_note_applications: {
        Row: {
          amount: number
          applied_to_sale_id: string
          created_at: string
          credit_note_id: string
          id: string
        }
        Insert: {
          amount: number
          applied_to_sale_id: string
          created_at?: string
          credit_note_id: string
          id?: string
        }
        Update: {
          amount?: number
          applied_to_sale_id?: string
          created_at?: string
          credit_note_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_note_applications_applied_to_sale_id_fkey"
            columns: ["applied_to_sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_applications_credit_note_id_fkey"
            columns: ["credit_note_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_payment_allocations: {
        Row: {
          amount: number
          created_at: string
          customer_payment_id: string
          id: string
          sale_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_payment_id: string
          id?: string
          sale_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_payment_id?: string
          id?: string
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_payment_allocations_customer_payment_id_fkey"
            columns: ["customer_payment_id"]
            isOneToOne: false
            referencedRelation: "customer_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payment_allocations_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_payment_methods: {
        Row: {
          amount: number
          cash_register_id: string | null
          created_at: string
          customer_payment_id: string
          id: string
          method_name: string
          payment_method_id: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          cash_register_id?: string | null
          created_at?: string
          customer_payment_id: string
          id?: string
          method_name: string
          payment_method_id?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          cash_register_id?: string | null
          created_at?: string
          customer_payment_id?: string
          id?: string
          method_name?: string
          payment_method_id?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_payment_methods_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payment_methods_customer_payment_id_fkey"
            columns: ["customer_payment_id"]
            isOneToOne: false
            referencedRelation: "customer_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payment_methods_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_payments: {
        Row: {
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          notes: string | null
          payment_date: string
          payment_number: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_number: string
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_number?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          active: boolean | null
          apartment: string | null
          assigned_seller_id: string | null
          city: string | null
          created_at: string
          email: string | null
          id: string
          legal_entity_type: string | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          postal_code: string | null
          price_list_id: string | null
          province: string | null
          street_address: string | null
          tax_category: string | null
          tax_id: string | null
          tax_id_type: string | null
          trade_name: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          apartment?: string | null
          assigned_seller_id?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          legal_entity_type?: string | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          postal_code?: string | null
          price_list_id?: string | null
          province?: string | null
          street_address?: string | null
          tax_category?: string | null
          tax_id?: string | null
          tax_id_type?: string | null
          trade_name?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          apartment?: string | null
          assigned_seller_id?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          legal_entity_type?: string | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          postal_code?: string | null
          price_list_id?: string | null
          province?: string | null
          street_address?: string | null
          tax_category?: string | null
          tax_id?: string | null
          tax_id_type?: string | null
          trade_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_assigned_seller_id_fkey"
            columns: ["assigned_seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          active: boolean | null
          address: string | null
          created_at: string
          id: string
          is_main: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          created_at?: string
          id?: string
          is_main?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          address?: string | null
          created_at?: string
          id?: string
          is_main?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          availability: string
          created_at: string
          fee_fixed: number
          fee_percentage: number
          icon: string
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          requires_reference: boolean
          type: string
          updated_at: string
        }
        Insert: {
          availability?: string
          created_at?: string
          fee_fixed?: number
          fee_percentage?: number
          icon: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          requires_reference?: boolean
          type: string
          updated_at?: string
        }
        Update: {
          availability?: string
          created_at?: string
          fee_fixed?: number
          fee_percentage?: number
          icon?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          requires_reference?: boolean
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method_name: string
          payment_date: string
          payment_method_id: string | null
          reference: string | null
          sale_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method_name: string
          payment_date?: string
          payment_method_id?: string | null
          reference?: string | null
          sale_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method_name?: string
          payment_date?: string
          payment_method_id?: string | null
          reference?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      point_of_sale: {
        Row: {
          active: boolean | null
          created_at: string
          enabled_for_arca: boolean | null
          id: string
          is_digital: boolean | null
          location_id: string | null
          name: string
          number: number
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          enabled_for_arca?: boolean | null
          id?: string
          is_digital?: boolean | null
          location_id?: string | null
          name: string
          number: number
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          enabled_for_arca?: boolean | null
          id?: string
          is_digital?: boolean | null
          location_id?: string | null
          name?: string
          number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_of_sale_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          cost: number | null
          created_at: string
          created_by: string | null
          id: string
          margin_percentage: number | null
          price: number
          product_id: string
          reason: string | null
          tax_rate: number | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          margin_percentage?: number | null
          price: number
          product_id: string
          reason?: string | null
          tax_rate?: number | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          margin_percentage?: number | null
          price?: number
          product_id?: string
          reason?: string | null
          tax_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "price_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      price_lists: {
        Row: {
          active: boolean | null
          adjustment_percentage: number | null
          adjustment_type: string | null
          created_at: string
          description: string | null
          id: string
          includes_tax: boolean | null
          is_automatic: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          adjustment_percentage?: number | null
          adjustment_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          includes_tax?: boolean | null
          is_automatic?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          adjustment_percentage?: number | null
          adjustment_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          includes_tax?: boolean | null
          is_automatic?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean | null
          barcode: string | null
          category_id: string | null
          cost: number | null
          created_at: string
          currency: string
          default_supplier_id: string | null
          description: string | null
          id: string
          image_url: string | null
          margin_percentage: number | null
          min_stock: number | null
          name: string
          oem_code: string | null
          price: number
          product_type: Database["public"]["Enums"]["product_type"]
          sku: string
          stock_quantity: number | null
          tax_rate: number
          track_stock: boolean | null
          updated_at: string
          visibility: string | null
        }
        Insert: {
          active?: boolean | null
          barcode?: string | null
          category_id?: string | null
          cost?: number | null
          created_at?: string
          currency?: string
          default_supplier_id?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          margin_percentage?: number | null
          min_stock?: number | null
          name: string
          oem_code?: string | null
          price: number
          product_type?: Database["public"]["Enums"]["product_type"]
          sku: string
          stock_quantity?: number | null
          tax_rate?: number
          track_stock?: boolean | null
          updated_at?: string
          visibility?: string | null
        }
        Update: {
          active?: boolean | null
          barcode?: string | null
          category_id?: string | null
          cost?: number | null
          created_at?: string
          currency?: string
          default_supplier_id?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          margin_percentage?: number | null
          min_stock?: number | null
          name?: string
          oem_code?: string | null
          price?: number
          product_type?: Database["public"]["Enums"]["product_type"]
          sku?: string
          stock_quantity?: number | null
          tax_rate?: number
          track_stock?: boolean | null
          updated_at?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_default_supplier_id_fkey"
            columns: ["default_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_items: {
        Row: {
          created_at: string
          id: string
          name: string
          product_id: string | null
          purchase_id: string
          quantity: number
          sku: string | null
          subtotal: number
          type: string
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          product_id?: string | null
          purchase_id: string
          quantity?: number
          sku?: string | null
          subtotal?: number
          type?: string
          unit_cost?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          product_id?: string | null
          purchase_id?: string
          quantity?: number
          sku?: string | null
          subtotal?: number
          type?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_history: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          field_name: string | null
          id: string
          new_value: string | null
          old_value: string | null
          purchase_order_id: string
        }
        Insert: {
          action: string
          created_at?: string
          created_by?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          purchase_order_id: string
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          purchase_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_history_order_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_history_user_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          name: string
          product_id: string | null
          purchase_order_id: string
          quantity: number
          quantity_received: number
          sku: string | null
          subtotal: number
          type: string
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          product_id?: string | null
          purchase_order_id: string
          quantity?: number
          quantity_received?: number
          sku?: string | null
          subtotal?: number
          type?: string
          unit_cost?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          product_id?: string | null
          purchase_order_id?: string
          quantity?: number
          quantity_received?: number
          sku?: string | null
          subtotal?: number
          type?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_order_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          discount: number
          expected_delivery_date: string | null
          id: string
          location_id: string | null
          notes: string | null
          order_date: string
          order_number: string
          status: string
          subtotal: number
          supplier_id: string
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          discount?: number
          expected_delivery_date?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          order_date?: string
          order_number: string
          status?: string
          subtotal?: number
          supplier_id: string
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          discount?: number
          expected_delivery_date?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          order_date?: string
          order_number?: string
          status?: string
          subtotal?: number
          supplier_id?: string
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          accounting_date: string | null
          amount_paid: number | null
          attachment_url: string | null
          created_at: string
          created_by: string | null
          discount: number
          due_date: string | null
          id: string
          invoice_date: string
          location_id: string | null
          notes: string | null
          payment_status: string | null
          products_received: boolean
          purchase_number: string | null
          purchase_order_id: string | null
          status: string
          subtotal: number
          supplier_id: string
          tax: number
          tax_category: string | null
          total: number
          updated_at: string
          voucher_number: string
          voucher_type: string
        }
        Insert: {
          accounting_date?: string | null
          amount_paid?: number | null
          attachment_url?: string | null
          created_at?: string
          created_by?: string | null
          discount?: number
          due_date?: string | null
          id?: string
          invoice_date: string
          location_id?: string | null
          notes?: string | null
          payment_status?: string | null
          products_received?: boolean
          purchase_number?: string | null
          purchase_order_id?: string | null
          status?: string
          subtotal?: number
          supplier_id: string
          tax?: number
          tax_category?: string | null
          total?: number
          updated_at?: string
          voucher_number: string
          voucher_type: string
        }
        Update: {
          accounting_date?: string | null
          amount_paid?: number | null
          attachment_url?: string | null
          created_at?: string
          created_by?: string | null
          discount?: number
          due_date?: string | null
          id?: string
          invoice_date?: string
          location_id?: string | null
          notes?: string | null
          payment_status?: string | null
          products_received?: boolean
          purchase_number?: string | null
          purchase_order_id?: string | null
          status?: string
          subtotal?: number
          supplier_id?: string
          tax?: number
          tax_category?: string | null
          total?: number
          updated_at?: string
          voucher_number?: string
          voucher_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string | null
          discount: number
          id: string
          items: Json
          location_id: string | null
          notes: string | null
          quote_number: string
          status: string
          subtotal: number
          total: number
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount?: number
          id?: string
          items?: Json
          location_id?: string | null
          notes?: string | null
          quote_number: string
          status?: string
          subtotal?: number
          total?: number
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount?: number
          id?: string
          items?: Json
          location_id?: string | null
          notes?: string | null
          quote_number?: string
          status?: string
          subtotal?: number
          total?: number
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          active: boolean
          created_at: string
          id: string
          is_system: boolean
          name: string
          permissions: Json
          special_actions: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          permissions?: Json
          special_actions?: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          permissions?: Json
          special_actions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          created_at: string
          description: string
          discount: number
          id: string
          product_id: string | null
          quantity: number
          sale_id: string
          sku: string | null
          tax_rate: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          discount?: number
          id?: string
          product_id?: string | null
          quantity: number
          sale_id: string
          sku?: string | null
          tax_rate?: number
          total: number
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string
          discount?: number
          id?: string
          product_id?: string | null
          quantity?: number
          sale_id?: string
          sku?: string | null
          tax_rate?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amount_paid: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          discount: number
          due_date: string | null
          id: string
          location_id: string | null
          notes: string | null
          related_sale_id: string | null
          sale_date: string
          sale_number: string
          seller_id: string | null
          shift_id: string | null
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
          voucher_type: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount?: number
          due_date?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          related_sale_id?: string | null
          sale_date?: string
          sale_number: string
          seller_id?: string | null
          shift_id?: string | null
          status?: string
          subtotal: number
          tax: number
          total: number
          updated_at?: string
          voucher_type?: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount?: number
          due_date?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          related_sale_id?: string | null
          sale_date?: string
          sale_number?: string
          seller_id?: string | null
          shift_id?: string | null
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          voucher_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_related_sale_id_fkey"
            columns: ["related_sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "cash_register_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      stock: {
        Row: {
          id: string
          location_id: string
          product_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          id?: string
          location_id: string
          product_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          id?: string
          location_id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          location_from_id: string | null
          location_to_id: string | null
          product_id: string
          quantity: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          location_from_id?: string | null
          location_to_id?: string | null
          product_id: string
          quantity: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          location_from_id?: string | null
          location_to_id?: string | null
          product_id?: string
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_location_from_id_fkey"
            columns: ["location_from_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_location_to_id_fkey"
            columns: ["location_to_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payment_allocations: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          payment_id: string
          purchase_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          payment_id: string
          purchase_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          payment_id?: string
          purchase_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "supplier_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payment_allocations_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payment_methods: {
        Row: {
          amount: number
          cash_register_id: string | null
          created_at: string | null
          id: string
          method_name: string
          payment_id: string
          reference: string | null
        }
        Insert: {
          amount: number
          cash_register_id?: string | null
          created_at?: string | null
          id?: string
          method_name: string
          payment_id: string
          reference?: string | null
        }
        Update: {
          amount?: number
          cash_register_id?: string | null
          created_at?: string | null
          id?: string
          method_name?: string
          payment_id?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payment_methods_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payment_methods_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "supplier_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payments: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          on_account_amount: number | null
          payment_date: string
          payment_number: string
          status: string | null
          supplier_id: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          on_account_amount?: number | null
          payment_date?: string
          payment_number: string
          status?: string | null
          supplier_id: string
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          on_account_amount?: number | null
          payment_date?: string
          payment_number?: string
          status?: string | null
          supplier_id?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean | null
          address: string | null
          apartment: string | null
          business_description: string | null
          city: string | null
          contact_person: string | null
          created_at: string
          credit_balance: number | null
          email: string | null
          id: string
          legal_entity_type: string | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          street_address: string | null
          tax_category: string | null
          tax_id: string | null
          tax_id_type: string | null
          trade_name: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          apartment?: string | null
          business_description?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string
          credit_balance?: number | null
          email?: string | null
          id?: string
          legal_entity_type?: string | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          street_address?: string | null
          tax_category?: string | null
          tax_id?: string | null
          tax_id_type?: string | null
          trade_name?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          address?: string | null
          apartment?: string | null
          business_description?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string
          credit_balance?: number | null
          email?: string | null
          id?: string
          legal_entity_type?: string | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          street_address?: string | null
          tax_category?: string | null
          tax_id?: string | null
          tax_id_type?: string | null
          trade_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_cash_registers: {
        Row: {
          cash_register_id: string
          user_id: string
        }
        Insert: {
          cash_register_id: string
          user_id: string
        }
        Update: {
          cash_register_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cash_registers_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_cash_registers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          cash_register_ids: Json
          commission_percentage: number
          created_at: string
          data_visibility_scope: string
          email: string
          id: string
          invited_by: string | null
          location_ids: Json
          max_discount_percentage: number
          role_id: string
          status: string
          updated_at: string
        }
        Insert: {
          cash_register_ids?: Json
          commission_percentage?: number
          created_at?: string
          data_visibility_scope?: string
          email: string
          id?: string
          invited_by?: string | null
          location_ids?: Json
          max_discount_percentage?: number
          role_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          cash_register_ids?: Json
          commission_percentage?: number
          created_at?: string
          data_visibility_scope?: string
          email?: string
          id?: string
          invited_by?: string | null
          location_ids?: Json
          max_discount_percentage?: number
          role_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_locations: {
        Row: {
          location_id: string
          user_id: string
        }
        Insert: {
          location_id: string
          user_id: string
        }
        Update: {
          location_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          active: boolean | null
          commission_percentage: number
          created_at: string
          data_visibility_scope: string
          email: string
          id: string
          max_discount_percentage: number
          name: string | null
          role: Database["public"]["Enums"]["user_role"]
          role_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          commission_percentage?: number
          created_at?: string
          data_visibility_scope?: string
          email: string
          id: string
          max_discount_percentage?: number
          name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          role_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          commission_percentage?: number
          created_at?: string
          data_visibility_scope?: string
          email?: string
          id?: string
          max_discount_percentage?: number
          name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          role_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrease_stock: {
        Args: {
          p_location_id: string
          p_product_id: string
          p_quantity: number
        }
        Returns: undefined
      }
      generate_customer_payment_number: {
        Args: { pos_number?: number }
        Returns: string
      }
      generate_payment_number: {
        Args: { pos_number?: number }
        Returns: string
      }
      generate_purchase_number: {
        Args: { location_id_param: string }
        Returns: string
      }
      generate_purchase_order_number: { Args: never; Returns: string }
      generate_quote_number: { Args: { pos_number?: number }; Returns: string }
      generate_sale_number: {
        Args: { location_id_param: string; prefix_param?: string }
        Returns: string
      }
      get_available_credit_notes: {
        Args: { customer_id_param: string }
        Returns: {
          available_balance: number
          created_at: string
          id: string
          sale_number: string
          total: number
        }[]
      }
      increase_stock: {
        Args: {
          p_location_id: string
          p_product_id: string
          p_quantity: number
        }
        Returns: undefined
      }
      increase_stock_from_purchase: {
        Args: {
          p_location_id: string
          p_product_id: string
          p_quantity: number
        }
        Returns: undefined
      }
    }
    Enums: {
      product_type: "PRODUCT" | "SERVICE"
      user_role: "ADMIN" | "SELLER" | "VIEWER"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      product_type: ["PRODUCT", "SERVICE"],
      user_role: ["ADMIN", "SELLER", "VIEWER"],
    },
  },
} as const

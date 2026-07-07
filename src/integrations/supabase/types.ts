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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      amoe_entries: {
        Row: {
          address1: string | null
          address2: string | null
          city: string | null
          created_at: string
          dob: string | null
          draw_date: string | null
          draw_entry_id: string | null
          email: string
          essay: string
          full_name: string
          id: string
          ip: unknown
          phone: string
          source: string
          state: string | null
          user_agent: string | null
          user_id: string | null
          zip: string | null
        }
        Insert: {
          address1?: string | null
          address2?: string | null
          city?: string | null
          created_at?: string
          dob?: string | null
          draw_date?: string | null
          draw_entry_id?: string | null
          email: string
          essay: string
          full_name: string
          id?: string
          ip?: unknown
          phone: string
          source?: string
          state?: string | null
          user_agent?: string | null
          user_id?: string | null
          zip?: string | null
        }
        Update: {
          address1?: string | null
          address2?: string | null
          city?: string | null
          created_at?: string
          dob?: string | null
          draw_date?: string | null
          draw_entry_id?: string | null
          email?: string
          essay?: string
          full_name?: string
          id?: string
          ip?: unknown
          phone?: string
          source?: string
          state?: string | null
          user_agent?: string | null
          user_id?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          id: boolean
          mile_shipping_enabled: boolean
          shipping_base_price: number
          shipping_price_per_mile: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: boolean
          mile_shipping_enabled?: boolean
          shipping_base_price?: number
          shipping_price_per_mile?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: boolean
          mile_shipping_enabled?: boolean
          shipping_base_price?: number
          shipping_price_per_mile?: number
          updated_at?: string
        }
        Relationships: []
      }
      business_offers: {
        Row: {
          business_id: string
          created_at: string
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          is_active: boolean
          product_id: string | null
          starts_at: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          discount_type: string
          discount_value: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          product_id?: string | null
          starts_at?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          product_id?: string | null
          starts_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_offers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "business_products"
            referencedColumns: ["id"]
          },
        ]
      }
      business_products: {
        Row: {
          business_id: string
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          business_id: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price: number
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string
          approved_at: string | null
          approved_by: string | null
          business_name: string
          business_type: string
          city: string | null
          created_at: string
          email: string
          id: string
          logo_url: string | null
          owner_user_id: string
          phone: string
          rejection_reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address: string
          approved_at?: string | null
          approved_by?: string | null
          business_name: string
          business_type: string
          city?: string | null
          created_at?: string
          email: string
          id?: string
          logo_url?: string | null
          owner_user_id: string
          phone: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string
          approved_at?: string | null
          approved_by?: string | null
          business_name?: string
          business_type?: string
          city?: string | null
          created_at?: string
          email?: string
          id?: string
          logo_url?: string | null
          owner_user_id?: string
          phone?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      courier_order_stops: {
        Row: {
          created_at: string
          delivered_at: string | null
          delivery_address: string
          delivery_lat: number
          delivery_lng: number
          failure_reason: string | null
          id: string
          order_id: string
          proof_code: string | null
          proof_type: Database["public"]["Enums"]["courier_proof_type"]
          proof_url: string | null
          recipient_name: string | null
          recipient_phone: string | null
          sequence_number: number
          status: Database["public"]["Enums"]["courier_stop_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          delivery_address: string
          delivery_lat: number
          delivery_lng: number
          failure_reason?: string | null
          id?: string
          order_id: string
          proof_code?: string | null
          proof_type?: Database["public"]["Enums"]["courier_proof_type"]
          proof_url?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          sequence_number: number
          status?: Database["public"]["Enums"]["courier_stop_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          delivery_address?: string
          delivery_lat?: number
          delivery_lng?: number
          failure_reason?: string | null
          id?: string
          order_id?: string
          proof_code?: string | null
          proof_type?: Database["public"]["Enums"]["courier_proof_type"]
          proof_url?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          sequence_number?: number
          status?: Database["public"]["Enums"]["courier_stop_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courier_order_stops_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "courier_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      courier_orders: {
        Row: {
          accepted_at: string | null
          batch_id: string | null
          batch_position: number | null
          cancellation_reason: string | null
          completed_at: string | null
          created_at: string
          driver_id: string | null
          estimated_duration_minutes: number
          estimated_earnings: number
          id: string
          picked_up_at: string | null
          pickup_address: string
          pickup_contact_name: string | null
          pickup_lat: number
          pickup_lng: number
          pickup_notes: string | null
          status: Database["public"]["Enums"]["courier_order_status"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          batch_id?: string | null
          batch_position?: number | null
          cancellation_reason?: string | null
          completed_at?: string | null
          created_at?: string
          driver_id?: string | null
          estimated_duration_minutes?: number
          estimated_earnings?: number
          id?: string
          picked_up_at?: string | null
          pickup_address: string
          pickup_contact_name?: string | null
          pickup_lat: number
          pickup_lng: number
          pickup_notes?: string | null
          status?: Database["public"]["Enums"]["courier_order_status"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          batch_id?: string | null
          batch_position?: number | null
          cancellation_reason?: string | null
          completed_at?: string | null
          created_at?: string
          driver_id?: string | null
          estimated_duration_minutes?: number
          estimated_earnings?: number
          id?: string
          picked_up_at?: string | null
          pickup_address?: string
          pickup_contact_name?: string | null
          pickup_lat?: number
          pickup_lng?: number
          pickup_notes?: string | null
          status?: Database["public"]["Enums"]["courier_order_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courier_orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          issue_id: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          issue_id?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          issue_id?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notifications_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "order_item_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_draw_entries: {
        Row: {
          created_at: string
          display_name: string
          draw_date: string
          id: string
          source: string
          subject_email: string | null
          subject_user_id: string | null
          tickets: number
        }
        Insert: {
          created_at?: string
          display_name: string
          draw_date: string
          id?: string
          source?: string
          subject_email?: string | null
          subject_user_id?: string | null
          tickets?: number
        }
        Update: {
          created_at?: string
          display_name?: string
          draw_date?: string
          id?: string
          source?: string
          subject_email?: string | null
          subject_user_id?: string | null
          tickets?: number
        }
        Relationships: []
      }
      daily_draws: {
        Row: {
          created_at: string
          draw_date: string
          drawn_at: string | null
          entrants_total: number
          id: string
          notified_5min_at: string | null
          prize_usd: number
          rolled_over_from: string | null
          scheduled_at: string
          seed_hash: string | null
          status: string
          tickets_total: number
          updated_at: string
          winner_display_name: string | null
        }
        Insert: {
          created_at?: string
          draw_date: string
          drawn_at?: string | null
          entrants_total?: number
          id?: string
          notified_5min_at?: string | null
          prize_usd?: number
          rolled_over_from?: string | null
          scheduled_at: string
          seed_hash?: string | null
          status?: string
          tickets_total?: number
          updated_at?: string
          winner_display_name?: string | null
        }
        Update: {
          created_at?: string
          draw_date?: string
          drawn_at?: string | null
          entrants_total?: number
          id?: string
          notified_5min_at?: string | null
          prize_usd?: number
          rolled_over_from?: string | null
          scheduled_at?: string
          seed_hash?: string | null
          status?: string
          tickets_total?: number
          updated_at?: string
          winner_display_name?: string | null
        }
        Relationships: []
      }
      delivery_bookings: {
        Row: {
          address: string | null
          created_at: string
          delivered_at: string | null
          delivered_by: string | null
          id: string
          notes: string | null
          period_end: string
          period_start: string
          price_id: string
          proof_description: string | null
          proof_photo_path: string | null
          scheduled_date: string
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          delivered_at?: string | null
          delivered_by?: string | null
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          price_id: string
          proof_description?: string | null
          proof_photo_path?: string | null
          scheduled_date: string
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          delivered_at?: string | null
          delivered_by?: string | null
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          price_id?: string
          proof_description?: string | null
          proof_photo_path?: string | null
          scheduled_date?: string
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_bookings_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_pricing_config: {
        Row: {
          base_distance_miles: number
          base_fee: number
          created_at: string
          extra_fee_per_mile: number
          heavy_handling_fee: number
          id: string
          max_standard_weight_kg: number
          updated_at: string
        }
        Insert: {
          base_distance_miles?: number
          base_fee?: number
          created_at?: string
          extra_fee_per_mile?: number
          heavy_handling_fee?: number
          id?: string
          max_standard_weight_kg?: number
          updated_at?: string
        }
        Update: {
          base_distance_miles?: number
          base_fee?: number
          created_at?: string
          extra_fee_per_mile?: number
          heavy_handling_fee?: number
          id?: string
          max_standard_weight_kg?: number
          updated_at?: string
        }
        Relationships: []
      }
      delivery_routes: {
        Row: {
          accepted_at: string | null
          completed_at: string | null
          created_at: string
          delivery_day: Database["public"]["Enums"]["dispatch_day"]
          dispatch_date: string
          driver_id: string | null
          fixed_pay: number
          id: string
          route_name: string
          status: Database["public"]["Enums"]["route_status"]
          total_stops: number
          warehouse_checkin_at: string | null
          zone_id: string
        }
        Insert: {
          accepted_at?: string | null
          completed_at?: string | null
          created_at?: string
          delivery_day: Database["public"]["Enums"]["dispatch_day"]
          dispatch_date: string
          driver_id?: string | null
          fixed_pay: number
          id?: string
          route_name: string
          status?: Database["public"]["Enums"]["route_status"]
          total_stops: number
          warehouse_checkin_at?: string | null
          zone_id: string
        }
        Update: {
          accepted_at?: string | null
          completed_at?: string | null
          created_at?: string
          delivery_day?: Database["public"]["Enums"]["dispatch_day"]
          dispatch_date?: string
          driver_id?: string | null
          fixed_pay?: number
          id?: string
          route_name?: string
          status?: Database["public"]["Enums"]["route_status"]
          total_stops?: number
          warehouse_checkin_at?: string | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_routes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_routes_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_routes_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "v_pending_batch_summary"
            referencedColumns: ["zone_id"]
          },
          {
            foreignKeyName: "delivery_routes_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "v_zone_dispatch_summary"
            referencedColumns: ["zone_id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          active: boolean
          display_name: string
          id: string
        }
        Insert: {
          active?: boolean
          display_name: string
          id: string
        }
        Update: {
          active?: boolean
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      donations: {
        Row: {
          amount: number
          created_at: string
          currency: string
          deleted_at: string | null
          id: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          tier: Database["public"]["Enums"]["donation_tier"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tier: Database["public"]["Enums"]["donation_tier"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tier?: Database["public"]["Enums"]["donation_tier"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      driver_documents: {
        Row: {
          document_type: Database["public"]["Enums"]["driver_document_type"]
          driver_id: string
          expiration_date: string | null
          file_url: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["driver_document_status"]
          updated_at: string
          uploaded_at: string
        }
        Insert: {
          document_type: Database["public"]["Enums"]["driver_document_type"]
          driver_id: string
          expiration_date?: string | null
          file_url: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["driver_document_status"]
          updated_at?: string
          uploaded_at?: string
        }
        Update: {
          document_type?: Database["public"]["Enums"]["driver_document_type"]
          driver_id?: string
          expiration_date?: string | null
          file_url?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["driver_document_status"]
          updated_at?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_earnings: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          paid_at: string | null
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["driver_earnings_status"]
          total_amount: number
          total_deliveries: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          paid_at?: string | null
          period_end: string
          period_start: string
          status?: Database["public"]["Enums"]["driver_earnings_status"]
          total_amount?: number
          total_deliveries?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          paid_at?: string | null
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["driver_earnings_status"]
          total_amount?: number
          total_deliveries?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_earnings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_instant_payouts: {
        Row: {
          admin_notes: string | null
          amount: number
          driver_id: string
          fee_amount: number
          id: string
          net_amount: number
          payout_method_id: string | null
          processed_at: string | null
          reject_reason: string | null
          requested_at: string
          status: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          driver_id: string
          fee_amount?: number
          id?: string
          net_amount: number
          payout_method_id?: string | null
          processed_at?: string | null
          reject_reason?: string | null
          requested_at?: string
          status?: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          driver_id?: string
          fee_amount?: number
          id?: string
          net_amount?: number
          payout_method_id?: string | null
          processed_at?: string | null
          reject_reason?: string | null
          requested_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_instant_payouts_payout_method_id_fkey"
            columns: ["payout_method_id"]
            isOneToOne: false
            referencedRelation: "driver_payout_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_order_earnings: {
        Row: {
          base_amount: number
          bonus_amount: number
          created_at: string
          distance_amount: number
          distance_km: number | null
          driver_id: string
          earned_at: string
          id: string
          notes: string | null
          order_id: string
          paid_out_at: string | null
          tip_amount: number
          total_amount: number
        }
        Insert: {
          base_amount?: number
          bonus_amount?: number
          created_at?: string
          distance_amount?: number
          distance_km?: number | null
          driver_id: string
          earned_at?: string
          id?: string
          notes?: string | null
          order_id: string
          paid_out_at?: string | null
          tip_amount?: number
          total_amount?: number
        }
        Update: {
          base_amount?: number
          bonus_amount?: number
          created_at?: string
          distance_amount?: number
          distance_km?: number | null
          driver_id?: string
          earned_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          paid_out_at?: string | null
          tip_amount?: number
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "driver_order_earnings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "courier_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_payout_methods: {
        Row: {
          account_details: Json
          account_holder: string
          created_at: string
          display_label: string
          driver_id: string
          id: string
          is_default: boolean
          method_type: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          account_details?: Json
          account_holder: string
          created_at?: string
          display_label: string
          driver_id: string
          id?: string
          is_default?: boolean
          method_type: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          account_details?: Json
          account_holder?: string
          created_at?: string
          display_label?: string
          driver_id?: string
          id?: string
          is_default?: boolean
          method_type?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      driver_payouts: {
        Row: {
          amount_net: number
          amount_requested: number
          completed_at: string | null
          driver_id: string
          fee: number
          id: string
          requested_at: string
          status: Database["public"]["Enums"]["driver_payout_status"]
          stripe_error: string | null
          stripe_payout_id: string | null
        }
        Insert: {
          amount_net: number
          amount_requested: number
          completed_at?: string | null
          driver_id: string
          fee?: number
          id?: string
          requested_at?: string
          status?: Database["public"]["Enums"]["driver_payout_status"]
          stripe_error?: string | null
          stripe_payout_id?: string | null
        }
        Update: {
          amount_net?: number
          amount_requested?: number
          completed_at?: string | null
          driver_id?: string
          fee?: number
          id?: string
          requested_at?: string
          status?: Database["public"]["Enums"]["driver_payout_status"]
          stripe_error?: string | null
          stripe_payout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_payouts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_ratings: {
        Row: {
          comment: string | null
          created_at: string
          customer_id: string
          driver_id: string
          id: string
          order_id: string
          stars: number
          tags: string[] | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id: string
          driver_id: string
          id?: string
          order_id: string
          stars: number
          tags?: string[] | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string
          driver_id?: string
          id?: string
          order_id?: string
          stars?: number
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "courier_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_vehicles: {
        Row: {
          brand: string | null
          created_at: string
          driver_id: string
          id: string
          model: string | null
          plate_number: string | null
          updated_at: string
          vehicle_photo_url: string | null
          vehicle_type: Database["public"]["Enums"]["driver_vehicle_type"]
          year: number | null
        }
        Insert: {
          brand?: string | null
          created_at?: string
          driver_id: string
          id?: string
          model?: string | null
          plate_number?: string | null
          updated_at?: string
          vehicle_photo_url?: string | null
          vehicle_type: Database["public"]["Enums"]["driver_vehicle_type"]
          year?: number | null
        }
        Update: {
          brand?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          model?: string | null
          plate_number?: string | null
          updated_at?: string
          vehicle_photo_url?: string | null
          vehicle_type?: Database["public"]["Enums"]["driver_vehicle_type"]
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_wallets: {
        Row: {
          available_balance: number
          driver_id: string
          lifetime_earnings: number
          pending_balance: number
          updated_at: string
        }
        Insert: {
          available_balance?: number
          driver_id: string
          lifetime_earnings?: number
          pending_balance?: number
          updated_at?: string
        }
        Update: {
          available_balance?: number
          driver_id?: string
          lifetime_earnings?: number
          pending_balance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_wallets_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          address: string
          agreement_accepted_at: string | null
          application_status: Database["public"]["Enums"]["driver_application_status"]
          approved_at: string | null
          approved_by: string | null
          city: string
          created_at: string
          date_of_birth: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          is_online: boolean
          last_lat: number | null
          last_lng: number | null
          last_seen_at: string | null
          onboarding_completed_at: string | null
          phone: string
          preferred_gps_app: string | null
          profile_photo_url: string | null
          rating: number
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          stripe_account_id: string | null
          stripe_payouts_enabled: boolean
          total_deliveries: number
          tutorial_completed_at: string | null
          updated_at: string
          went_online_at: string | null
        }
        Insert: {
          address: string
          agreement_accepted_at?: string | null
          application_status?: Database["public"]["Enums"]["driver_application_status"]
          approved_at?: string | null
          approved_by?: string | null
          city: string
          created_at?: string
          date_of_birth: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          is_online?: boolean
          last_lat?: number | null
          last_lng?: number | null
          last_seen_at?: string | null
          onboarding_completed_at?: string | null
          phone: string
          preferred_gps_app?: string | null
          profile_photo_url?: string | null
          rating?: number
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          stripe_account_id?: string | null
          stripe_payouts_enabled?: boolean
          total_deliveries?: number
          tutorial_completed_at?: string | null
          updated_at?: string
          went_online_at?: string | null
        }
        Update: {
          address?: string
          agreement_accepted_at?: string | null
          application_status?: Database["public"]["Enums"]["driver_application_status"]
          approved_at?: string | null
          approved_by?: string | null
          city?: string
          created_at?: string
          date_of_birth?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          is_online?: boolean
          last_lat?: number | null
          last_lng?: number | null
          last_seen_at?: string | null
          onboarding_completed_at?: string | null
          phone?: string
          preferred_gps_app?: string | null
          profile_photo_url?: string | null
          rating?: number
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          stripe_account_id?: string | null
          stripe_payouts_enabled?: boolean
          total_deliveries?: number
          tutorial_completed_at?: string | null
          updated_at?: string
          went_online_at?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      internal_hook_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      mission_claims: {
        Row: {
          created_at: string
          guest_email: string | null
          id: string
          mission_key: string
          tokens_awarded: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          guest_email?: string | null
          id?: string
          mission_key: string
          tokens_awarded: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          guest_email?: string | null
          id?: string
          mission_key?: string
          tokens_awarded?: number
          user_id?: string | null
        }
        Relationships: []
      }
      mission_starts: {
        Row: {
          guest_email: string | null
          id: string
          mission_key: string
          started_at: string
          user_id: string | null
        }
        Insert: {
          guest_email?: string | null
          id?: string
          mission_key: string
          started_at?: string
          user_id?: string | null
        }
        Update: {
          guest_email?: string | null
          id?: string
          mission_key?: string
          started_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          created_at: string
          id: string
          payload: Json
          processed: boolean
          route_stop_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          processed?: boolean
          route_stop_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          processed?: boolean
          route_stop_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_route_stop_id_fkey"
            columns: ["route_stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_issues: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          item_index: number
          order_id: string
          original_price: number
          original_qty: number
          product_name: string
          replacement_image: string | null
          replacement_name: string | null
          replacement_price: number | null
          replacement_product_id: string | null
          resolved_at: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_index: number
          order_id: string
          original_price?: number
          original_qty?: number
          product_name: string
          replacement_image?: string | null
          replacement_name?: string | null
          replacement_price?: number | null
          replacement_product_id?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_index?: number
          order_id?: string
          original_price?: number
          original_qty?: number
          product_name?: string
          replacement_image?: string | null
          replacement_name?: string | null
          replacement_price?: number | null
          replacement_product_id?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_item_issues_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_quick_reply: boolean
          order_id: string
          read_at: string | null
          sender_id: string
          sender_role: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_quick_reply?: boolean
          order_id: string
          read_at?: string | null
          sender_id: string
          sender_role: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_quick_reply?: boolean
          order_id?: string
          read_at?: string | null
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "courier_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          currency: string
          email: string
          environment: string
          id: string
          items: Json
          paid_at: string | null
          shipping_address: Json | null
          shipping_usd: number
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string
          subtotal_usd: number
          tax_usd: number
          total_usd: number
          tracking_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          email: string
          environment?: string
          id?: string
          items?: Json
          paid_at?: string | null
          shipping_address?: Json | null
          shipping_usd?: number
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id: string
          subtotal_usd?: number
          tax_usd?: number
          total_usd?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          email?: string
          environment?: string
          id?: string
          items?: Json
          paid_at?: string | null
          shipping_address?: Json | null
          shipping_usd?: number
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string
          subtotal_usd?: number
          tax_usd?: number
          total_usd?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      prize_pool_ledger: {
        Row: {
          amount_usd: number
          created_at: string
          environment: string
          id: string
          package_id: string
          platform_share_usd: number
          pool_share_usd: number
          stripe_payment_intent_id: string | null
          stripe_session_id: string
          subject_email: string | null
          subject_user_id: string | null
          tokens_purchased: number
        }
        Insert: {
          amount_usd: number
          created_at?: string
          environment?: string
          id?: string
          package_id: string
          platform_share_usd: number
          pool_share_usd: number
          stripe_payment_intent_id?: string | null
          stripe_session_id: string
          subject_email?: string | null
          subject_user_id?: string | null
          tokens_purchased: number
        }
        Update: {
          amount_usd?: number
          created_at?: string
          environment?: string
          id?: string
          package_id?: string
          platform_share_usd?: number
          pool_share_usd?: number
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string
          subject_email?: string | null
          subject_user_id?: string | null
          tokens_purchased?: number
        }
        Relationships: []
      }
      product_ratings: {
        Row: {
          created_at: string
          id: string
          product_id: string
          review: string | null
          stars: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          review?: string | null
          stars: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          review?: string | null
          stars?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          deleted_at: string | null
          display_name: string | null
          donation_tier: Database["public"]["Enums"]["donation_tier"] | null
          email: string | null
          full_name: string | null
          id: string
          notify_before_draw: boolean
          referral_code: string
          region: string | null
          stars_count: number
          terms_accepted: boolean
          terms_accepted_at: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          donation_tier?: Database["public"]["Enums"]["donation_tier"] | null
          email?: string | null
          full_name?: string | null
          id: string
          notify_before_draw?: boolean
          referral_code?: string
          region?: string | null
          stars_count?: number
          terms_accepted?: boolean
          terms_accepted_at?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          donation_tier?: Database["public"]["Enums"]["donation_tier"] | null
          email?: string | null
          full_name?: string | null
          id?: string
          notify_before_draw?: boolean
          referral_code?: string
          region?: string | null
          stars_count?: number
          terms_accepted?: boolean
          terms_accepted_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reel_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          reel_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          reel_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_comments_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_likes: {
        Row: {
          created_at: string
          reel_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          reel_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_likes_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reels: {
        Row: {
          author_id: string | null
          created_at: string
          cta_label: string | null
          cta_url: string | null
          expires_at: string | null
          id: string
          is_ad: boolean
          product_image: string | null
          product_name: string | null
          product_price: number | null
          product_slug: string | null
          slug: string
          sponsor_name: string | null
          thumb_url: string | null
          title: string | null
          video_url: string | null
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          expires_at?: string | null
          id?: string
          is_ad?: boolean
          product_image?: string | null
          product_name?: string | null
          product_price?: number | null
          product_slug?: string | null
          slug: string
          sponsor_name?: string | null
          thumb_url?: string | null
          title?: string | null
          video_url?: string | null
        }
        Update: {
          author_id?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          expires_at?: string | null
          id?: string
          is_ad?: boolean
          product_image?: string | null
          product_name?: string | null
          product_price?: number | null
          product_slug?: string | null
          slug?: string
          sponsor_name?: string | null
          thumb_url?: string | null
          title?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referee_id: string
          referrer_id: string
          reward_granted: boolean
          rewarded_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          referee_id: string
          referrer_id: string
          reward_granted?: boolean
          rewarded_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          referee_id?: string
          referrer_id?: string
          reward_granted?: boolean
          rewarded_at?: string | null
        }
        Relationships: []
      }
      route_stops: {
        Row: {
          delivered_at: string | null
          delivery_address: string
          delivery_instruction: string
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_photo_url: string | null
          failure_reason: string | null
          id: string
          order_id: string
          package_code: string
          recipient_name: string
          recipient_phone: string | null
          route_id: string
          scanned_at: string | null
          sequence_number: number
          status: Database["public"]["Enums"]["stop_status"]
        }
        Insert: {
          delivered_at?: string | null
          delivery_address: string
          delivery_instruction?: string
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_photo_url?: string | null
          failure_reason?: string | null
          id?: string
          order_id: string
          package_code: string
          recipient_name: string
          recipient_phone?: string | null
          route_id: string
          scanned_at?: string | null
          sequence_number: number
          status?: Database["public"]["Enums"]["stop_status"]
        }
        Update: {
          delivered_at?: string | null
          delivery_address?: string
          delivery_instruction?: string
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_photo_url?: string | null
          failure_reason?: string | null
          id?: string
          order_id?: string
          package_code?: string
          recipient_name?: string
          recipient_phone?: string | null
          route_id?: string
          scanned_at?: string | null
          sequence_number?: number
          status?: Database["public"]["Enums"]["stop_status"]
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "subscription_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "delivery_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          actor_role: string | null
          actor_uid: string | null
          created_at: string
          details: Json | null
          event: string
          id: number
          row_count: number | null
          table_name: string | null
        }
        Insert: {
          actor_role?: string | null
          actor_uid?: string | null
          created_at?: string
          details?: Json | null
          event: string
          id?: number
          row_count?: number | null
          table_name?: string | null
        }
        Update: {
          actor_role?: string | null
          actor_uid?: string | null
          created_at?: string
          details?: Json | null
          event?: string
          id?: number
          row_count?: number | null
          table_name?: string | null
        }
        Relationships: []
      }
      shipping_quotes: {
        Row: {
          base_price: number
          created_at: string
          distance_miles: number
          error_message: string | null
          from_lat: number
          from_lng: number
          id: string
          price_per_mile: number
          status: string
          to_lat: number
          to_lng: number
          total: number
          user_id: string
        }
        Insert: {
          base_price: number
          created_at?: string
          distance_miles: number
          error_message?: string | null
          from_lat: number
          from_lng: number
          id?: string
          price_per_mile: number
          status?: string
          to_lat: number
          to_lng: number
          total: number
          user_id: string
        }
        Update: {
          base_price?: number
          created_at?: string
          distance_miles?: number
          error_message?: string | null
          from_lat?: number
          from_lng?: number
          id?: string
          price_per_mile?: number
          status?: string
          to_lat?: number
          to_lng?: number
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      spin_coupons: {
        Row: {
          code: string
          created_at: string
          id: string
          prize_key: string
          redeemed_at: string | null
          subject_email: string | null
          subject_user_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          prize_key: string
          redeemed_at?: string | null
          subject_email?: string | null
          subject_user_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          prize_key?: string
          redeemed_at?: string | null
          subject_email?: string | null
          subject_user_id?: string | null
        }
        Relationships: []
      }
      spin_history: {
        Row: {
          coupon_code: string | null
          created_at: string
          guest_email_hash: string | null
          id: string
          prize_key: string
          prize_label: string
          tokens_spent: number
          user_id: string | null
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          guest_email_hash?: string | null
          id?: string
          prize_key: string
          prize_label: string
          tokens_spent?: number
          user_id?: string | null
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          guest_email_hash?: string | null
          id?: string
          prize_key?: string
          prize_label?: string
          tokens_spent?: number
          user_id?: string | null
        }
        Relationships: []
      }
      star_purchases: {
        Row: {
          amount_usd: number
          created_at: string
          environment: string
          id: string
          package_id: string
          status: string
          stripe_session_id: string
          subject_email: string | null
          subject_user_id: string | null
          tokens: number
          updated_at: string
        }
        Insert: {
          amount_usd: number
          created_at?: string
          environment?: string
          id?: string
          package_id: string
          status?: string
          stripe_session_id: string
          subject_email?: string | null
          subject_user_id?: string | null
          tokens: number
          updated_at?: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          environment?: string
          id?: string
          package_id?: string
          status?: string
          stripe_session_id?: string
          subject_email?: string | null
          subject_user_id?: string | null
          tokens?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscription_orders: {
        Row: {
          created_at: string
          customer_id: string
          delivery_address: string | null
          delivery_day: Database["public"]["Enums"]["dispatch_day"]
          delivery_lat: number | null
          delivery_lng: number | null
          dispatch_date: string | null
          id: string
          package_code: string | null
          recipient_name: string | null
          recipient_phone: string | null
          status: string
          weight_kg: number
          zone_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          delivery_address?: string | null
          delivery_day: Database["public"]["Enums"]["dispatch_day"]
          delivery_lat?: number | null
          delivery_lng?: number | null
          dispatch_date?: string | null
          id?: string
          package_code?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          status?: string
          weight_kg: number
          zone_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          delivery_address?: string | null
          delivery_day?: Database["public"]["Enums"]["dispatch_day"]
          delivery_lat?: number | null
          delivery_lng?: number | null
          dispatch_date?: string | null
          id?: string
          package_code?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          status?: string
          weight_kg?: number
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_orders_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_orders_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "v_pending_batch_summary"
            referencedColumns: ["zone_id"]
          },
          {
            foreignKeyName: "subscription_orders_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "v_zone_dispatch_summary"
            referencedColumns: ["zone_id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          active: boolean
          created_at: string
          deliveries_per_month: number
          name: string
          price_cents: number
          price_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          deliveries_per_month: number
          name: string
          price_cents: number
          price_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          deliveries_per_month?: number
          name?: string
          price_cents?: number
          price_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          deleted_at: string | null
          environment: string
          id: string
          price_id: string
          product_id: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          deleted_at?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id?: string | null
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          deleted_at?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string | null
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suggestions: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          read_at: string | null
          status: string
          title: string | null
          updated_at: string
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      support_conversations: {
        Row: {
          created_at: string
          id: string
          issue_id: string
          last_message_at: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          issue_id: string
          last_message_at?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          issue_id?: string
          last_message_at?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_conversations_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: true
            referencedRelation: "order_item_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          action: string | null
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender: string
        }
        Insert: {
          action?: string | null
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender: string
        }
        Update: {
          action?: string | null
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      sweepstakes_config: {
        Row: {
          claim_window_days: number
          entry_cutoff_minutes: number
          excluded_states: string[]
          id: boolean
          max_daily_prize_usd: number
          min_age: number
          sponsor_address: string
          sponsor_email: string
          sponsor_name: string
          updated_at: string
        }
        Insert: {
          claim_window_days?: number
          entry_cutoff_minutes?: number
          excluded_states?: string[]
          id?: boolean
          max_daily_prize_usd?: number
          min_age?: number
          sponsor_address?: string
          sponsor_email?: string
          sponsor_name?: string
          updated_at?: string
        }
        Update: {
          claim_window_days?: number
          entry_cutoff_minutes?: number
          excluded_states?: string[]
          id?: boolean
          max_daily_prize_usd?: number
          min_age?: number
          sponsor_address?: string
          sponsor_email?: string
          sponsor_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      test_winner_log: {
        Row: {
          created_at: string
          delivered: boolean
          delivered_at: string
          id: string
          prize_usd: number
          winner_display_name: string
          winner_email: string | null
        }
        Insert: {
          created_at?: string
          delivered?: boolean
          delivered_at?: string
          id?: string
          prize_usd?: number
          winner_display_name: string
          winner_email?: string | null
        }
        Update: {
          created_at?: string
          delivered?: boolean
          delivered_at?: string
          id?: string
          prize_usd?: number
          winner_display_name?: string
          winner_email?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_tokens: {
        Row: {
          balance: number
          created_at: string
          guest_email: string | null
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          balance?: number
          created_at?: string
          guest_email?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          balance?: number
          created_at?: string
          guest_email?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          driver_id: string
          id: string
          payout_id: string | null
          route_id: string | null
          type: Database["public"]["Enums"]["wallet_txn_type"]
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          driver_id: string
          id?: string
          payout_id?: string | null
          route_id?: string | null
          type: Database["public"]["Enums"]["wallet_txn_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          driver_id?: string
          id?: string
          payout_id?: string | null
          route_id?: string | null
          type?: Database["public"]["Enums"]["wallet_txn_type"]
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "delivery_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      winner_announcements: {
        Row: {
          created_at: string
          draw_date: string
          id: string
          prize_usd: number
          published_at: string
          seed_hash: string | null
          winner_display_name: string
        }
        Insert: {
          created_at?: string
          draw_date: string
          id?: string
          prize_usd?: number
          published_at?: string
          seed_hash?: string | null
          winner_display_name: string
        }
        Update: {
          created_at?: string
          draw_date?: string
          id?: string
          prize_usd?: number
          published_at?: string
          seed_hash?: string | null
          winner_display_name?: string
        }
        Relationships: []
      }
      winner_claims: {
        Row: {
          address1: string | null
          address2: string | null
          admin_notes: string | null
          city: string | null
          claim_deadline: string
          created_at: string
          deleted_at: string | null
          display_name: string
          dob: string | null
          draw_date: string
          email: string
          full_name: string | null
          id: string
          id_document_path: string | null
          last_reminder_at: string | null
          notified_at: string | null
          paid_at: string | null
          paid_by: string | null
          payment_destination: string | null
          payment_method: string | null
          payment_reference: string | null
          phone: string | null
          prize_usd: number
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          state: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string | null
          verified_at: string | null
          verified_by: string | null
          w9_document_path: string | null
          zip: string | null
        }
        Insert: {
          address1?: string | null
          address2?: string | null
          admin_notes?: string | null
          city?: string | null
          claim_deadline: string
          created_at?: string
          deleted_at?: string | null
          display_name: string
          dob?: string | null
          draw_date: string
          email: string
          full_name?: string | null
          id?: string
          id_document_path?: string | null
          last_reminder_at?: string | null
          notified_at?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_destination?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          phone?: string | null
          prize_usd: number
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          state?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
          w9_document_path?: string | null
          zip?: string | null
        }
        Update: {
          address1?: string | null
          address2?: string | null
          admin_notes?: string | null
          city?: string | null
          claim_deadline?: string
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          dob?: string | null
          draw_date?: string
          email?: string
          full_name?: string | null
          id?: string
          id_document_path?: string | null
          last_reminder_at?: string | null
          notified_at?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_destination?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          phone?: string | null
          prize_usd?: number
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          state?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
          w9_document_path?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "winner_claims_draw_date_fkey"
            columns: ["draw_date"]
            isOneToOne: true
            referencedRelation: "daily_draws"
            referencedColumns: ["draw_date"]
          },
        ]
      }
    }
    Views: {
      v_pending_batch_summary: {
        Row: {
          delivery_day: Database["public"]["Enums"]["dispatch_day"] | null
          dispatch_date: string | null
          total_orders: number | null
          total_weight_kg: number | null
          zone_id: string | null
          zone_name: string | null
        }
        Relationships: []
      }
      v_zone_dispatch_summary: {
        Row: {
          delivery_day: Database["public"]["Enums"]["dispatch_day"] | null
          dispatch_date: string | null
          total_orders: number | null
          total_weight_kg: number | null
          zone_id: string | null
          zone_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_route: {
        Args: { p_route_id: string }
        Returns: {
          accepted_at: string | null
          completed_at: string | null
          created_at: string
          delivery_day: Database["public"]["Enums"]["dispatch_day"]
          dispatch_date: string
          driver_id: string | null
          fixed_pay: number
          id: string
          route_name: string
          status: Database["public"]["Enums"]["route_status"]
          total_stops: number
          warehouse_checkin_at: string | null
          zone_id: string
        }
        SetofOptions: {
          from: "*"
          to: "delivery_routes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      close_draws_for_cutoff: { Args: never; Returns: number }
      complete_driver_payout: {
        Args: { p_payout_id: string; p_stripe_payout_id: string }
        Returns: {
          amount_net: number
          amount_requested: number
          completed_at: string | null
          driver_id: string
          fee: number
          id: string
          requested_at: string
          status: Database["public"]["Enums"]["driver_payout_status"]
          stripe_error: string | null
          stripe_payout_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "driver_payouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_route_stop: {
        Args: { p_photo_url: string; p_stop_id: string }
        Returns: {
          delivered_at: string | null
          delivery_address: string
          delivery_instruction: string
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_photo_url: string | null
          failure_reason: string | null
          id: string
          order_id: string
          package_code: string
          recipient_name: string
          recipient_phone: string | null
          route_id: string
          scanned_at: string | null
          sequence_number: number
          status: Database["public"]["Enums"]["stop_status"]
        }
        SetofOptions: {
          from: "*"
          to: "route_stops"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cron_status: {
        Args: never
        Returns: {
          jobname: string
          last_msg: string
          last_start: string
          last_status: string
          schedule: string
        }[]
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      draw_time_for: { Args: { p_date: string }; Returns: string }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      ensure_today_draw: {
        Args: never
        Returns: {
          created_at: string
          draw_date: string
          drawn_at: string | null
          entrants_total: number
          id: string
          notified_5min_at: string | null
          prize_usd: number
          rolled_over_from: string | null
          scheduled_at: string
          seed_hash: string | null
          status: string
          tickets_total: number
          updated_at: string
          winner_display_name: string | null
        }
        SetofOptions: {
          from: "*"
          to: "daily_draws"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      enter_daily_draw: {
        Args: {
          p_cost_per_ticket?: number
          p_display_name: string
          p_email: string
          p_tickets: number
          p_user_id: string
        }
        Returns: {
          entry_id: string
          new_balance: number
          tickets_added: number
        }[]
      }
      expire_winner_claims: { Args: never; Returns: number }
      generate_referral_code: { Args: never; Returns: string }
      get_prize_pool: {
        Args: never
        Returns: {
          last_updated: string
          total_contributions: number
          total_pool_usd: number
        }[]
      }
      get_product_rating_summary: {
        Args: { p_product_id: string }
        Returns: {
          avg: number
          count: number
        }[]
      }
      get_public_profiles: {
        Args: { ids: string[] }
        Returns: {
          display_name: string
          id: string
        }[]
      }
      get_recent_test_winners: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          delivered: boolean
          id: string
          prize_usd: number
          winner_display_name: string
        }[]
      }
      get_recent_winners: {
        Args: { p_limit?: number }
        Returns: {
          draw_date: string
          drawn_at: string
          prize_usd: number
          seed_hash: string
          winner_display_name: string
        }[]
      }
      get_sweepstakes_public_config: {
        Args: never
        Returns: {
          address_valid: boolean
          claim_window_days: number
          entry_cutoff_minutes: number
          excluded_states: string[]
          max_daily_prize_usd: number
          min_age: number
          sponsor_address: string
          sponsor_email: string
          sponsor_name: string
        }[]
      }
      get_today_draw: {
        Args: never
        Returns: {
          draw_date: string
          entrants_total: number
          prize_usd_live: number
          rolled_over_from: string
          scheduled_at: string
          seed_hash: string
          status: string
          tickets_total: number
          winner_display_name: string
        }[]
      }
      get_winner_announcements: {
        Args: { p_limit?: number }
        Returns: {
          draw_date: string
          prize_usd: number
          published_at: string
          seed_hash: string
          winner_display_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_driver_approved: { Args: { _user_id: string }; Returns: boolean }
      list_soft_deleted: {
        Args: { p_limit?: number }
        Returns: {
          deleted_at: string
          id: string
          label: string
          table_name: string
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      nearby_batchable_orders: {
        Args: { _order_id: string; _radius_km?: number }
        Returns: {
          distance_km: number
          estimated_duration_minutes: number
          estimated_earnings: number
          id: string
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          stops_count: number
        }[]
      }
      next_dispatch_date: {
        Args: {
          p_day: Database["public"]["Enums"]["dispatch_day"]
          p_from: string
        }
        Returns: string
      }
      publish_route: {
        Args: {
          p_delivery_day: Database["public"]["Enums"]["dispatch_day"]
          p_dispatch_date: string
          p_fixed_pay: number
          p_route_name: string
          p_zone_id: string
        }
        Returns: {
          accepted_at: string | null
          completed_at: string | null
          created_at: string
          delivery_day: Database["public"]["Enums"]["dispatch_day"]
          dispatch_date: string
          driver_id: string | null
          fixed_pay: number
          id: string
          route_name: string
          status: Database["public"]["Enums"]["route_status"]
          total_stops: number
          warehouse_checkin_at: string | null
          zone_id: string
        }
        SetofOptions: {
          from: "*"
          to: "delivery_routes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      reel_comment_counts: {
        Args: { reel_ids: string[] }
        Returns: {
          comment_count: number
          reel_id: string
        }[]
      }
      reel_like_counts: {
        Args: { reel_ids: string[] }
        Returns: {
          like_count: number
          reel_id: string
        }[]
      }
      reorder_route_stop: {
        Args: { p_new_sequence: number; p_stop_id: string }
        Returns: undefined
      }
      request_driver_payout: {
        Args: { p_amount: number; p_fee: number }
        Returns: {
          amount_net: number
          amount_requested: number
          completed_at: string | null
          driver_id: string
          fee: number
          id: string
          requested_at: string
          status: Database["public"]["Enums"]["driver_payout_status"]
          stripe_error: string | null
          stripe_payout_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "driver_payouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_referral_code: {
        Args: { p_code: string }
        Returns: {
          display_name: string
          referrer_id: string
        }[]
      }
      restore_row: { Args: { p_id: string; p_table: string }; Returns: boolean }
      reverse_failed_payout: {
        Args: { p_payout_id: string; p_reason: string }
        Returns: {
          amount_net: number
          amount_requested: number
          completed_at: string | null
          driver_id: string
          fee: number
          id: string
          requested_at: string
          status: Database["public"]["Enums"]["driver_payout_status"]
          stripe_error: string | null
          stripe_payout_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "driver_payouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      run_daily_draw: {
        Args: never
        Returns: {
          draw_date: string
          prize_usd: number
          seed_hash: string
          status: string
          winner_display_name: string
        }[]
      }
      run_test_draw_tick: {
        Args: never
        Returns: {
          created_at: string
          delivered: boolean
          id: string
          prize_usd: number
          winner_display_name: string
        }[]
      }
      scan_route_package: {
        Args: { p_package_code: string; p_route_id: string }
        Returns: {
          delivered_at: string | null
          delivery_address: string
          delivery_instruction: string
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_photo_url: string | null
          failure_reason: string | null
          id: string
          order_id: string
          package_code: string
          recipient_name: string
          recipient_phone: string | null
          route_id: string
          scanned_at: string | null
          sequence_number: number
          status: Database["public"]["Enums"]["stop_status"]
        }
        SetofOptions: {
          from: "*"
          to: "route_stops"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      start_route_transit: {
        Args: { p_route_id: string }
        Returns: {
          accepted_at: string | null
          completed_at: string | null
          created_at: string
          delivery_day: Database["public"]["Enums"]["dispatch_day"]
          dispatch_date: string
          driver_id: string | null
          fixed_pay: number
          id: string
          route_name: string
          status: Database["public"]["Enums"]["route_status"]
          total_stops: number
          warehouse_checkin_at: string | null
          zone_id: string
        }
        SetofOptions: {
          from: "*"
          to: "delivery_routes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_amoe_entry: {
        Args: {
          p_address1: string
          p_address2: string
          p_city: string
          p_dob: string
          p_email: string
          p_essay: string
          p_full_name: string
          p_ip: unknown
          p_phone: string
          p_state: string
          p_user_agent: string
          p_user_id: string
          p_zip: string
        }
        Returns: {
          amoe_id: string
          draw_date: string
          entry_id: string
        }[]
      }
      today_et: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user" | "repartidor"
      courier_order_status:
        | "disponible"
        | "aceptado"
        | "en_recoleccion"
        | "en_camino_entrega"
        | "completado"
        | "cancelado"
      courier_proof_type: "foto" | "firma" | "codigo" | "ninguno"
      courier_stop_status: "pendiente" | "en_camino" | "entregado" | "fallido"
      dispatch_day: "lunes" | "viernes"
      donation_tier:
        | "azul"
        | "bronce"
        | "oro"
        | "premium"
        | "corona"
        | "estrella_suprema"
      driver_application_status:
        | "pendiente"
        | "en_revision"
        | "aprobado"
        | "rechazado"
        | "suspendido"
      driver_document_status: "pendiente" | "aprobado" | "rechazado"
      driver_document_type:
        | "licencia_conducir"
        | "seguro_vehiculo"
        | "identificacion"
        | "antecedentes_penales"
        | "foto_perfil"
      driver_earnings_status: "pendiente" | "pagado" | "en_proceso"
      driver_payout_status: "procesando" | "completado" | "fallido"
      driver_vehicle_type: "bicicleta" | "moto" | "auto" | "a_pie"
      route_status:
        | "disponible"
        | "asignada"
        | "en_transito"
        | "completada"
        | "cancelada"
      stop_status: "pendiente" | "en_camino" | "entregado" | "fallido"
      wallet_txn_type: "ganancia_ruta" | "retiro" | "ajuste_admin" | "reversion"
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
      app_role: ["admin", "user", "repartidor"],
      courier_order_status: [
        "disponible",
        "aceptado",
        "en_recoleccion",
        "en_camino_entrega",
        "completado",
        "cancelado",
      ],
      courier_proof_type: ["foto", "firma", "codigo", "ninguno"],
      courier_stop_status: ["pendiente", "en_camino", "entregado", "fallido"],
      dispatch_day: ["lunes", "viernes"],
      donation_tier: [
        "azul",
        "bronce",
        "oro",
        "premium",
        "corona",
        "estrella_suprema",
      ],
      driver_application_status: [
        "pendiente",
        "en_revision",
        "aprobado",
        "rechazado",
        "suspendido",
      ],
      driver_document_status: ["pendiente", "aprobado", "rechazado"],
      driver_document_type: [
        "licencia_conducir",
        "seguro_vehiculo",
        "identificacion",
        "antecedentes_penales",
        "foto_perfil",
      ],
      driver_earnings_status: ["pendiente", "pagado", "en_proceso"],
      driver_payout_status: ["procesando", "completado", "fallido"],
      driver_vehicle_type: ["bicicleta", "moto", "auto", "a_pie"],
      route_status: [
        "disponible",
        "asignada",
        "en_transito",
        "completada",
        "cancelada",
      ],
      stop_status: ["pendiente", "en_camino", "entregado", "fallido"],
      wallet_txn_type: ["ganancia_ruta", "retiro", "ajuste_admin", "reversion"],
    },
  },
} as const

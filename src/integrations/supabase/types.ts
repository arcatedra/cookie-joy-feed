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
          id: string
          notes: string | null
          period_end: string
          period_start: string
          price_id: string
          scheduled_date: string
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          price_id: string
          scheduled_date: string
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          price_id?: string
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
      [_ in never]: never
    }
    Functions: {
      close_draws_for_cutoff: { Args: never; Returns: number }
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
      resolve_referral_code: {
        Args: { p_code: string }
        Returns: {
          display_name: string
          referrer_id: string
        }[]
      }
      restore_row: { Args: { p_id: string; p_table: string }; Returns: boolean }
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
      app_role: "admin" | "user"
      donation_tier:
        | "azul"
        | "bronce"
        | "oro"
        | "premium"
        | "corona"
        | "estrella_suprema"
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
      app_role: ["admin", "user"],
      donation_tier: [
        "azul",
        "bronce",
        "oro",
        "premium",
        "corona",
        "estrella_suprema",
      ],
    },
  },
} as const

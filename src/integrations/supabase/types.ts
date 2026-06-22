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
          created_at: string
          email: string
          essay: string
          full_name: string
          id: string
          ip: unknown
          phone: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          essay: string
          full_name: string
          id?: string
          ip?: unknown
          phone: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          essay?: string
          full_name?: string
          id?: string
          ip?: unknown
          phone?: string
          user_id?: string | null
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
      daily_draw_entries: {
        Row: {
          created_at: string
          display_name: string
          draw_date: string
          id: string
          subject_email: string | null
          subject_user_id: string | null
          tickets: number
        }
        Insert: {
          created_at?: string
          display_name: string
          draw_date: string
          id?: string
          subject_email?: string | null
          subject_user_id?: string | null
          tickets?: number
        }
        Update: {
          created_at?: string
          display_name?: string
          draw_date?: string
          id?: string
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
          prize_usd: number
          rolled_over_from: string | null
          scheduled_at: string
          seed_hash: string | null
          status: string
          tickets_total: number
          updated_at: string
          winner_display_name: string | null
          winner_subject_email: string | null
          winner_subject_user_id: string | null
        }
        Insert: {
          created_at?: string
          draw_date: string
          drawn_at?: string | null
          entrants_total?: number
          id?: string
          prize_usd?: number
          rolled_over_from?: string | null
          scheduled_at: string
          seed_hash?: string | null
          status?: string
          tickets_total?: number
          updated_at?: string
          winner_display_name?: string | null
          winner_subject_email?: string | null
          winner_subject_user_id?: string | null
        }
        Update: {
          created_at?: string
          draw_date?: string
          drawn_at?: string | null
          entrants_total?: number
          id?: string
          prize_usd?: number
          rolled_over_from?: string | null
          scheduled_at?: string
          seed_hash?: string | null
          status?: string
          tickets_total?: number
          updated_at?: string
          winner_display_name?: string | null
          winner_subject_email?: string | null
          winner_subject_user_id?: string | null
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
          display_name: string | null
          donation_tier: Database["public"]["Enums"]["donation_tier"] | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          donation_tier?: Database["public"]["Enums"]["donation_tier"] | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          donation_tier?: Database["public"]["Enums"]["donation_tier"] | null
          id?: string
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
          expires_at: string | null
          id: string
          product_image: string | null
          product_name: string | null
          product_price: number | null
          product_slug: string | null
          slug: string
          thumb_url: string | null
          title: string | null
          video_url: string | null
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          product_image?: string | null
          product_name?: string | null
          product_price?: number | null
          product_slug?: string | null
          slug: string
          thumb_url?: string | null
          title?: string | null
          video_url?: string | null
        }
        Update: {
          author_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          product_image?: string | null
          product_name?: string | null
          product_price?: number | null
          product_slug?: string | null
          slug?: string
          thumb_url?: string | null
          title?: string | null
          video_url?: string | null
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
          guest_email: string | null
          id: string
          prize_key: string
          prize_label: string
          tokens_spent: number
          user_id: string | null
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          guest_email?: string | null
          id?: string
          prize_key: string
          prize_label: string
          tokens_spent?: number
          user_id?: string | null
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          guest_email?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      draw_time_for: { Args: { p_date: string }; Returns: string }
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
          prize_usd: number
          rolled_over_from: string | null
          scheduled_at: string
          seed_hash: string | null
          status: string
          tickets_total: number
          updated_at: string
          winner_display_name: string | null
          winner_subject_email: string | null
          winner_subject_user_id: string | null
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
      get_prize_pool: {
        Args: never
        Returns: {
          last_updated: string
          total_contributions: number
          total_pool_usd: number
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

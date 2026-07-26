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
      clientes: {
        Row: {
          actualizado_en: string
          ciudad: string | null
          codigo_postal: string | null
          creado_en: string
          direccion_linea1: string | null
          direccion_linea2: string | null
          email: string
          estado_provincia: string | null
          id: string
          nombre_completo: string
          pais: string | null
          stripe_customer_id: string | null
          telefono: string | null
        }
        Insert: {
          actualizado_en?: string
          ciudad?: string | null
          codigo_postal?: string | null
          creado_en?: string
          direccion_linea1?: string | null
          direccion_linea2?: string | null
          email: string
          estado_provincia?: string | null
          id: string
          nombre_completo: string
          pais?: string | null
          stripe_customer_id?: string | null
          telefono?: string | null
        }
        Update: {
          actualizado_en?: string
          ciudad?: string | null
          codigo_postal?: string | null
          creado_en?: string
          direccion_linea1?: string | null
          direccion_linea2?: string | null
          email?: string
          estado_provincia?: string | null
          id?: string
          nombre_completo?: string
          pais?: string | null
          stripe_customer_id?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          product_handle: string
          product_image_url: string | null
          product_price_amount: number | null
          product_price_currency: string | null
          product_title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_handle: string
          product_image_url?: string | null
          product_price_amount?: number | null
          product_price_currency?: string | null
          product_title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_handle?: string
          product_image_url?: string | null
          product_price_amount?: number | null
          product_price_currency?: string | null
          product_title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      HAZOREX: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      pedido_items: {
        Row: {
          cantidad: number
          id: string
          nombre_producto: string
          pedido_id: string
          precio_unitario: number
          producto_id: string | null
          subtotal_item: number
        }
        Insert: {
          cantidad: number
          id?: string
          nombre_producto: string
          pedido_id: string
          precio_unitario: number
          producto_id?: string | null
          subtotal_item: number
        }
        Update: {
          cantidad?: number
          id?: string
          nombre_producto?: string
          pedido_id?: string
          precio_unitario?: number
          producto_id?: string | null
          subtotal_item?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_items_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          actualizado_en: string
          cliente_id: string
          costo_envio: number
          creado_en: string
          direccion_envio: Json
          estado: string
          id: string
          impuestos: number
          metodo_pago: string | null
          moneda: string
          notas: string | null
          numero_pedido: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          subtotal: number
          total: number
        }
        Insert: {
          actualizado_en?: string
          cliente_id: string
          costo_envio?: number
          creado_en?: string
          direccion_envio: Json
          estado?: string
          id?: string
          impuestos?: number
          metodo_pago?: string | null
          moneda?: string
          notas?: string | null
          numero_pedido?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number
          total?: number
        }
        Update: {
          actualizado_en?: string
          cliente_id?: string
          costo_envio?: number
          creado_en?: string
          direccion_envio?: Json
          estado?: string
          id?: string
          impuestos?: number
          metodo_pago?: string | null
          moneda?: string
          notas?: string | null
          numero_pedido?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          categoria: string | null
          creado_en: string
          descripcion: string | null
          disponible: boolean
          id: string
          imagen_url: string | null
          nombre: string
          precio: number
        }
        Insert: {
          categoria?: string | null
          creado_en?: string
          descripcion?: string | null
          disponible?: boolean
          id?: string
          imagen_url?: string | null
          nombre: string
          precio: number
        }
        Update: {
          categoria?: string | null
          creado_en?: string
          descripcion?: string | null
          disponible?: boolean
          id?: string
          imagen_url?: string | null
          nombre?: string
          precio?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          donation_tier: string | null
          id: string
          name: string | null
          referral_code: string | null
          referred_by: string | null
          region: string | null
          terms_accepted: boolean
          terms_accepted_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          donation_tier?: string | null
          id: string
          name?: string | null
          referral_code?: string | null
          referred_by?: string | null
          region?: string | null
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          donation_tier?: string | null
          id?: string
          name?: string | null
          referral_code?: string | null
          referred_by?: string | null
          region?: string | null
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          updated_at?: string
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
      referrals: {
        Row: {
          id: string
          invited_at: string
          referee_id: string
          referrer_id: string
          reward_granted: boolean
          rewarded_at: string | null
        }
        Insert: {
          id?: string
          invited_at?: string
          referee_id: string
          referrer_id: string
          reward_granted?: boolean
          rewarded_at?: string | null
        }
        Update: {
          id?: string
          invited_at?: string
          referee_id?: string
          referrer_id?: string
          reward_granted?: boolean
          rewarded_at?: string | null
        }
        Relationships: []
      }
      star_purchases: {
        Row: {
          amount_usd: number
          created_at: string
          id: string
          package_id: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          subject_email: string | null
          subject_user_id: string | null
          tokens: number
          updated_at: string
        }
        Insert: {
          amount_usd: number
          created_at?: string
          id?: string
          package_id: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subject_email?: string | null
          subject_user_id?: string | null
          tokens: number
          updated_at?: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          id?: string
          package_id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subject_email?: string | null
          subject_user_id?: string | null
          tokens?: number
          updated_at?: string
        }
        Relationships: []
      }
      suscripciones: {
        Row: {
          cliente_id: string
          creado_en: string
          estado: string
          fecha_cancelacion: string | null
          fecha_inicio: string
          fecha_renovacion: string | null
          id: string
          moneda: string
          plan: string
          precio: number
          stripe_subscription_id: string | null
        }
        Insert: {
          cliente_id: string
          creado_en?: string
          estado?: string
          fecha_cancelacion?: string | null
          fecha_inicio?: string
          fecha_renovacion?: string | null
          id?: string
          moneda?: string
          plan?: string
          precio?: number
          stripe_subscription_id?: string | null
        }
        Update: {
          cliente_id?: string
          creado_en?: string
          estado?: string
          fecha_cancelacion?: string | null
          fecha_inicio?: string
          fecha_renovacion?: string | null
          id?: string
          moneda?: string
          plan?: string
          precio?: number
          stripe_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suscripciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_eligibility: {
        Row: {
          created_at: string
          dob: string
          state: string
          user_id: string
          verified_age: number
        }
        Insert: {
          created_at?: string
          dob: string
          state: string
          user_id: string
          verified_age: number
        }
        Update: {
          created_at?: string
          dob?: string
          state?: string
          user_id?: string
          verified_age?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      crear_pedido_con_items: {
        Args: {
          p_cliente_id: string
          p_direccion: Json
          p_envio: number
          p_impuestos: number
          p_items: Json
          p_moneda: string
          p_stripe_pi: string
          p_stripe_session: string
          p_subtotal: number
          p_total: number
        }
        Returns: {
          numero_pedido: string
          pedido_id: string
        }[]
      }
      generate_referral_code: { Args: never; Returns: string }
      get_my_referral_profile: {
        Args: never
        Returns: {
          invited_count: number
          referral_code: string
          stars_count: number
        }[]
      }
      get_my_referrals: {
        Args: never
        Returns: {
          invited_at: string
          referee_display_name: string
          reward_granted: boolean
          rewarded_at: string
        }[]
      }
      get_public_profiles: {
        Args: { ids: string[] }
        Returns: {
          display_name: string
          id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reel_comment_counts: {
        Args: { reel_ids: string[] }
        Returns: {
          count: number
          reel_id: string
        }[]
      }
      reel_like_counts: {
        Args: { reel_ids: string[] }
        Returns: {
          count: number
          reel_id: string
        }[]
      }
      upsert_suscripcion_stripe: {
        Args: {
          p_cliente_id: string
          p_estado: string
          p_fecha_cancelacion: string
          p_fecha_inicio: string
          p_fecha_renovacion: string
          p_moneda: string
          p_plan: string
          p_precio: number
          p_stripe_sub_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

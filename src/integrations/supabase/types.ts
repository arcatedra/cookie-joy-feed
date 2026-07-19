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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

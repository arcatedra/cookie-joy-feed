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
      account_fingerprints: {
        Row: {
          created_at: string
          id: string
          kind: string
          user_id: string
          value_norm: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          user_id: string
          value_norm: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          user_id?: string
          value_norm?: string
        }
        Relationships: []
      }
      affiliate_commissions: {
        Row: {
          affiliate_profile_id: string
          amount_usd: number
          cliente_email: string | null
          cliente_id: string | null
          created_at: string
          id: string
          status: string
        }
        Insert: {
          affiliate_profile_id: string
          amount_usd?: number
          cliente_email?: string | null
          cliente_id?: string | null
          created_at?: string
          id?: string
          status?: string
        }
        Update: {
          affiliate_profile_id?: string
          amount_usd?: number
          cliente_email?: string | null
          cliente_id?: string | null
          created_at?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_profile_id_fkey"
            columns: ["affiliate_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "approved_businesses_public"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "approved_businesses_public"
            referencedColumns: ["id"]
          },
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
          activo: boolean
          address: string
          approved_at: string | null
          approved_by: string | null
          banner_url: string | null
          business_name: string
          business_type: string
          city: string | null
          comision_porcentaje: number
          created_at: string
          descripcion: string | null
          email: string
          horario: Json
          id: string
          logo_url: string | null
          owner_user_id: string
          phone: string
          rejection_reason: string | null
          slug: string | null
          status: string
          updated_at: string
          zonas_que_atiende: string[]
        }
        Insert: {
          activo?: boolean
          address: string
          approved_at?: string | null
          approved_by?: string | null
          banner_url?: string | null
          business_name: string
          business_type: string
          city?: string | null
          comision_porcentaje?: number
          created_at?: string
          descripcion?: string | null
          email: string
          horario?: Json
          id?: string
          logo_url?: string | null
          owner_user_id: string
          phone: string
          rejection_reason?: string | null
          slug?: string | null
          status?: string
          updated_at?: string
          zonas_que_atiende?: string[]
        }
        Update: {
          activo?: boolean
          address?: string
          approved_at?: string | null
          approved_by?: string | null
          banner_url?: string | null
          business_name?: string
          business_type?: string
          city?: string | null
          comision_porcentaje?: number
          created_at?: string
          descripcion?: string | null
          email?: string
          horario?: Json
          id?: string
          logo_url?: string | null
          owner_user_id?: string
          phone?: string
          rejection_reason?: string | null
          slug?: string | null
          status?: string
          updated_at?: string
          zonas_que_atiende?: string[]
        }
        Relationships: []
      }
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
          referred_by_profile_id: string | null
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
          referred_by_profile_id?: string | null
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
          referred_by_profile_id?: string | null
          stripe_customer_id?: string | null
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_referred_by_profile_id_fkey"
            columns: ["referred_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_routes: {
        Row: {
          accepted_at: string | null
          completed_at: string | null
          created_at: string
          dispatch_date: string
          driver_id: string | null
          id: string
          route_name: string
          status: Database["public"]["Enums"]["route_status"]
          total_stops: number
          updated_at: string
          warehouse_checkin_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          completed_at?: string | null
          created_at?: string
          dispatch_date?: string
          driver_id?: string | null
          id?: string
          route_name: string
          status?: Database["public"]["Enums"]["route_status"]
          total_stops?: number
          updated_at?: string
          warehouse_checkin_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          completed_at?: string | null
          created_at?: string
          dispatch_date?: string
          driver_id?: string | null
          id?: string
          route_name?: string
          status?: Database["public"]["Enums"]["route_status"]
          total_stops?: number
          updated_at?: string
          warehouse_checkin_at?: string | null
        }
        Relationships: []
      }
      delivery_settings: {
        Row: {
          key: string
          updated_at: string
          value_int: number
        }
        Insert: {
          key: string
          updated_at?: string
          value_int: number
        }
        Update: {
          key?: string
          updated_at?: string
          value_int?: number
        }
        Relationships: []
      }
      driver_tax_profiles: {
        Row: {
          created_at: string
          driver_id: string
          tax_id_ciphertext: string
          tax_id_iv: string
          tax_id_last4: string
          tax_id_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          tax_id_ciphertext: string
          tax_id_iv: string
          tax_id_last4: string
          tax_id_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          tax_id_ciphertext?: string
          tax_id_iv?: string
          tax_id_last4?: string
          tax_id_type?: string
          updated_at?: string
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
          customer_response: string | null
          id: string
          nombre_producto: string
          notified_at: string | null
          pedido_id: string
          precio_unitario: number
          producto_id: string | null
          responded_at: string | null
          status: string
          substitute_ids: string[]
          substituted_with_id: string | null
          substitution_mode: string
          subtotal_item: number
        }
        Insert: {
          cantidad: number
          customer_response?: string | null
          id?: string
          nombre_producto: string
          notified_at?: string | null
          pedido_id: string
          precio_unitario: number
          producto_id?: string | null
          responded_at?: string | null
          status?: string
          substitute_ids?: string[]
          substituted_with_id?: string | null
          substitution_mode?: string
          subtotal_item: number
        }
        Update: {
          cantidad?: number
          customer_response?: string | null
          id?: string
          nombre_producto?: string
          notified_at?: string | null
          pedido_id?: string
          precio_unitario?: number
          producto_id?: string | null
          responded_at?: string | null
          status?: string
          substitute_ids?: string[]
          substituted_with_id?: string | null
          substitution_mode?: string
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
          {
            foreignKeyName: "pedido_items_substituted_with_id_fkey"
            columns: ["substituted_with_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          actualizado_en: string
          autorizado_en: string | null
          captura_error: string | null
          captura_intentos: number
          capturado_en: string | null
          cliente_id: string
          costo_envio: number
          creado_en: string
          direccion_envio: Json
          estado: string
          flujo_pago: string
          id: string
          impuestos: number
          metodo_pago: string | null
          moneda: string
          monto_autorizado: number | null
          monto_capturado: number | null
          notas: string | null
          numero_pedido: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          subtotal: number
          total: number
        }
        Insert: {
          actualizado_en?: string
          autorizado_en?: string | null
          captura_error?: string | null
          captura_intentos?: number
          capturado_en?: string | null
          cliente_id: string
          costo_envio?: number
          creado_en?: string
          direccion_envio: Json
          estado?: string
          flujo_pago?: string
          id?: string
          impuestos?: number
          metodo_pago?: string | null
          moneda?: string
          monto_autorizado?: number | null
          monto_capturado?: number | null
          notas?: string | null
          numero_pedido?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number
          total?: number
        }
        Update: {
          actualizado_en?: string
          autorizado_en?: string | null
          captura_error?: string | null
          captura_intentos?: number
          capturado_en?: string | null
          cliente_id?: string
          costo_envio?: number
          creado_en?: string
          direccion_envio?: Json
          estado?: string
          flujo_pago?: string
          id?: string
          impuestos?: number
          metodo_pago?: string | null
          moneda?: string
          monto_autorizado?: number | null
          monto_capturado?: number | null
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
      policy_violations: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          role: string
          texto_intentado: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          role: string
          texto_intentado: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          role?: string
          texto_intentado?: string
          user_id?: string
        }
        Relationships: []
      }
      pricing_settings: {
        Row: {
          key: string
          updated_at: string
          value: number
        }
        Insert: {
          key: string
          updated_at?: string
          value: number
        }
        Update: {
          key?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
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
          locale: string | null
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
          locale?: string | null
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
          locale?: string | null
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
      referral_rewards: {
        Row: {
          amount_usd: number
          block_reason: string | null
          created_at: string
          id: string
          order_id: string | null
          referee_id: string
          referrer_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_usd?: number
          block_reason?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          referee_id: string
          referrer_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_usd?: number
          block_reason?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          referee_id?: string
          referrer_id?: string
          status?: string
          updated_at?: string
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
      route_stops: {
        Row: {
          created_at: string
          delivered_at: string | null
          delivery_address: string | null
          delivery_note: string | null
          delivery_photo_url: string | null
          eta: string | null
          failure_reason: string | null
          id: string
          order_id: string
          recipient_name: string | null
          route_id: string
          sequence_number: number
          status: Database["public"]["Enums"]["stop_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_note?: string | null
          delivery_photo_url?: string | null
          eta?: string | null
          failure_reason?: string | null
          id?: string
          order_id: string
          recipient_name?: string | null
          route_id: string
          sequence_number: number
          status?: Database["public"]["Enums"]["stop_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_note?: string | null
          delivery_photo_url?: string | null
          eta?: string | null
          failure_reason?: string | null
          id?: string
          order_id?: string
          recipient_name?: string | null
          route_id?: string
          sequence_number?: number
          status?: Database["public"]["Enums"]["stop_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
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
      store_categories: {
        Row: {
          business_id: string
          created_at: string
          id: string
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "approved_businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      store_order_items: {
        Row: {
          cantidad: number
          cantidad_real: number | null
          created_at: string
          id: string
          nombre_producto: string
          order_id: string
          precio_unitario: number
          product_id: string | null
          subtotal_item: number
          unidad: string
          updated_at: string
        }
        Insert: {
          cantidad: number
          cantidad_real?: number | null
          created_at?: string
          id?: string
          nombre_producto: string
          order_id: string
          precio_unitario: number
          product_id?: string | null
          subtotal_item: number
          unidad?: string
          updated_at?: string
        }
        Update: {
          cantidad?: number
          cantidad_real?: number | null
          created_at?: string
          id?: string
          nombre_producto?: string
          order_id?: string
          precio_unitario?: number
          product_id?: string | null
          subtotal_item?: number
          unidad?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "store_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_orders: {
        Row: {
          ajuste_pendiente: number
          autorizado_en: string | null
          business_id: string
          captura_error: string | null
          captura_intentos: number
          capturado_en: string | null
          cargo_peso: number
          cargo_peso_repartidor: number
          cargo_servicio: number
          cliente_id: string
          comision_estimada: number
          comision_final: number | null
          comision_porcentaje: number
          costo_envio: number
          created_at: string
          credito_aplicado: number
          direccion_envio: Json
          envio_empresa: number
          envio_repartidor: number
          estado: string
          fecha_entrega: string | null
          id: string
          moneda: string
          monto_autorizado: number | null
          monto_capturado: number | null
          notas: string | null
          numero_pedido: string
          peso_total_kg: number
          peso_total_lb: number
          propina: number
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          subtotal: number
          total_estimado: number
          tramo: string
          updated_at: string
        }
        Insert: {
          ajuste_pendiente?: number
          autorizado_en?: string | null
          business_id: string
          captura_error?: string | null
          captura_intentos?: number
          capturado_en?: string | null
          cargo_peso?: number
          cargo_peso_repartidor?: number
          cargo_servicio?: number
          cliente_id: string
          comision_estimada?: number
          comision_final?: number | null
          comision_porcentaje?: number
          costo_envio?: number
          created_at?: string
          credito_aplicado?: number
          direccion_envio?: Json
          envio_empresa?: number
          envio_repartidor?: number
          estado?: string
          fecha_entrega?: string | null
          id?: string
          moneda?: string
          monto_autorizado?: number | null
          monto_capturado?: number | null
          notas?: string | null
          numero_pedido?: string
          peso_total_kg?: number
          peso_total_lb?: number
          propina?: number
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number
          total_estimado?: number
          tramo?: string
          updated_at?: string
        }
        Update: {
          ajuste_pendiente?: number
          autorizado_en?: string | null
          business_id?: string
          captura_error?: string | null
          captura_intentos?: number
          capturado_en?: string | null
          cargo_peso?: number
          cargo_peso_repartidor?: number
          cargo_servicio?: number
          cliente_id?: string
          comision_estimada?: number
          comision_final?: number | null
          comision_porcentaje?: number
          costo_envio?: number
          created_at?: string
          credito_aplicado?: number
          direccion_envio?: Json
          envio_empresa?: number
          envio_repartidor?: number
          estado?: string
          fecha_entrega?: string | null
          id?: string
          moneda?: string
          monto_autorizado?: number | null
          monto_capturado?: number | null
          notas?: string | null
          numero_pedido?: string
          peso_total_kg?: number
          peso_total_lb?: number
          propina?: number
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number
          total_estimado?: number
          tramo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "approved_businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      store_products: {
        Row: {
          business_id: string
          category_id: string | null
          created_at: string
          descripcion: string | null
          disponible: boolean
          id: string
          imagen_url: string | null
          nombre: string
          orden: number
          peso_kg: number
          peso_lb: number
          precio: number
          unidad: string
          updated_at: string
        }
        Insert: {
          business_id: string
          category_id?: string | null
          created_at?: string
          descripcion?: string | null
          disponible?: boolean
          id?: string
          imagen_url?: string | null
          nombre: string
          orden?: number
          peso_kg?: number
          peso_lb?: number
          precio?: number
          unidad?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          category_id?: string | null
          created_at?: string
          descripcion?: string | null
          disponible?: boolean
          id?: string
          imagen_url?: string | null
          nombre?: string
          orden?: number
          peso_kg?: number
          peso_lb?: number
          precio?: number
          unidad?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "approved_businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "store_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      support_conversations: {
        Row: {
          created_at: string
          id: string
          issue_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          issue_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          issue_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_conversations_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: true
            referencedRelation: "support_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      support_issues: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          product_name: string | null
          reason: string
          resolved_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          product_name?: string | null
          reason: string
          resolved_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          product_name?: string | null
          reason?: string
          resolved_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      wallet_credits: {
        Row: {
          amount_usd: number
          created_at: string
          id: string
          order_id: string | null
          reason: string
          user_id: string
        }
        Insert: {
          amount_usd: number
          created_at?: string
          id?: string
          order_id?: string | null
          reason: string
          user_id: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          id?: string
          order_id?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          amount_usd: number
          created_at: string
          id: string
          notes: string | null
          profile_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_usd: number
          created_at?: string
          id?: string
          notes?: string | null
          profile_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          id?: string
          notes?: string | null
          profile_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      zone_delivery_days: {
        Row: {
          days: number[]
          updated_at: string
          zone: string
        }
        Insert: {
          days?: number[]
          updated_at?: string
          zone: string
        }
        Update: {
          days?: number[]
          updated_at?: string
          zone?: string
        }
        Relationships: []
      }
    }
    Views: {
      approved_businesses_public: {
        Row: {
          business_name: string | null
          business_type: string | null
          city: string | null
          created_at: string | null
          id: string | null
          logo_url: string | null
          status: string | null
        }
        Insert: {
          business_name?: string | null
          business_type?: string | null
          city?: string | null
          created_at?: string | null
          id?: string | null
          logo_url?: string | null
          status?: string | null
        }
        Update: {
          business_name?: string | null
          business_type?: string | null
          city?: string | null
          created_at?: string | null
          id?: string | null
          logo_url?: string | null
          status?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_list_withdrawals: {
        Args: never
        Returns: {
          affiliate_email: string
          affiliate_name: string
          amount_usd: number
          created_at: string
          id: string
          notes: string
          profile_id: string
          status: string
          updated_at: string
        }[]
      }
      admin_process_withdrawal: {
        Args: { p_action: string; p_notes?: string; p_withdrawal_id: string }
        Returns: undefined
      }
      apply_substitution_timeouts: { Args: never; Returns: number }
      auth_buffer_settings: {
        Args: never
        Returns: {
          min_cents: number
          pct: number
        }[]
      }
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
      delay_route_stops: {
        Args: { p_minutes: number }
        Returns: {
          cliente_id: string
          new_eta: string
          order_id: string
        }[]
      }
      generate_referral_code: { Args: never; Returns: string }
      get_my_credit_balance: { Args: never; Returns: number }
      get_my_delivery_proof: {
        Args: { p_order_id: string }
        Returns: {
          delivered_at: string
          delivery_note: string
          delivery_photo_url: string
          recipient_name: string
          status: string
        }[]
      }
      get_my_pending_substitutions: {
        Args: { p_order_id: string }
        Returns: {
          cantidad: number
          item_id: string
          nombre_producto: string
          notified_at: string
          substitution_mode: string
        }[]
      }
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
      get_my_stop_eta: {
        Args: { p_order_id: string }
        Returns: {
          eta: string
          sequence_number: number
          status: string
          total_stops: number
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
      minutes_per_stop: { Args: never; Returns: number }
      promote_available_commissions: { Args: never; Returns: number }
      recalculate_route_etas: {
        Args: { p_route_id: string }
        Returns: undefined
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
      request_affiliate_withdrawal: {
        Args: never
        Returns: {
          amount_usd: number
          commissions_count: number
          withdrawal_id: string
        }[]
      }
      respond_substitution: {
        Args: { p_item_id: string; p_response: string }
        Returns: undefined
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
      route_status:
        | "disponible"
        | "asignada"
        | "en_transito"
        | "completada"
        | "cancelada"
      stop_status: "pendiente" | "en_camino" | "entregado" | "fallido"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      route_status: [
        "disponible",
        "asignada",
        "en_transito",
        "completada",
        "cancelada",
      ],
      stop_status: ["pendiente", "en_camino", "entregado", "fallido"],
    },
  },
} as const

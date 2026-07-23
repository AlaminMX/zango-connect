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
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      admin_settings: {
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
      categories: {
        Row: {
          icon_emoji: string
          id: string
          image_url: string | null
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          icon_emoji?: string
          id?: string
          image_url?: string | null
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          icon_emoji?: string
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      cities_of_business: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_featured_home: boolean
          name: string
          slug: string
          sort_order: number
          state: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_featured_home?: boolean
          name: string
          slug: string
          sort_order?: number
          state: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_featured_home?: boolean
          name?: string
          slug?: string
          sort_order?: number
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      featured_products_admin: {
        Row: {
          added_at: string | null
          added_by: string
          display_order: number
          id: string
          product_id: string
        }
        Insert: {
          added_at?: string | null
          added_by: string
          display_order?: number
          id?: string
          product_id: string
        }
        Update: {
          added_at?: string | null
          added_by?: string
          display_order?: number
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_products_admin_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_sections: {
        Row: {
          body_en: string | null
          body_ha: string | null
          content: string | null
          created_at: string
          id: string
          is_visible: boolean
          key: string
          sort_order: number
          subtitle: string | null
          subtitle_en: string | null
          subtitle_ha: string | null
          title: string
          title_en: string | null
          title_ha: string | null
          updated_at: string
        }
        Insert: {
          body_en?: string | null
          body_ha?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_visible?: boolean
          key: string
          sort_order?: number
          subtitle?: string | null
          subtitle_en?: string | null
          subtitle_ha?: string | null
          title: string
          title_en?: string | null
          title_ha?: string | null
          updated_at?: string
        }
        Update: {
          body_en?: string | null
          body_ha?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_visible?: boolean
          key?: string
          sort_order?: number
          subtitle?: string | null
          subtitle_en?: string | null
          subtitle_ha?: string | null
          title?: string
          title_en?: string | null
          title_ha?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          id: string
          seller_id: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          seller_id: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          seller_id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_views_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          blocked_at: string | null
          blocked_reason: string | null
          category: string | null
          created_at: string
          description: string | null
          featured_order: number
          id: string
          image_url: string | null
          image_urls: string[]
          is_featured: boolean
          name: string
          price: number | null
          price_updated_at: string | null
          seller_id: string
          status: string
          stock_status: string
        }
        Insert: {
          blocked_at?: string | null
          blocked_reason?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          featured_order?: number
          id?: string
          image_url?: string | null
          image_urls?: string[]
          is_featured?: boolean
          name: string
          price?: number | null
          price_updated_at?: string | null
          seller_id: string
          status?: string
          stock_status?: string
        }
        Update: {
          blocked_at?: string | null
          blocked_reason?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          featured_order?: number
          id?: string
          image_url?: string | null
          image_urls?: string[]
          is_featured?: boolean
          name?: string
          price?: number | null
          price_updated_at?: string | null
          seller_id?: string
          status?: string
          stock_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          preferred_city_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          preferred_city_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          preferred_city_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_preferred_city_id_fkey"
            columns: ["preferred_city_id"]
            isOneToOne: false
            referencedRelation: "cities_of_business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_preferred_city_id_fkey"
            columns: ["preferred_city_id"]
            isOneToOne: false
            referencedRelation: "cities_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      recently_viewed: {
        Row: {
          product_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          product_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          product_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: []
      }
      seller_admin_notes: {
        Row: {
          note: string
          seller_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          note?: string
          seller_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          note?: string
          seller_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_admin_notes_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_notices: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          message: string
          read_at: string | null
          seller_id: string
          severity: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          read_at?: string | null
          seller_id: string
          severity?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          read_at?: string | null
          seller_id?: string
          severity?: string
          title?: string
        }
        Relationships: []
      }
      seller_warnings: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          reason: string | null
          seller_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          seller_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_warnings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          bio: string | null
          blocked_at: string | null
          blocked_reason: string | null
          business_name: string
          category: string
          city: string
          city_id: string | null
          cover_photo_url: string | null
          created_at: string
          id: string
          is_blocked: boolean
          is_verified: boolean
          name: string
          onboarding_status: string
          profile_photo_url: string | null
          rating: number
          rejection_reason: string | null
          slug: string
          state: string | null
          status: string
          subscription_expires_at: string | null
          user_id: string
          verification_decided_at: string | null
          verification_decided_by: string | null
          verification_documents: Json
          verification_status: string
          whatsapp_number: string
        }
        Insert: {
          bio?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          business_name: string
          category: string
          city: string
          city_id?: string | null
          cover_photo_url?: string | null
          created_at?: string
          id?: string
          is_blocked?: boolean
          is_verified?: boolean
          name: string
          onboarding_status?: string
          profile_photo_url?: string | null
          rating?: number
          rejection_reason?: string | null
          slug: string
          state?: string | null
          status?: string
          subscription_expires_at?: string | null
          user_id: string
          verification_decided_at?: string | null
          verification_decided_by?: string | null
          verification_documents?: Json
          verification_status?: string
          whatsapp_number: string
        }
        Update: {
          bio?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          business_name?: string
          category?: string
          city?: string
          city_id?: string | null
          cover_photo_url?: string | null
          created_at?: string
          id?: string
          is_blocked?: boolean
          is_verified?: boolean
          name?: string
          onboarding_status?: string
          profile_photo_url?: string | null
          rating?: number
          rejection_reason?: string | null
          slug?: string
          state?: string | null
          status?: string
          subscription_expires_at?: string | null
          user_id?: string
          verification_decided_at?: string | null
          verification_decided_by?: string | null
          verification_documents?: Json
          verification_status?: string
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "sellers_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities_of_business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sellers_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      trending_sellers_admin: {
        Row: {
          added_at: string | null
          added_by: string
          display_order: number
          id: string
          seller_id: string
        }
        Insert: {
          added_at?: string | null
          added_by: string
          display_order?: number
          id?: string
          seller_id: string
        }
        Update: {
          added_at?: string | null
          added_by?: string
          display_order?: number
          id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trending_sellers_admin_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vouches: {
        Row: {
          created_at: string
          id: string
          vouched_seller_id: string
          voucher_seller_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          vouched_seller_id: string
          voucher_seller_id: string
        }
        Update: {
          created_at?: string
          id?: string
          vouched_seller_id?: string
          voucher_seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vouches_vouched_seller_id_fkey"
            columns: ["vouched_seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouches_voucher_seller_id_fkey"
            columns: ["voucher_seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_clicks: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          seller_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          seller_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_clicks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_clicks_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
        Row: {
          created_at: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      cities_with_stats: {
        Row: {
          created_at: string | null
          id: string | null
          is_active: boolean | null
          is_featured_home: boolean | null
          name: string | null
          products_added_30d: number | null
          products_count: number | null
          sellers_added_30d: number | null
          sellers_count: number | null
          slug: string | null
          sort_order: number | null
          state: string | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_delete_user: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      ensure_city: { Args: { _name: string; _state: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      slugify: { Args: { v: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user"
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
    },
  },
} as const

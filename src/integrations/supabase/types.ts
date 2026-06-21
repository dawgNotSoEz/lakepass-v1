export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      boats: {
        Row: {
          active: boolean;
          amenities: string[];
          boat_type: string;
          buffer_minutes: number;
          capacity: number;
          created_at: string;
          daily_rate: number | null;
          description: string | null;
          hourly_rate: number | null;
          id: string;
          marina_id: string;
          name: string;
          photos: string[];
          updated_at: string;
          year: number | null;
        };
        Insert: {
          active?: boolean;
          amenities?: string[];
          boat_type: string;
          buffer_minutes?: number;
          capacity?: number;
          created_at?: string;
          daily_rate?: number | null;
          description?: string | null;
          hourly_rate?: number | null;
          id?: string;
          marina_id: string;
          name: string;
          photos?: string[];
          updated_at?: string;
          year?: number | null;
        };
        Update: {
          active?: boolean;
          amenities?: string[];
          boat_type?: string;
          buffer_minutes?: number;
          capacity?: number;
          created_at?: string;
          daily_rate?: number | null;
          description?: string | null;
          hourly_rate?: number | null;
          id?: string;
          marina_id?: string;
          name?: string;
          photos?: string[];
          updated_at?: string;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "boats_marina_id_fkey";
            columns: ["marina_id"];
            isOneToOne: false;
            referencedRelation: "marinas";
            referencedColumns: ["id"];
          },
        ];
      };
      maintenance_logs: {
        Row: {
          boat_id: string;
          created_at: string;
          id: string;
          issue_description: string;
          logged_by: string;
          resolution_notes: string | null;
          scheduled_date: string | null;
          status: Database["public"]["Enums"]["maintenance_status"];
          updated_at: string;
        };
        Insert: {
          boat_id: string;
          created_at?: string;
          id?: string;
          issue_description: string;
          logged_by: string;
          resolution_notes?: string | null;
          scheduled_date?: string | null;
          status?: Database["public"]["Enums"]["maintenance_status"];
          updated_at?: string;
        };
        Update: {
          boat_id?: string;
          created_at?: string;
          id?: string;
          issue_description?: string;
          logged_by?: string;
          resolution_notes?: string | null;
          scheduled_date?: string | null;
          status?: Database["public"]["Enums"]["maintenance_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "maintenance_logs_boat_id_fkey";
            columns: ["boat_id"];
            isOneToOne: false;
            referencedRelation: "boats";
            referencedColumns: ["id"];
          },
        ];
      };
      marina_members: {
        Row: {
          created_at: string;
          id: string;
          marina_id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          marina_id: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          marina_id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "marina_members_marina_id_fkey";
            columns: ["marina_id"];
            isOneToOne: false;
            referencedRelation: "marinas";
            referencedColumns: ["id"];
          },
        ];
      };
      marinas: {
        Row: {
          address: string | null;
          created_at: string;
          created_by: string;
          id: string;
          lake: string | null;
          name: string;
          onboarding_completed: boolean;
          stripe_account_id: string | null;
          timezone: string;
          updated_at: string;
          widget_font: string;
          widget_logo_url: string | null;
          widget_primary_color: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          created_by: string;
          id?: string;
          lake?: string | null;
          name: string;
          onboarding_completed?: boolean;
          stripe_account_id?: string | null;
          timezone?: string;
          updated_at?: string;
          widget_font?: string;
          widget_logo_url?: string | null;
          widget_primary_color?: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          created_by?: string;
          id?: string;
          lake?: string | null;
          name?: string;
          onboarding_completed?: boolean;
          stripe_account_id?: string | null;
          timezone?: string;
          updated_at?: string;
          widget_font?: string;
          widget_logo_url?: string | null;
          widget_primary_color?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null;
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          onboarding_completed: boolean;
          updated_at: string;
        };
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"] | null;
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          onboarding_completed?: boolean;
          updated_at?: string;
        };
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"] | null;
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          onboarding_completed?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      reservations: {
        Row: {
          boat_id: string;
          check_in_time: string | null;
          check_out_time: string | null;
          condition_notes: string | null;
          created_at: string;
          customer_email: string;
          customer_name: string;
          customer_phone: string | null;
          end_time: string;
          fuel_level_in: string | null;
          fuel_level_out: string | null;
          id: string;
          marina_id: string;
          security_deposit: number;
          start_time: string;
          status: Database["public"]["Enums"]["reservation_status"];
          stripe_payment_intent_id: string | null;
          stripe_transfer_id: string | null;
          subtotal: number;
          total_price: number;
          updated_at: string;
          user_id: string | null;
          waiver_signature_text: string | null;
          waiver_signed: boolean;
          waiver_signed_at: string | null;
        };
        Insert: {
          boat_id: string;
          check_in_time?: string | null;
          check_out_time?: string | null;
          condition_notes?: string | null;
          created_at?: string;
          customer_email: string;
          customer_name: string;
          customer_phone?: string | null;
          end_time: string;
          fuel_level_in?: string | null;
          fuel_level_out?: string | null;
          id?: string;
          marina_id: string;
          security_deposit?: number;
          start_time: string;
          status?: Database["public"]["Enums"]["reservation_status"];
          stripe_payment_intent_id?: string | null;
          stripe_transfer_id?: string | null;
          subtotal?: number;
          total_price?: number;
          updated_at?: string;
          user_id?: string | null;
          waiver_signature_text?: string | null;
          waiver_signed?: boolean;
          waiver_signed_at?: string | null;
        };
        Update: {
          boat_id?: string;
          check_in_time?: string | null;
          check_out_time?: string | null;
          condition_notes?: string | null;
          created_at?: string;
          customer_email?: string;
          customer_name?: string;
          customer_phone?: string | null;
          end_time?: string;
          fuel_level_in?: string | null;
          fuel_level_out?: string | null;
          id?: string;
          marina_id?: string;
          security_deposit?: number;
          start_time?: string;
          status?: Database["public"]["Enums"]["reservation_status"];
          stripe_payment_intent_id?: string | null;
          stripe_transfer_id?: string | null;
          subtotal?: number;
          total_price?: number;
          updated_at?: string;
          user_id?: string | null;
          waiver_signature_text?: string | null;
          waiver_signed?: boolean;
          waiver_signed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reservations_boat_id_fkey";
            columns: ["boat_id"];
            isOneToOne: false;
            referencedRelation: "boats";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_marina_id_fkey";
            columns: ["marina_id"];
            isOneToOne: false;
            referencedRelation: "marinas";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_marina_role: {
        Args: {
          _marina_id: string;
          _roles: Database["public"]["Enums"]["app_role"][];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_marina_member: {
        Args: { _marina_id: string; _user_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      account_type: "customer" | "marina";
      app_role: "owner" | "manager" | "staff";
      maintenance_status: "open" | "in_progress" | "resolved";
      reservation_status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_type: ["customer", "marina"],
      app_role: ["owner", "manager", "staff"],
      maintenance_status: ["open", "in_progress", "resolved"],
      reservation_status: ["pending", "confirmed", "cancelled", "completed", "no_show"],
    },
  },
} as const;

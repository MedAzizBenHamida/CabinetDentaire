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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      agenda_entries: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          internal_reason: string
          is_cancelled: boolean
          kind: string
          patient_id: string | null
          resource_id: string
          service_id: string | null
          starts_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          internal_reason?: string
          is_cancelled?: boolean
          kind: string
          patient_id?: string | null
          resource_id: string
          service_id?: string | null
          starts_at: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          internal_reason?: string
          is_cancelled?: boolean
          kind?: string
          patient_id?: string | null
          resource_id?: string
          service_id?: string | null
          starts_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_entries_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_entries_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "care_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_entries_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "care_services"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_requests: {
        Row: {
          appointment_id: string | null
          birth_date: string
          created_at: string
          desired_care: string | null
          desired_date: string
          desired_period: string
          first_name: string
          id: string
          last_name: string
          phone: string
          status: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          birth_date: string
          created_at?: string
          desired_care?: string | null
          desired_date: string
          desired_period: string
          first_name: string
          id?: string
          last_name: string
          phone: string
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          birth_date?: string
          created_at?: string
          desired_care?: string | null
          desired_date?: string
          desired_period?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "agenda_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      cabinet_audit_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          operation: string
          updated_at: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          operation: string
          updated_at?: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          operation?: string
          updated_at?: string
        }
        Relationships: []
      }
      care_resources: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      care_services: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      exceptional_closures: {
        Row: {
          closed_on: string
          created_at: string
          id: string
          reason: string
          resource_id: string
          updated_at: string
        }
        Insert: {
          closed_on: string
          created_at?: string
          id?: string
          reason?: string
          resource_id: string
          updated_at?: string
        }
        Update: {
          closed_on?: string
          created_at?: string
          id?: string
          reason?: string
          resource_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exceptional_closures_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "care_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_note_versions: {
        Row: {
          content: string
          created_at: string
          edited_by: string
          finalized_at: string | null
          finalized_by: string | null
          id: string
          note_id: string
          revision: number
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          edited_by: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          note_id: string
          revision: number
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          edited_by?: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          note_id?: string
          revision?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_note_versions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "medical_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string
          edited_by: string
          finalized_at: string | null
          finalized_by: string | null
          id: string
          patient_id: string
          revision: number
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          edited_by: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          patient_id: string
          revision?: number
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          edited_by?: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          patient_id?: string
          revision?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      opening_intervals: {
        Row: {
          closes_at: string
          created_at: string
          id: string
          opens_at: string
          resource_id: string
          updated_at: string
          weekday: number
        }
        Insert: {
          closes_at: string
          created_at?: string
          id?: string
          opens_at: string
          resource_id: string
          updated_at?: string
          weekday: number
        }
        Update: {
          closes_at?: string
          created_at?: string
          id?: string
          opens_at?: string
          resource_id?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "opening_intervals_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "care_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_change_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          id: string
          operation: string
          patient_id: string
          updated_at: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          operation: string
          patient_id: string
          updated_at?: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          operation?: string
          patient_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_change_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_read_events: {
        Row: {
          actor_user_id: string
          created_at: string
          id: string
          operation: string
          patient_id: string
          updated_at: string
        }
        Insert: {
          actor_user_id: string
          created_at?: string
          id?: string
          operation: string
          patient_id: string
          updated_at?: string
        }
        Update: {
          actor_user_id?: string
          created_at?: string
          id?: string
          operation?: string
          patient_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_read_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          birth_date: string
          created_at: string
          first_name: string
          id: string
          last_name: string
          phone: string
          updated_at: string
        }
        Insert: {
          birth_date: string
          created_at?: string
          first_name: string
          id?: string
          last_name: string
          phone: string
          updated_at?: string
        }
        Update: {
          birth_date?: string
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      professional_authorizations: {
        Row: {
          created_at: string
          is_verified_dentist: boolean
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          is_verified_dentist?: boolean
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          is_verified_dentist?: boolean
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_authorizations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      staff_accounts: {
        Row: {
          created_at: string
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      available_request_days: { Args: { days_ahead: number }; Returns: Json }
      available_request_periods: {
        Args: { requested_date: string }
        Returns: Json
      }
      confirm_appointment_request: {
        Args: {
          begins_at: string
          request_id: string
          selected_patient: string
          selected_resource: string
          selected_service: string
        }
        Returns: string
      }
      consume_public_request_limit: {
        Args: { bucket_key: string }
        Returns: boolean
      }
      manage_staff_account: {
        Args: {
          active: boolean
          assigned_role: Database["public"]["Enums"]["app_role"]
          display_name: string
          target_user: string
        }
        Returns: undefined
      }
      read_agenda: {
        Args: {
          page_offset?: number
          page_size?: number
          window_end: string
          window_start: string
        }
        Returns: Json
      }
      read_appointment_requests: {
        Args: { page_offset?: number; page_size?: number }
        Returns: Json
      }
      read_cabinet_audit: {
        Args: { page_offset?: number; page_size?: number }
        Returns: Json
      }
      read_medical_note_history: {
        Args: {
          page_offset?: number
          page_size?: number
          selected_note: string
        }
        Returns: Json
      }
      read_medical_notes: {
        Args: {
          page_offset?: number
          page_size?: number
          selected_patient: string
        }
        Returns: Json
      }
      read_patient: { Args: { patient_id: string }; Returns: Json }
      read_patient_appointments: {
        Args: {
          page_offset?: number
          page_size?: number
          selected_patient: string
        }
        Returns: Json
      }
      remove_schedule_configuration: {
        Args: { configuration_kind: string; record_id: string }
        Returns: undefined
      }
      resolve_request_patient: { Args: { request_id: string }; Returns: Json }
      save_agenda_entry: {
        Args: {
          begins_at: string
          cancelled?: boolean
          entry_id: string
          entry_kind: string
          finishes_at: string
          reason?: string
          selected_patient: string
          selected_resource: string
          selected_service: string
        }
        Returns: string
      }
      save_care_service: {
        Args: {
          active?: boolean
          minutes: number
          service_id: string
          service_name: string
        }
        Returns: string
      }
      save_exceptional_closure: {
        Args: {
          closed_date: string
          closure_id: string
          closure_reason?: string
          selected_resource: string
        }
        Returns: string
      }
      save_medical_note: {
        Args: {
          expected_revision?: number
          finalize?: boolean
          note_content: string
          note_id: string
          selected_patient: string
        }
        Returns: string
      }
      save_opening_interval: {
        Args: {
          closing_time: string
          day_of_week: number
          interval_id: string
          opening_time: string
          selected_resource: string
        }
        Returns: string
      }
      save_patient_record: {
        Args: {
          date_of_birth: string
          family_name: string
          given_name: string
          patient_id: string
          tunisian_phone: string
        }
        Returns: string
      }
      search_patients: {
        Args: { page_offset?: number; page_size?: number; search_text?: string }
        Returns: Json
      }
      submit_appointment_request: {
        Args: {
          birth_date: string
          family_name: string
          given_name: string
          requested_care?: string
          requested_date: string
          requested_period: string
          tunisian_phone: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "SUPER_ADMIN" | "ADMIN" | "ASSISTANTE"
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
      app_role: ["SUPER_ADMIN", "ADMIN", "ASSISTANTE"],
    },
  },
} as const

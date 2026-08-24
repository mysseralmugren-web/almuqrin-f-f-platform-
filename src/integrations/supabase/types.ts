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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      accounting_settings: {
        Row: {
          ap_account_id: string | null
          ar_account_id: string | null
          cash_account_id: string | null
          cogs_account_id: string | null
          company_id: string
          created_at: string
          input_vat_account_id: string | null
          inventory_account_id: string | null
          output_vat_account_id: string | null
          purchase_expense_account_id: string | null
          sales_revenue_account_id: string | null
          scrap_account_id: string | null
          updated_at: string
          wip_account_id: string | null
        }
        Insert: {
          ap_account_id?: string | null
          ar_account_id?: string | null
          cash_account_id?: string | null
          cogs_account_id?: string | null
          company_id: string
          created_at?: string
          input_vat_account_id?: string | null
          inventory_account_id?: string | null
          output_vat_account_id?: string | null
          purchase_expense_account_id?: string | null
          sales_revenue_account_id?: string | null
          scrap_account_id?: string | null
          updated_at?: string
          wip_account_id?: string | null
        }
        Update: {
          ap_account_id?: string | null
          ar_account_id?: string | null
          cash_account_id?: string | null
          cogs_account_id?: string | null
          company_id?: string
          created_at?: string
          input_vat_account_id?: string | null
          inventory_account_id?: string | null
          output_vat_account_id?: string | null
          purchase_expense_account_id?: string | null
          sales_revenue_account_id?: string | null
          scrap_account_id?: string | null
          updated_at?: string
          wip_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_settings_ap_account_id_fkey"
            columns: ["ap_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_settings_ar_account_id_fkey"
            columns: ["ar_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_settings_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_settings_cogs_account_id_fkey"
            columns: ["cogs_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_settings_input_vat_account_id_fkey"
            columns: ["input_vat_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_settings_inventory_account_id_fkey"
            columns: ["inventory_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_settings_output_vat_account_id_fkey"
            columns: ["output_vat_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_settings_purchase_expense_account_id_fkey"
            columns: ["purchase_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_settings_sales_revenue_account_id_fkey"
            columns: ["sales_revenue_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_settings_scrap_account_id_fkey"
            columns: ["scrap_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_settings_wip_account_id_fkey"
            columns: ["wip_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_design_briefs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          background: string | null
          brief: string
          company_id: string
          created_at: string
          created_by: string
          customer_id: string | null
          deleted_at: string | null
          id: string
          job_id: string | null
          palette: Json
          project_id: string | null
          quotation_id: string | null
          status: string
          style: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          background?: string | null
          brief: string
          company_id: string
          created_at?: string
          created_by: string
          customer_id?: string | null
          deleted_at?: string | null
          id?: string
          job_id?: string | null
          palette?: Json
          project_id?: string | null
          quotation_id?: string | null
          status?: string
          style?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          background?: string | null
          brief?: string
          company_id?: string
          created_at?: string
          created_by?: string
          customer_id?: string | null
          deleted_at?: string | null
          id?: string
          job_id?: string | null
          palette?: Json
          project_id?: string | null
          quotation_id?: string | null
          status?: string
          style?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_design_briefs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_design_briefs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_design_briefs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ai_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_design_briefs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_design_briefs_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_extractions: {
        Row: {
          company_id: string
          confidence: number | null
          created_at: string
          evidence: Json
          field_path: string
          group_key: string
          id: string
          is_accepted: boolean | null
          is_reviewed: boolean
          job_id: string
          label_ar: string | null
          label_en: string | null
          line_no: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_value_number: number | null
          reviewed_value_text: string | null
          value_json: Json | null
          value_kind: Database["public"]["Enums"]["ai_value_kind"]
          value_number: number | null
          value_text: string | null
        }
        Insert: {
          company_id: string
          confidence?: number | null
          created_at?: string
          evidence?: Json
          field_path: string
          group_key?: string
          id?: string
          is_accepted?: boolean | null
          is_reviewed?: boolean
          job_id: string
          label_ar?: string | null
          label_en?: string | null
          line_no?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_value_number?: number | null
          reviewed_value_text?: string | null
          value_json?: Json | null
          value_kind?: Database["public"]["Enums"]["ai_value_kind"]
          value_number?: number | null
          value_text?: string | null
        }
        Update: {
          company_id?: string
          confidence?: number | null
          created_at?: string
          evidence?: Json
          field_path?: string
          group_key?: string
          id?: string
          is_accepted?: boolean | null
          is_reviewed?: boolean
          job_id?: string
          label_ar?: string | null
          label_en?: string | null
          line_no?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_value_number?: number | null
          reviewed_value_text?: string | null
          value_json?: Json | null
          value_kind?: Database["public"]["Enums"]["ai_value_kind"]
          value_number?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_extractions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_extractions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ai_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_job_files: {
        Row: {
          checksum: string | null
          company_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          file_name: string
          id: string
          job_id: string
          mime_type: string
          object_path: string
          page_count: number | null
          size_bytes: number
        }
        Insert: {
          checksum?: string | null
          company_id: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          file_name: string
          id?: string
          job_id: string
          mime_type: string
          object_path: string
          page_count?: number | null
          size_bytes: number
        }
        Update: {
          checksum?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          file_name?: string
          id?: string
          job_id?: string
          mime_type?: string
          object_path?: string
          page_count?: number | null
          size_bytes?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_job_files_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_job_files_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ai_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_jobs: {
        Row: {
          attempts: number
          company_id: string
          confidence: number | null
          cost_usd: number
          created_at: string
          deleted_at: string | null
          duration_ms: number | null
          error_code: string | null
          error_message: string | null
          finished_at: string | null
          id: string
          idempotency_key: string
          input_params: Json
          job_number: string
          kind: Database["public"]["Enums"]["ai_job_kind"]
          max_attempts: number
          model: string | null
          prompt_version: string
          requested_by: string
          started_at: string | null
          status: Database["public"]["Enums"]["ai_job_status"]
          target_entity: string | null
          target_id: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          company_id: string
          confidence?: number | null
          cost_usd?: number
          created_at?: string
          deleted_at?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          idempotency_key: string
          input_params?: Json
          job_number: string
          kind: Database["public"]["Enums"]["ai_job_kind"]
          max_attempts?: number
          model?: string | null
          prompt_version?: string
          requested_by: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["ai_job_status"]
          target_entity?: string | null
          target_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          company_id?: string
          confidence?: number | null
          cost_usd?: number
          created_at?: string
          deleted_at?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          idempotency_key?: string
          input_params?: Json
          job_number?: string
          kind?: Database["public"]["Enums"]["ai_job_kind"]
          max_attempts?: number
          model?: string | null
          prompt_version?: string
          requested_by?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["ai_job_status"]
          target_entity?: string | null
          target_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_provider_settings: {
        Row: {
          admin_kinds_only: boolean
          allowed_mime_types: string[]
          brand_primary: string
          brand_secondary: string
          company_id: string
          created_at: string
          default_model: string
          enabled: boolean
          id: string
          max_attempts: number
          max_file_mb: number
          retention_days: number
          seat_pitch_cm: number
          updated_at: string
          watermark_text: string | null
        }
        Insert: {
          admin_kinds_only?: boolean
          allowed_mime_types?: string[]
          brand_primary?: string
          brand_secondary?: string
          company_id: string
          created_at?: string
          default_model?: string
          enabled?: boolean
          id?: string
          max_attempts?: number
          max_file_mb?: number
          retention_days?: number
          seat_pitch_cm?: number
          updated_at?: string
          watermark_text?: string | null
        }
        Update: {
          admin_kinds_only?: boolean
          allowed_mime_types?: string[]
          brand_primary?: string
          brand_secondary?: string
          company_id?: string
          created_at?: string
          default_model?: string
          enabled?: boolean
          id?: string
          max_attempts?: number
          max_file_mb?: number
          retention_days?: number
          seat_pitch_cm?: number
          updated_at?: string
          watermark_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_provider_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_recommendations: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          applied_entity: string | null
          applied_id: string | null
          company_id: string
          confidence: number | null
          created_at: string
          id: string
          job_id: string
          payload: Json
          rationale: string | null
          rec_type: string
          severity: string
          status: Database["public"]["Enums"]["ai_rec_status"]
          title_ar: string
          title_en: string | null
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          applied_entity?: string | null
          applied_id?: string | null
          company_id: string
          confidence?: number | null
          created_at?: string
          id?: string
          job_id: string
          payload?: Json
          rationale?: string | null
          rec_type: string
          severity?: string
          status?: Database["public"]["Enums"]["ai_rec_status"]
          title_ar: string
          title_en?: string | null
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          applied_entity?: string | null
          applied_id?: string | null
          company_id?: string
          confidence?: number | null
          created_at?: string
          id?: string
          job_id?: string
          payload?: Json
          rationale?: string | null
          rec_type?: string
          severity?: string
          status?: Database["public"]["Enums"]["ai_rec_status"]
          title_ar?: string
          title_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_recommendations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_recommendations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ai_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_reviews: {
        Row: {
          action: Database["public"]["Enums"]["ai_review_action"]
          company_id: string
          created_at: string
          id: string
          job_id: string
          notes: string | null
          recommendation_id: string | null
          reviewer_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["ai_review_action"]
          company_id: string
          created_at?: string
          id?: string
          job_id: string
          notes?: string | null
          recommendation_id?: string | null
          reviewer_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["ai_review_action"]
          company_id?: string
          created_at?: string
          id?: string
          job_id?: string
          notes?: string | null
          recommendation_id?: string | null
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ai_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_reviews_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "ai_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          attempt: number
          company_id: string
          completion_tokens: number
          cost_usd: number
          created_at: string
          created_by: string | null
          duration_ms: number | null
          error_code: string | null
          id: string
          job_id: string | null
          kind: Database["public"]["Enums"]["ai_job_kind"] | null
          model: string | null
          prompt_tokens: number
          status: string
        }
        Insert: {
          attempt?: number
          company_id: string
          completion_tokens?: number
          cost_usd?: number
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          error_code?: string | null
          id?: string
          job_id?: string | null
          kind?: Database["public"]["Enums"]["ai_job_kind"] | null
          model?: string | null
          prompt_tokens?: number
          status: string
        }
        Update: {
          attempt?: number
          company_id?: string
          completion_tokens?: number
          cost_usd?: number
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          error_code?: string | null
          id?: string
          job_id?: string | null
          kind?: Database["public"]["Enums"]["ai_job_kind"] | null
          model?: string | null
          prompt_tokens?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ai_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          company_id: string
          content_type: string | null
          created_at: string
          created_by: string | null
          entity: string
          entity_id: string
          file_name: string
          id: string
          object_path: string
          size_bytes: number | null
        }
        Insert: {
          company_id: string
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          entity: string
          entity_id: string
          file_name: string
          id?: string
          object_path: string
          size_bytes?: number | null
        }
        Update: {
          company_id?: string
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          entity?: string
          entity_id?: string
          file_name?: string
          id?: string
          object_path?: string
          size_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          check_in: string | null
          check_out: string | null
          company_id: string
          created_at: string
          created_by: string | null
          early_leave_minutes: number
          employee_id: string
          id: string
          is_manual: boolean
          late_minutes: number
          manual_reason: string | null
          overtime_minutes: number
          shift_id: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
          work_date: string
          worked_minutes: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          check_in?: string | null
          check_out?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          early_leave_minutes?: number
          employee_id: string
          id?: string
          is_manual?: boolean
          late_minutes?: number
          manual_reason?: string | null
          overtime_minutes?: number
          shift_id?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          work_date: string
          worked_minutes?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          check_in?: string | null
          check_out?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          early_leave_minutes?: number
          employee_id?: string
          id?: string
          is_manual?: boolean
          late_minutes?: number
          manual_reason?: string | null
          overtime_minutes?: number
          shift_id?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          work_date?: string
          worked_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          details: Json | null
          entity: string | null
          entity_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          bank_name: string | null
          company_id: string
          created_at: string
          currency: string
          gl_account_id: string | null
          iban: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          bank_name?: string | null
          company_id: string
          created_at?: string
          currency?: string
          gl_account_id?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          bank_name?: string | null
          company_id?: string
          created_at?: string
          currency?: string
          gl_account_id?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statement_lines: {
        Row: {
          amount: number
          bank_account_id: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          matched_voucher_id: string | null
          reconciled: boolean
          reconciled_at: string | null
          reconciled_by: string | null
          reference: string | null
          txn_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          matched_voucher_id?: string | null
          reconciled?: boolean
          reconciled_at?: string | null
          reconciled_by?: string | null
          reference?: string | null
          txn_date: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          matched_voucher_id?: string | null
          reconciled?: boolean
          reconciled_at?: string | null
          reconciled_by?: string | null
          reference?: string | null
          txn_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_statement_lines_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_lines_matched_voucher_id_fkey"
            columns: ["matched_voucher_id"]
            isOneToOne: false
            referencedRelation: "cash_vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      bom_lines: {
        Row: {
          company_id: string
          created_at: string
          id: string
          issued_qty: number
          item_id: string
          location_id: string | null
          manufacturing_order_id: string
          planned_qty: number
          reserved_qty: number
          returned_qty: number
          scrap_qty: number
          unit: string
          unit_cost: number
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          issued_qty?: number
          item_id: string
          location_id?: string | null
          manufacturing_order_id: string
          planned_qty: number
          reserved_qty?: number
          returned_qty?: number
          scrap_qty?: number
          unit?: string
          unit_cost?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          issued_qty?: number
          item_id?: string
          location_id?: string | null
          manufacturing_order_id?: string
          planned_qty?: number
          reserved_qty?: number
          returned_qty?: number
          scrap_qty?: number
          unit?: string
          unit_cost?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bom_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_lines_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_lines_manufacturing_order_id_fkey"
            columns: ["manufacturing_order_id"]
            isOneToOne: false
            referencedRelation: "manufacturing_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_lines_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_vouchers: {
        Row: {
          amount: number
          bank_account_id: string
          bank_reference: string | null
          company_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          invoice_id: string | null
          journal_entry_id: string | null
          memo: string | null
          party_type: string | null
          status: Database["public"]["Enums"]["voucher_status"]
          supplier_id: string | null
          supplier_invoice_id: string | null
          to_bank_account_id: string | null
          updated_at: string
          voucher_date: string
          voucher_number: string
          voucher_type: Database["public"]["Enums"]["voucher_type"]
        }
        Insert: {
          amount: number
          bank_account_id: string
          bank_reference?: string | null
          company_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          memo?: string | null
          party_type?: string | null
          status?: Database["public"]["Enums"]["voucher_status"]
          supplier_id?: string | null
          supplier_invoice_id?: string | null
          to_bank_account_id?: string | null
          updated_at?: string
          voucher_date?: string
          voucher_number: string
          voucher_type: Database["public"]["Enums"]["voucher_type"]
        }
        Update: {
          amount?: number
          bank_account_id?: string
          bank_reference?: string | null
          company_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          memo?: string | null
          party_type?: string | null
          status?: Database["public"]["Enums"]["voucher_status"]
          supplier_id?: string | null
          supplier_invoice_id?: string | null
          to_bank_account_id?: string | null
          updated_at?: string
          voucher_date?: string
          voucher_number?: string
          voucher_type?: Database["public"]["Enums"]["voucher_type"]
        }
        Relationships: [
          {
            foreignKeyName: "cash_vouchers_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_vouchers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_vouchers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_vouchers_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_vouchers_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_vouchers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_vouchers_supplier_invoice_id_fkey"
            columns: ["supplier_invoice_id"]
            isOneToOne: false
            referencedRelation: "supplier_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_vouchers_to_bank_account_id_fkey"
            columns: ["to_bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          code: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          is_postable: boolean
          name_ar: string
          name_en: string | null
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          code: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_postable?: boolean
          name_ar: string
          name_en?: string | null
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_postable?: boolean
          name_ar?: string
          name_en?: string | null
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      color_sample_approvals: {
        Row: {
          color_code: string | null
          color_name: string
          company_id: string
          created_at: string
          created_by: string | null
          customer_comment: string | null
          decided_at: string | null
          decided_by: string | null
          finish_type: string | null
          id: string
          object_path: string | null
          project_id: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["approval_status"]
          updated_at: string
        }
        Insert: {
          color_code?: string | null
          color_name: string
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_comment?: string | null
          decided_at?: string | null
          decided_by?: string | null
          finish_type?: string | null
          id?: string
          object_path?: string | null
          project_id: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
        }
        Update: {
          color_code?: string | null
          color_name?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_comment?: string | null
          decided_at?: string | null
          decided_by?: string | null
          finish_type?: string | null
          id?: string
          object_path?: string | null
          project_id?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "color_sample_approvals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "color_sample_approvals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address_additional_no: string | null
          address_building_no: string | null
          address_city: string | null
          address_district: string | null
          address_postal_code: string | null
          address_street: string | null
          country_code: string
          cr_number: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name_ar: string
          name_en: string | null
          phone: string | null
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          address_additional_no?: string | null
          address_building_no?: string | null
          address_city?: string | null
          address_district?: string | null
          address_postal_code?: string | null
          address_street?: string | null
          country_code?: string
          cr_number?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name_ar: string
          name_en?: string | null
          phone?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          address_additional_no?: string | null
          address_building_no?: string | null
          address_city?: string | null
          address_district?: string | null
          address_postal_code?: string | null
          address_street?: string | null
          country_code?: string
          cr_number?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name_ar?: string
          name_en?: string | null
          phone?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      platform_bootstrap_claims: {
        Row: {
          claimed_at: string
          company_id: string | null
          completed_at: string | null
          id: boolean
          user_id: string | null
        }
        Insert: {
          claimed_at?: string
          company_id?: string | null
          completed_at?: string | null
          id?: boolean
          user_id?: string | null
        }
        Update: {
          claimed_at?: string
          company_id?: string | null
          completed_at?: string | null
          id?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      company_documents: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          doc_type: string
          expires_on: string | null
          id: string
          issued_on: string | null
          notes: string | null
          reference_no: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["company_doc_status"]
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          doc_type: string
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          notes?: string | null
          reference_no?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["company_doc_status"]
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          doc_type?: string
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          notes?: string | null
          reference_no?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["company_doc_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_identity: {
        Row: {
          address_proof_expires_on: string | null
          address_proof_verified: boolean
          company_id: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          default_terms_ar: string | null
          font_family: string
          footer_note_ar: string | null
          id: string
          legal_name_ar: string | null
          legal_name_en: string | null
          logo_path: string | null
          primary_color: string
          reviewed_at: string | null
          reviewed_by: string | null
          secondary_color: string
          short_address: string | null
          status: Database["public"]["Enums"]["identity_review_status"]
          trade_name_ar: string | null
          trade_name_en: string | null
          updated_at: string
          vat_effective_date: string | null
          watermark_enabled: boolean
          watermark_opacity: number
          watermark_text: string | null
          website: string | null
          zatca_phase2_enabled: boolean
        }
        Insert: {
          address_proof_expires_on?: string | null
          address_proof_verified?: boolean
          company_id: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          default_terms_ar?: string | null
          font_family?: string
          footer_note_ar?: string | null
          id?: string
          legal_name_ar?: string | null
          legal_name_en?: string | null
          logo_path?: string | null
          primary_color?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          secondary_color?: string
          short_address?: string | null
          status?: Database["public"]["Enums"]["identity_review_status"]
          trade_name_ar?: string | null
          trade_name_en?: string | null
          updated_at?: string
          vat_effective_date?: string | null
          watermark_enabled?: boolean
          watermark_opacity?: number
          watermark_text?: string | null
          website?: string | null
          zatca_phase2_enabled?: boolean
        }
        Update: {
          address_proof_expires_on?: string | null
          address_proof_verified?: boolean
          company_id?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          default_terms_ar?: string | null
          font_family?: string
          footer_note_ar?: string | null
          id?: string
          legal_name_ar?: string | null
          legal_name_en?: string | null
          logo_path?: string | null
          primary_color?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          secondary_color?: string
          short_address?: string | null
          status?: Database["public"]["Enums"]["identity_review_status"]
          trade_name_ar?: string | null
          trade_name_en?: string | null
          updated_at?: string
          vat_effective_date?: string | null
          watermark_enabled?: boolean
          watermark_opacity?: number
          watermark_text?: string | null
          website?: string | null
          zatca_phase2_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "company_identity_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_identity_proposals: {
        Row: {
          company_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          field_key: string
          id: string
          proposed_value: string
          source_note: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          field_key: string
          id?: string
          proposed_value: string
          source_note?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          field_key?: string
          id?: string
          proposed_value?: string
          source_note?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_identity_proposals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          code: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name_ar: string
          name_en: string | null
          updated_at: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_communications: {
        Row: {
          channel: Database["public"]["Enums"]["comm_channel"]
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          next_follow_up: string | null
          occurred_at: string
          outcome: string | null
          project_id: string
          subject: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["comm_channel"]
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          next_follow_up?: string | null
          occurred_at?: string
          outcome?: string | null
          project_id: string
          subject: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["comm_channel"]
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          next_follow_up?: string | null
          occurred_at?: string
          outcome?: string | null
          project_id?: string
          subject?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_communications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_communications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_communications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_users: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string
          id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_id: string
          id?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_users_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          company_id: string
          cr_number: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string | null
          notes: string | null
          phone: string | null
          segment: string | null
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id: string
          cr_number?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          notes?: string | null
          phone?: string | null
          segment?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string
          cr_number?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          notes?: string | null
          phone?: string | null
          segment?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      debit_notes: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          dn_number: string
          id: string
          issue_date: string
          reason: string
          subtotal: number
          supplier_id: string
          supplier_invoice_id: string | null
          supplier_return_id: string | null
          total: number
          updated_at: string
          vat_amount: number
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          dn_number: string
          id?: string
          issue_date?: string
          reason: string
          subtotal?: number
          supplier_id: string
          supplier_invoice_id?: string | null
          supplier_return_id?: string | null
          total?: number
          updated_at?: string
          vat_amount?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          dn_number?: string
          id?: string
          issue_date?: string
          reason?: string
          subtotal?: number
          supplier_id?: string
          supplier_invoice_id?: string | null
          supplier_return_id?: string | null
          total?: number
          updated_at?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "debit_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debit_notes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debit_notes_supplier_invoice_id_fkey"
            columns: ["supplier_invoice_id"]
            isOneToOne: false
            referencedRelation: "supplier_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debit_notes_supplier_return_id_fkey"
            columns: ["supplier_return_id"]
            isOneToOne: false
            referencedRelation: "supplier_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_note_items: {
        Row: {
          company_id: string | null
          created_at: string
          delivery_note_id: string
          description: string
          id: string
          manufacturing_order_id: string | null
          quantity: number
          sales_order_item_id: string | null
          unit: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          delivery_note_id: string
          description: string
          id?: string
          manufacturing_order_id?: string | null
          quantity?: number
          sales_order_item_id?: string | null
          unit?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          delivery_note_id?: string
          description?: string
          id?: string
          manufacturing_order_id?: string | null
          quantity?: number
          sales_order_item_id?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_note_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_note_items_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "delivery_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_note_items_manufacturing_order_id_fkey"
            columns: ["manufacturing_order_id"]
            isOneToOne: false
            referencedRelation: "manufacturing_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_note_items_sales_order_item_id_fkey"
            columns: ["sales_order_item_id"]
            isOneToOne: false
            referencedRelation: "sales_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_notes: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          delivery_date: string
          dn_number: string
          id: string
          installation_order_id: string | null
          invoice_id: string | null
          notes: string | null
          project_id: string | null
          received_by: string | null
          received_id_number: string | null
          sales_order_id: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          delivery_date?: string
          dn_number: string
          id?: string
          installation_order_id?: string | null
          invoice_id?: string | null
          notes?: string | null
          project_id?: string | null
          received_by?: string | null
          received_id_number?: string | null
          sales_order_id?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          delivery_date?: string
          dn_number?: string
          id?: string
          installation_order_id?: string | null
          invoice_id?: string | null
          notes?: string | null
          project_id?: string | null
          received_by?: string | null
          received_id_number?: string | null
          sales_order_id?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_installation_order_id_fkey"
            columns: ["installation_order_id"]
            isOneToOne: false
            referencedRelation: "installation_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          manager_employee_id: string | null
          name_ar: string
          name_en: string | null
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          manager_employee_id?: string | null
          name_ar: string
          name_en?: string | null
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          manager_employee_id?: string | null
          name_ar?: string
          name_en?: string | null
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_manager_fkey"
            columns: ["manager_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      document_approvals: {
        Row: {
          action: string
          actor_id: string | null
          company_id: string
          created_at: string
          from_status: Database["public"]["Enums"]["doc_status"] | null
          generated_document_id: string
          id: string
          note: string | null
          to_status: Database["public"]["Enums"]["doc_status"] | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          company_id: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["doc_status"] | null
          generated_document_id: string
          id?: string
          note?: string | null
          to_status?: Database["public"]["Enums"]["doc_status"] | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          company_id?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["doc_status"] | null
          generated_document_id?: string
          id?: string
          note?: string | null
          to_status?: Database["public"]["Enums"]["doc_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "document_approvals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_approvals_generated_document_id_fkey"
            columns: ["generated_document_id"]
            isOneToOne: false
            referencedRelation: "generated_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_counters: {
        Row: {
          company_id: string
          doc_type: string
          last_number: number
        }
        Insert: {
          company_id: string
          doc_type: string
          last_number?: number
        }
        Update: {
          company_id?: string
          doc_type?: string
          last_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_counters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_delivery_logs: {
        Row: {
          channel: string
          company_id: string
          created_at: string
          created_by: string | null
          error_code: string | null
          generated_document_id: string
          id: string
          status: string
          target_masked: string | null
        }
        Insert: {
          channel: string
          company_id: string
          created_at?: string
          created_by?: string | null
          error_code?: string | null
          generated_document_id: string
          id?: string
          status?: string
          target_masked?: string | null
        }
        Update: {
          channel?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          error_code?: string | null
          generated_document_id?: string
          id?: string
          status?: string
          target_masked?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_delivery_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_delivery_logs_generated_document_id_fkey"
            columns: ["generated_document_id"]
            isOneToOne: false
            referencedRelation: "generated_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_files: {
        Row: {
          checksum: string | null
          company_document_id: string
          company_id: string
          content_type: string | null
          created_at: string
          deleted_at: string | null
          file_name: string
          id: string
          object_path: string
          size_bytes: number | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          checksum?: string | null
          company_document_id: string
          company_id: string
          content_type?: string | null
          created_at?: string
          deleted_at?: string | null
          file_name: string
          id?: string
          object_path: string
          size_bytes?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          checksum?: string | null
          company_document_id?: string
          company_id?: string
          content_type?: string | null
          created_at?: string
          deleted_at?: string | null
          file_name?: string
          id?: string
          object_path?: string
          size_bytes?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_files_company_document_id_fkey"
            columns: ["company_document_id"]
            isOneToOne: false
            referencedRelation: "company_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_files_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_sends: {
        Row: {
          approved_at: string
          approved_by: string
          channel: Database["public"]["Enums"]["notification_channel"]
          company_id: string
          conversation_id: string | null
          created_at: string
          customer_id: string | null
          error_text: string | null
          generated_document_id: string
          id: string
          recipient_label: string | null
          recipient_masked: string
          status: Database["public"]["Enums"]["wa_message_status"]
          updated_at: string
          wa_message_id: string | null
        }
        Insert: {
          approved_at?: string
          approved_by: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          company_id: string
          conversation_id?: string | null
          created_at?: string
          customer_id?: string | null
          error_text?: string | null
          generated_document_id: string
          id?: string
          recipient_label?: string | null
          recipient_masked: string
          status?: Database["public"]["Enums"]["wa_message_status"]
          updated_at?: string
          wa_message_id?: string | null
        }
        Update: {
          approved_at?: string
          approved_by?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          company_id?: string
          conversation_id?: string | null
          created_at?: string
          customer_id?: string | null
          error_text?: string | null
          generated_document_id?: string
          id?: string
          recipient_label?: string | null
          recipient_masked?: string
          status?: Database["public"]["Enums"]["wa_message_status"]
          updated_at?: string
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_sends_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_sends_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "wa_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_sends_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_sends_generated_document_id_fkey"
            columns: ["generated_document_id"]
            isOneToOne: false
            referencedRelation: "generated_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_sends_wa_message_id_fkey"
            columns: ["wa_message_id"]
            isOneToOne: false
            referencedRelation: "wa_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      document_sequences: {
        Row: {
          company_id: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["doc_template_kind"]
          last_number: number
          padding: number
          period_key: string
          prefix: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["doc_template_kind"]
          last_number?: number
          padding?: number
          period_key: string
          prefix: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["doc_template_kind"]
          last_number?: number
          padding?: number
          period_key?: string
          prefix?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_sequences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          current_version: number
          deleted_at: string | null
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["doc_template_kind"]
          name_ar: string
          name_en: string | null
          updated_at: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          current_version?: number
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          kind: Database["public"]["Enums"]["doc_template_kind"]
          name_ar: string
          name_en?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          current_version?: number
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["doc_template_kind"]
          name_ar?: string
          name_en?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      drawing_revisions: {
        Row: {
          change_note: string | null
          company_id: string
          created_at: string
          created_by: string | null
          customer_comment: string | null
          decided_at: string | null
          decided_by: string | null
          id: string
          object_path: string | null
          project_drawing_id: string
          rejection_reason: string | null
          revision: number
          status: Database["public"]["Enums"]["approval_status"]
          updated_at: string
        }
        Insert: {
          change_note?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_comment?: string | null
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          object_path?: string | null
          project_drawing_id: string
          rejection_reason?: string | null
          revision: number
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
        }
        Update: {
          change_note?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_comment?: string | null
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          object_path?: string | null
          project_drawing_id?: string
          rejection_reason?: string | null
          revision?: number
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drawing_revisions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_revisions_project_drawing_id_fkey"
            columns: ["project_drawing_id"]
            isOneToOne: false
            referencedRelation: "project_drawings"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_contracts: {
        Row: {
          annual_leave_days: number
          approved_at: string | null
          approved_by: string | null
          basic_salary: number
          clauses_override: string | null
          company_id: string
          contract_number: string
          contract_type: Database["public"]["Enums"]["hr_contract_type"]
          created_at: string
          created_by: string | null
          document_path: string | null
          employee_id: string
          end_date: string | null
          housing_allowance: number
          id: string
          other_allowance: number
          probation_days: number
          start_date: string
          status: Database["public"]["Enums"]["hr_contract_status"]
          transport_allowance: number
          updated_at: string
          working_days_per_week: number
          working_hours_per_day: number
        }
        Insert: {
          annual_leave_days?: number
          approved_at?: string | null
          approved_by?: string | null
          basic_salary?: number
          clauses_override?: string | null
          company_id: string
          contract_number: string
          contract_type?: Database["public"]["Enums"]["hr_contract_type"]
          created_at?: string
          created_by?: string | null
          document_path?: string | null
          employee_id: string
          end_date?: string | null
          housing_allowance?: number
          id?: string
          other_allowance?: number
          probation_days?: number
          start_date: string
          status?: Database["public"]["Enums"]["hr_contract_status"]
          transport_allowance?: number
          updated_at?: string
          working_days_per_week?: number
          working_hours_per_day?: number
        }
        Update: {
          annual_leave_days?: number
          approved_at?: string | null
          approved_by?: string | null
          basic_salary?: number
          clauses_override?: string | null
          company_id?: string
          contract_number?: string
          contract_type?: Database["public"]["Enums"]["hr_contract_type"]
          created_at?: string
          created_by?: string | null
          document_path?: string | null
          employee_id?: string
          end_date?: string | null
          housing_allowance?: number
          id?: string
          other_allowance?: number
          probation_days?: number
          start_date?: string
          status?: Database["public"]["Enums"]["hr_contract_status"]
          transport_allowance?: number
          updated_at?: string
          working_days_per_week?: number
          working_hours_per_day?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_contracts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_custodies: {
        Row: {
          category: string
          company_id: string
          created_at: string
          created_by: string | null
          custody_number: string
          document_path: string | null
          employee_id: string
          estimated_value: number
          id: string
          issued_date: string
          item_name: string
          notes: string | null
          quantity: number
          returned_date: string | null
          serial_number: string | null
          status: Database["public"]["Enums"]["custody_status"]
          updated_at: string
        }
        Insert: {
          category?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          custody_number: string
          document_path?: string | null
          employee_id: string
          estimated_value?: number
          id?: string
          issued_date: string
          item_name: string
          notes?: string | null
          quantity?: number
          returned_date?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["custody_status"]
          updated_at?: string
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          custody_number?: string
          document_path?: string | null
          employee_id?: string
          estimated_value?: number
          id?: string
          issued_date?: string
          item_name?: string
          notes?: string | null
          quantity?: number
          returned_date?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["custody_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_custodies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_custodies_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          company_id: string
          content_type: string | null
          created_at: string
          created_by: string | null
          document_type: Database["public"]["Enums"]["hr_document_type"]
          employee_id: string
          expiry_date: string | null
          file_name: string
          id: string
          issue_date: string | null
          object_path: string
          size_bytes: number | null
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          document_type?: Database["public"]["Enums"]["hr_document_type"]
          employee_id: string
          expiry_date?: string | null
          file_name: string
          id?: string
          issue_date?: string | null
          object_path: string
          size_bytes?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          document_type?: Database["public"]["Enums"]["hr_document_type"]
          employee_id?: string
          expiry_date?: string | null
          file_name?: string
          id?: string
          issue_date?: string | null
          object_path?: string
          size_bytes?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_sensitive: {
        Row: {
          bank_name: string | null
          company_id: string
          created_at: string
          employee_id: string
          iban: string | null
          national_id: string | null
          updated_at: string
        }
        Insert: {
          bank_name?: string | null
          company_id: string
          created_at?: string
          employee_id: string
          iban?: string | null
          national_id?: string | null
          updated_at?: string
        }
        Update: {
          bank_name?: string | null
          company_id?: string
          created_at?: string
          employee_id?: string
          iban?: string | null
          national_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_sensitive_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_sensitive_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_shift_assignments: {
        Row: {
          company_id: string
          created_at: string
          employee_id: string
          end_date: string | null
          id: string
          shift_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          employee_id: string
          end_date?: string | null
          id?: string
          shift_id: string
          start_date: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          employee_id?: string
          end_date?: string | null
          id?: string
          shift_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_shift_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_shift_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_shift_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          birth_date: string | null
          city: string | null
          company_id: string
          created_at: string
          created_by: string | null
          department_id: string | null
          email: string | null
          employee_number: string
          end_date: string | null
          full_name_ar: string
          full_name_en: string | null
          gender: string | null
          id: string
          id_expiry_date: string | null
          id_issue_date: string | null
          id_type: Database["public"]["Enums"]["hr_document_type"] | null
          job_title_id: string | null
          join_date: string
          manager_id: string | null
          nationality: string | null
          notes: string | null
          phone: string | null
          status: Database["public"]["Enums"]["employment_status"]
          updated_at: string
          user_id: string | null
          work_location_id: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          email?: string | null
          employee_number: string
          end_date?: string | null
          full_name_ar: string
          full_name_en?: string | null
          gender?: string | null
          id?: string
          id_expiry_date?: string | null
          id_issue_date?: string | null
          id_type?: Database["public"]["Enums"]["hr_document_type"] | null
          job_title_id?: string | null
          join_date: string
          manager_id?: string | null
          nationality?: string | null
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["employment_status"]
          updated_at?: string
          user_id?: string | null
          work_location_id?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          email?: string | null
          employee_number?: string
          end_date?: string | null
          full_name_ar?: string
          full_name_en?: string | null
          gender?: string | null
          id?: string
          id_expiry_date?: string | null
          id_issue_date?: string | null
          id_type?: Database["public"]["Enums"]["hr_document_type"] | null
          job_title_id?: string | null
          join_date?: string
          manager_id?: string | null
          nationality?: string | null
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["employment_status"]
          updated_at?: string
          user_id?: string | null
          work_location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_job_title_id_fkey"
            columns: ["job_title_id"]
            isOneToOne: false
            referencedRelation: "job_titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_work_location_id_fkey"
            columns: ["work_location_id"]
            isOneToOne: false
            referencedRelation: "work_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          code: string
          company_id: string
          created_at: string
          end_date: string
          id: string
          start_date: string
          status: Database["public"]["Enums"]["period_status"]
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          code: string
          company_id: string
          created_at?: string
          end_date: string
          id?: string
          start_date: string
          status?: Database["public"]["Enums"]["period_status"]
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          code?: string
          company_id?: string
          created_at?: string
          end_date?: string
          id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["period_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_documents: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          doc_number: string | null
          entity: string
          entity_id: string
          id: string
          issued_at: string | null
          issued_by: string | null
          kind: Database["public"]["Enums"]["doc_template_kind"]
          qr_payload: string | null
          revision: number
          revision_of: string | null
          snapshot: Json
          status: Database["public"]["Enums"]["doc_status"]
          superseded_by: string | null
          template_id: string | null
          template_version: number | null
          updated_at: string
          verify_token: string
          void_reason: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          doc_number?: string | null
          entity: string
          entity_id: string
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          kind: Database["public"]["Enums"]["doc_template_kind"]
          qr_payload?: string | null
          revision?: number
          revision_of?: string | null
          snapshot?: Json
          status?: Database["public"]["Enums"]["doc_status"]
          superseded_by?: string | null
          template_id?: string | null
          template_version?: number | null
          updated_at?: string
          verify_token?: string
          void_reason?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          doc_number?: string | null
          entity?: string
          entity_id?: string
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          kind?: Database["public"]["Enums"]["doc_template_kind"]
          qr_payload?: string | null
          revision?: number
          revision_of?: string | null
          snapshot?: Json
          status?: Database["public"]["Enums"]["doc_status"]
          superseded_by?: string | null
          template_id?: string | null
          template_version?: number | null
          updated_at?: string
          verify_token?: string
          void_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_revision_of_fkey"
            columns: ["revision_of"]
            isOneToOne: false
            referencedRelation: "generated_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "generated_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipt_items: {
        Row: {
          company_id: string
          created_at: string
          goods_receipt_id: string
          id: string
          item_id: string | null
          purchase_order_item_id: string
          qc_note: string | null
          quantity_accepted: number
          quantity_received: number
          quantity_rejected: number
          rejection_reason: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          goods_receipt_id: string
          id?: string
          item_id?: string | null
          purchase_order_item_id: string
          qc_note?: string | null
          quantity_accepted?: number
          quantity_received: number
          quantity_rejected?: number
          rejection_reason?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          goods_receipt_id?: string
          id?: string
          item_id?: string | null
          purchase_order_item_id?: string
          qc_note?: string | null
          quantity_accepted?: number
          quantity_received?: number
          quantity_rejected?: number
          rejection_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipt_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_items_goods_receipt_id_fkey"
            columns: ["goods_receipt_id"]
            isOneToOne: false
            referencedRelation: "goods_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_items_purchase_order_item_id_fkey"
            columns: ["purchase_order_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipts: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          delivery_note_ref: string | null
          grn_number: string
          id: string
          inspected_by: string | null
          location_id: string | null
          notes: string | null
          over_receipt_approved_by: string | null
          over_receipt_reason: string | null
          posted_at: string | null
          purchase_order_id: string
          receipt_date: string
          status: Database["public"]["Enums"]["grn_status"]
          supplier_id: string
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          delivery_note_ref?: string | null
          grn_number: string
          id?: string
          inspected_by?: string | null
          location_id?: string | null
          notes?: string | null
          over_receipt_approved_by?: string | null
          over_receipt_reason?: string | null
          posted_at?: string | null
          purchase_order_id: string
          receipt_date?: string
          status?: Database["public"]["Enums"]["grn_status"]
          supplier_id: string
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          delivery_note_ref?: string | null
          grn_number?: string
          id?: string
          inspected_by?: string | null
          location_id?: string | null
          notes?: string | null
          over_receipt_approved_by?: string | null
          over_receipt_reason?: string | null
          posted_at?: string | null
          purchase_order_id?: string
          receipt_date?: string
          status?: Database["public"]["Enums"]["grn_status"]
          supplier_id?: string
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      gosi_profiles: {
        Row: {
          company_id: string
          contribution_base: number | null
          created_at: string
          employee_id: string
          gosi_number: string | null
          is_registered: boolean
          is_saudi: boolean
          updated_at: string
        }
        Insert: {
          company_id: string
          contribution_base?: number | null
          created_at?: string
          employee_id: string
          gosi_number?: string | null
          is_registered?: boolean
          is_saudi?: boolean
          updated_at?: string
        }
        Update: {
          company_id?: string
          contribution_base?: number | null
          created_at?: string
          employee_id?: string
          gosi_number?: string | null
          is_registered?: boolean
          is_saudi?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gosi_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gosi_profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      gosi_settings: {
        Row: {
          ceiling_amount: number
          company_id: string
          created_at: string
          effective_from: string
          expat_employee_rate: number
          expat_employer_rate: number
          id: string
          notes: string | null
          saudi_employee_rate: number
          saudi_employer_rate: number
          updated_at: string
        }
        Insert: {
          ceiling_amount?: number
          company_id: string
          created_at?: string
          effective_from: string
          expat_employee_rate?: number
          expat_employer_rate?: number
          id?: string
          notes?: string | null
          saudi_employee_rate?: number
          saudi_employer_rate?: number
          updated_at?: string
        }
        Update: {
          ceiling_amount?: number
          company_id?: string
          created_at?: string
          effective_from?: string
          expat_employee_rate?: number
          expat_employer_rate?: number
          id?: string
          notes?: string | null
          saudi_employee_rate?: number
          saudi_employer_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gosi_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      handover_records: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          customer_approved: boolean
          customer_approved_at: string | null
          customer_representative: string | null
          handover_date: string
          handover_number: string
          handover_type: Database["public"]["Enums"]["handover_type"]
          id: string
          notes: string | null
          project_id: string
          representative_id_number: string | null
          signature_path: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_approved?: boolean
          customer_approved_at?: string | null
          customer_representative?: string | null
          handover_date?: string
          handover_number: string
          handover_type?: Database["public"]["Enums"]["handover_type"]
          id?: string
          notes?: string | null
          project_id: string
          representative_id_number?: string | null
          signature_path?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_approved?: boolean
          customer_approved_at?: string | null
          customer_representative?: string | null
          handover_date?: string
          handover_number?: string
          handover_type?: Database["public"]["Enums"]["handover_type"]
          id?: string
          notes?: string | null
          project_id?: string
          representative_id_number?: string | null
          signature_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "handover_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handover_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_settings: {
        Row: {
          advances_account_id: string | null
          allowances_expense_account_id: string | null
          company_id: string
          contract_clauses_ar: string | null
          created_at: string
          default_probation_days: number
          gosi_expense_account_id: string | null
          gosi_payable_account_id: string | null
          overtime_rate_multiplier: number
          payroll_payable_account_id: string | null
          salary_expense_account_id: string | null
          updated_at: string
          working_days_per_month: number
          wps_bank_code: string | null
          wps_establishment_id: string | null
        }
        Insert: {
          advances_account_id?: string | null
          allowances_expense_account_id?: string | null
          company_id: string
          contract_clauses_ar?: string | null
          created_at?: string
          default_probation_days?: number
          gosi_expense_account_id?: string | null
          gosi_payable_account_id?: string | null
          overtime_rate_multiplier?: number
          payroll_payable_account_id?: string | null
          salary_expense_account_id?: string | null
          updated_at?: string
          working_days_per_month?: number
          wps_bank_code?: string | null
          wps_establishment_id?: string | null
        }
        Update: {
          advances_account_id?: string | null
          allowances_expense_account_id?: string | null
          company_id?: string
          contract_clauses_ar?: string | null
          created_at?: string
          default_probation_days?: number
          gosi_expense_account_id?: string | null
          gosi_payable_account_id?: string | null
          overtime_rate_multiplier?: number
          payroll_payable_account_id?: string | null
          salary_expense_account_id?: string | null
          updated_at?: string
          working_days_per_month?: number
          wps_bank_code?: string | null
          wps_establishment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_settings_advances_account_id_fkey"
            columns: ["advances_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_settings_allowances_expense_account_id_fkey"
            columns: ["allowances_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_settings_gosi_expense_account_id_fkey"
            columns: ["gosi_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_settings_gosi_payable_account_id_fkey"
            columns: ["gosi_payable_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_settings_payroll_payable_account_id_fkey"
            columns: ["payroll_payable_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_settings_salary_expense_account_id_fkey"
            columns: ["salary_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_orders: {
        Row: {
          company_id: string
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          id: string
          io_number: string
          notes: string | null
          project_id: string
          scheduled_date: string | null
          scheduled_time: string | null
          site_address: string | null
          status: Database["public"]["Enums"]["install_status"]
          team_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          io_number: string
          notes?: string | null
          project_id: string
          scheduled_date?: string | null
          scheduled_time?: string | null
          site_address?: string | null
          status?: Database["public"]["Enums"]["install_status"]
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          io_number?: string
          notes?: string | null
          project_id?: string
          scheduled_date?: string | null
          scheduled_time?: string | null
          site_address?: string | null
          status?: Database["public"]["Enums"]["install_status"]
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installation_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_orders_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "installation_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_team_members: {
        Row: {
          company_id: string
          created_at: string
          employee_id: string
          id: string
          team_id: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          employee_id: string
          id?: string
          team_id: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          team_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installation_team_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_team_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "installation_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_teams: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          leader_employee_id: string | null
          name_ar: string
          tools_note: string | null
          updated_at: string
          vehicle_plate: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          leader_employee_id?: string | null
          name_ar: string
          tools_note?: string | null
          updated_at?: string
          vehicle_plate?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          leader_employee_id?: string | null
          name_ar?: string
          tools_note?: string | null
          updated_at?: string
          vehicle_plate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installation_teams_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_teams_leader_employee_id_fkey"
            columns: ["leader_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_visits: {
        Row: {
          arrived_at: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          installation_order_id: string
          pause_reason: string | null
          paused_at: string | null
          photo_paths: string[]
          site_notes: string | null
          started_at: string | null
          updated_at: string
          visit_date: string
        }
        Insert: {
          arrived_at?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          installation_order_id: string
          pause_reason?: string | null
          paused_at?: string | null
          photo_paths?: string[]
          site_notes?: string | null
          started_at?: string | null
          updated_at?: string
          visit_date?: string
        }
        Update: {
          arrived_at?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          installation_order_id?: string
          pause_reason?: string | null
          paused_at?: string | null
          photo_paths?: string[]
          site_notes?: string | null
          started_at?: string | null
          updated_at?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "installation_visits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_visits_installation_order_id_fkey"
            columns: ["installation_order_id"]
            isOneToOne: false
            referencedRelation: "installation_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          allowed_origins: string[]
          company_id: string
          config: Json
          created_at: string
          created_by: string | null
          display_name: string | null
          health: Database["public"]["Enums"]["integration_health"]
          id: string
          kind: Database["public"]["Enums"]["integration_kind"]
          last_error: string | null
          last_sync_at: string | null
          provider: string
          rate_limit_per_min: number
          scopes: string[]
          secret_refs: string[]
          status: Database["public"]["Enums"]["integration_status"]
          updated_at: string
          webhook_verified_at: string | null
        }
        Insert: {
          allowed_origins?: string[]
          company_id: string
          config?: Json
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          health?: Database["public"]["Enums"]["integration_health"]
          id?: string
          kind: Database["public"]["Enums"]["integration_kind"]
          last_error?: string | null
          last_sync_at?: string | null
          provider?: string
          rate_limit_per_min?: number
          scopes?: string[]
          secret_refs?: string[]
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string
          webhook_verified_at?: string | null
        }
        Update: {
          allowed_origins?: string[]
          company_id?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          health?: Database["public"]["Enums"]["integration_health"]
          id?: string
          kind?: Database["public"]["Enums"]["integration_kind"]
          last_error?: string | null
          last_sync_at?: string | null
          provider?: string
          rate_limit_per_min?: number
          scopes?: string[]
          secret_refs?: string[]
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string
          webhook_verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          line_total: number
          quantity: number
          unit_price: number
          vat_rate: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          line_total?: number
          quantity?: number
          unit_price?: number
          vat_rate?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          line_total?: number
          quantity?: number
          unit_price?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          exemption_reason: string | null
          id: string
          invoice_number: string
          invoice_type: string
          issue_date: string
          issued_at: string | null
          notes: string | null
          qr_tlv: string | null
          sales_order_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_treatment: Database["public"]["Enums"]["tax_treatment"]
          total: number
          updated_at: string
          vat_amount: number
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          exemption_reason?: string | null
          id?: string
          invoice_number: string
          invoice_type?: string
          issue_date?: string
          issued_at?: string | null
          notes?: string | null
          qr_tlv?: string | null
          sales_order_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_treatment?: Database["public"]["Enums"]["tax_treatment"]
          total?: number
          updated_at?: string
          vat_amount?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          exemption_reason?: string | null
          id?: string
          invoice_number?: string
          invoice_type?: string
          issue_date?: string
          issued_at?: string | null
          notes?: string | null
          qr_tlv?: string | null
          sales_order_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_treatment?: Database["public"]["Enums"]["tax_treatment"]
          total?: number
          updated_at?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          category: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          min_qty: number
          name_ar: string
          name_en: string | null
          sku: string
          standard_cost: number
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          min_qty?: number
          name_ar: string
          name_en?: string | null
          sku: string
          standard_cost?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          min_qty?: number
          name_ar?: string
          name_en?: string | null
          sku?: string
          standard_cost?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      job_titles: {
        Row: {
          code: string
          company_id: string
          created_at: string
          grade: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string | null
          updated_at: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          grade?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          grade?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_titles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          created_by: string | null
          entry_date: string
          entry_number: string
          id: string
          memo: string | null
          period_id: string | null
          posted_at: string | null
          posted_by: string | null
          reversal_of: string | null
          reversed_by: string | null
          source_id: string | null
          source_type: string | null
          status: Database["public"]["Enums"]["je_status"]
          total_credit: number
          total_debit: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          entry_date?: string
          entry_number: string
          id?: string
          memo?: string | null
          period_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reversal_of?: string | null
          reversed_by?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["je_status"]
          total_credit?: number
          total_debit?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          entry_date?: string
          entry_number?: string
          id?: string
          memo?: string | null
          period_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reversal_of?: string | null
          reversed_by?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["je_status"]
          total_credit?: number
          total_debit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "fiscal_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_reversal_of_fkey"
            columns: ["reversal_of"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          cost_center_id: string | null
          created_at: string
          credit: number
          customer_id: string | null
          debit: number
          description: string | null
          id: string
          journal_entry_id: string
          line_no: number
          supplier_id: string | null
        }
        Insert: {
          account_id: string
          cost_center_id?: string | null
          created_at?: string
          credit?: number
          customer_id?: string | null
          debit?: number
          description?: string | null
          id?: string
          journal_entry_id: string
          line_no?: number
          supplier_id?: string | null
        }
        Update: {
          account_id?: string
          cost_center_id?: string | null
          created_at?: string
          credit?: number
          customer_id?: string | null
          debit?: number
          description?: string | null
          id?: string
          journal_entry_id?: string
          line_no?: number
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_logs: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          hourly_rate: number | null
          hours: number
          id: string
          manufacturing_order_id: string
          note: string | null
          stage_id: string | null
          work_date: string
          worker_id: string | null
          worker_name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          hourly_rate?: number | null
          hours: number
          id?: string
          manufacturing_order_id: string
          note?: string | null
          stage_id?: string | null
          work_date?: string
          worker_id?: string | null
          worker_name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          hourly_rate?: number | null
          hours?: number
          id?: string
          manufacturing_order_id?: string
          note?: string | null
          stage_id?: string | null
          work_date?: string
          worker_id?: string | null
          worker_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "labor_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_logs_manufacturing_order_id_fkey"
            columns: ["manufacturing_order_id"]
            isOneToOne: false
            referencedRelation: "manufacturing_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_logs_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "manufacturing_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          carried_days: number
          company_id: string
          created_at: string
          employee_id: string
          entitled_days: number
          id: string
          leave_type_id: string
          updated_at: string
          used_days: number
          year: number
        }
        Insert: {
          carried_days?: number
          company_id: string
          created_at?: string
          employee_id: string
          entitled_days?: number
          id?: string
          leave_type_id: string
          updated_at?: string
          used_days?: number
          year: number
        }
        Update: {
          carried_days?: number
          company_id?: string
          created_at?: string
          employee_id?: string
          entitled_days?: number
          id?: string
          leave_type_id?: string
          updated_at?: string
          used_days?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          created_by: string | null
          days: number
          document_path: string | null
          employee_id: string
          end_date: string
          id: string
          leave_type_id: string
          reason: string | null
          rejection_reason: string | null
          request_number: string
          start_date: string
          status: Database["public"]["Enums"]["leave_request_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          days: number
          document_path?: string | null
          employee_id: string
          end_date: string
          id?: string
          leave_type_id: string
          reason?: string | null
          rejection_reason?: string | null
          request_number: string
          start_date: string
          status?: Database["public"]["Enums"]["leave_request_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          days?: number
          document_path?: string | null
          employee_id?: string
          end_date?: string
          id?: string
          leave_type_id?: string
          reason?: string | null
          rejection_reason?: string | null
          request_number?: string
          start_date?: string
          status?: Database["public"]["Enums"]["leave_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          allow_carry_over: boolean
          code: string
          company_id: string
          created_at: string
          default_days_per_year: number
          id: string
          is_active: boolean
          is_paid: boolean
          max_carry_over_days: number
          name_ar: string
          name_en: string | null
          requires_attachment: boolean
          updated_at: string
        }
        Insert: {
          allow_carry_over?: boolean
          code: string
          company_id: string
          created_at?: string
          default_days_per_year?: number
          id?: string
          is_active?: boolean
          is_paid?: boolean
          max_carry_over_days?: number
          name_ar: string
          name_en?: string | null
          requires_attachment?: boolean
          updated_at?: string
        }
        Update: {
          allow_carry_over?: boolean
          code?: string
          company_id?: string
          created_at?: string
          default_days_per_year?: number
          id?: string
          is_active?: boolean
          is_paid?: boolean
          max_carry_over_days?: number
          name_ar?: string
          name_en?: string | null
          requires_attachment?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturing_orders: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          mo_number: string
          notes: string | null
          planned_end: string | null
          planned_start: string | null
          quantity: number
          sales_order_id: string | null
          sales_order_item_id: string | null
          status: Database["public"]["Enums"]["mfg_status"]
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          mo_number: string
          notes?: string | null
          planned_end?: string | null
          planned_start?: string | null
          quantity?: number
          sales_order_id?: string | null
          sales_order_item_id?: string | null
          status?: Database["public"]["Enums"]["mfg_status"]
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          mo_number?: string
          notes?: string | null
          planned_end?: string | null
          planned_start?: string | null
          quantity?: number
          sales_order_id?: string | null
          sales_order_item_id?: string | null
          status?: Database["public"]["Enums"]["mfg_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manufacturing_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manufacturing_orders_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manufacturing_orders_sales_order_item_id_fkey"
            columns: ["sales_order_item_id"]
            isOneToOne: false
            referencedRelation: "sales_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturing_stages: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          assignee_id: string | null
          attachments: Json
          code: string
          company_id: string
          created_at: string
          id: string
          manufacturing_order_id: string
          name_ar: string
          name_en: string | null
          notes: string | null
          planned_end: string | null
          planned_start: string | null
          progress_percent: number
          sequence: number
          status: Database["public"]["Enums"]["stage_status"]
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          assignee_id?: string | null
          attachments?: Json
          code: string
          company_id: string
          created_at?: string
          id?: string
          manufacturing_order_id: string
          name_ar: string
          name_en?: string | null
          notes?: string | null
          planned_end?: string | null
          planned_start?: string | null
          progress_percent?: number
          sequence: number
          status?: Database["public"]["Enums"]["stage_status"]
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          assignee_id?: string | null
          attachments?: Json
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          manufacturing_order_id?: string
          name_ar?: string
          name_en?: string | null
          notes?: string | null
          planned_end?: string | null
          planned_start?: string | null
          progress_percent?: number
          sequence?: number
          status?: Database["public"]["Enums"]["stage_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manufacturing_stages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manufacturing_stages_manufacturing_order_id_fkey"
            columns: ["manufacturing_order_id"]
            isOneToOne: false
            referencedRelation: "manufacturing_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      material_approvals: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          customer_comment: string | null
          decided_at: string | null
          decided_by: string | null
          id: string
          item_id: string | null
          material_name: string
          object_path: string | null
          project_id: string
          rejection_reason: string | null
          specification: string | null
          status: Database["public"]["Enums"]["approval_status"]
          supplier_name: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_comment?: string | null
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          item_id?: string | null
          material_name: string
          object_path?: string | null
          project_id: string
          rejection_reason?: string | null
          specification?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          supplier_name?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_comment?: string | null
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          item_id?: string | null
          material_name?: string
          object_path?: string | null
          project_id?: string
          rejection_reason?: string | null
          specification?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          supplier_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_approvals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_approvals_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_approvals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          company_id: string
          created_at: string
          email_enabled: boolean
          id: string
          in_app_enabled: boolean
          muted_topics: string[]
          quiet_hours_end: number | null
          quiet_hours_start: number | null
          timezone: string
          updated_at: string
          user_id: string
          whatsapp_enabled: boolean
        }
        Insert: {
          company_id: string
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          muted_topics?: string[]
          quiet_hours_end?: number | null
          quiet_hours_start?: number | null
          timezone?: string
          updated_at?: string
          user_id: string
          whatsapp_enabled?: boolean
        }
        Update: {
          company_id?: string
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          muted_topics?: string[]
          quiet_hours_end?: number | null
          quiet_hours_start?: number | null
          timezone?: string
          updated_at?: string
          user_id?: string
          whatsapp_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body_ar: string
          body_en: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          key: string
          title_ar: string
          title_en: string | null
          updated_at: string
          version: number
        }
        Insert: {
          body_ar: string
          body_en?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          title_ar: string
          title_en?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          body_ar?: string
          body_en?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          title_ar?: string
          title_en?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          company_id: string
          created_at: string
          dedup_key: string
          entity_id: string | null
          entity_table: string | null
          error_text: string | null
          id: string
          link_path: string | null
          priority: Database["public"]["Enums"]["thread_priority"]
          read_at: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          title: string
          topic: string
          user_id: string
        }
        Insert: {
          body?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          company_id: string
          created_at?: string
          dedup_key: string
          entity_id?: string | null
          entity_table?: string | null
          error_text?: string | null
          id?: string
          link_path?: string | null
          priority?: Database["public"]["Enums"]["thread_priority"]
          read_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title: string
          topic: string
          user_id: string
        }
        Update: {
          body?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          company_id?: string
          created_at?: string
          dedup_key?: string
          entity_id?: string | null
          entity_table?: string | null
          error_text?: string | null
          id?: string
          link_path?: string | null
          priority?: Database["public"]["Enums"]["thread_priority"]
          read_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title?: string
          topic?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      outbox_events: {
        Row: {
          attempts: number
          company_id: string
          created_at: string
          dedup_key: string
          id: string
          last_error: string | null
          locked_at: string | null
          max_attempts: number
          next_attempt_at: string
          payload: Json
          processed_at: string | null
          status: Database["public"]["Enums"]["outbox_status"]
          topic: string
        }
        Insert: {
          attempts?: number
          company_id: string
          created_at?: string
          dedup_key: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          max_attempts?: number
          next_attempt_at?: string
          payload?: Json
          processed_at?: string | null
          status?: Database["public"]["Enums"]["outbox_status"]
          topic: string
        }
        Update: {
          attempts?: number
          company_id?: string
          created_at?: string
          dedup_key?: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          max_attempts?: number
          next_attempt_at?: string
          payload?: Json
          processed_at?: string | null
          status?: Database["public"]["Enums"]["outbox_status"]
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "outbox_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_requests: {
        Row: {
          accounting_posted: boolean
          amount: number
          approved_at: string | null
          approved_by: string | null
          bank_reference: string | null
          company_id: string
          created_at: string
          due_date: string | null
          executed_at: string | null
          id: string
          method: string
          pay_number: string
          rejection_reason: string | null
          requested_by: string | null
          status: Database["public"]["Enums"]["payreq_status"]
          supplier_id: string
          supplier_invoice_id: string
          updated_at: string
        }
        Insert: {
          accounting_posted?: boolean
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          bank_reference?: string | null
          company_id: string
          created_at?: string
          due_date?: string | null
          executed_at?: string | null
          id?: string
          method?: string
          pay_number: string
          rejection_reason?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["payreq_status"]
          supplier_id: string
          supplier_invoice_id: string
          updated_at?: string
        }
        Update: {
          accounting_posted?: boolean
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          bank_reference?: string | null
          company_id?: string
          created_at?: string
          due_date?: string | null
          executed_at?: string | null
          id?: string
          method?: string
          pay_number?: string
          rejection_reason?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["payreq_status"]
          supplier_id?: string
          supplier_invoice_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_supplier_invoice_id_fkey"
            columns: ["supplier_invoice_id"]
            isOneToOne: false
            referencedRelation: "supplier_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_schedules: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          label_ar: string
          label_en: string
          percentage: number
          sales_order_id: string
          sequence: number
          status: string
          trigger_stage: string
          updated_at: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          label_ar: string
          label_en: string
          percentage: number
          sales_order_id: string
          sequence: number
          status?: string
          trigger_stage: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          label_ar?: string
          label_en?: string
          percentage?: number
          sales_order_id?: string
          sequence?: number
          status?: string
          trigger_stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_schedules_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          method: string
          note: string | null
          paid_at: string
          reference: string | null
          sales_order_id: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string
          note?: string | null
          paid_at?: string
          reference?: string | null
          sales_order_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string
          note?: string | null
          paid_at?: string
          reference?: string | null
          sales_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_adjustments: {
        Row: {
          amount: number
          applied_run_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          kind: string
          label: string
          notes: string | null
          period_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          applied_run_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          kind?: string
          label: string
          notes?: string | null
          period_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          applied_run_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          kind?: string
          label?: string
          notes?: string | null
          period_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_adjustments_applied_run_id_fkey"
            columns: ["applied_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_adjustments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_adjustments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_adjustments_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_items: {
        Row: {
          absence_deduction: number
          advances: number
          basic_salary: number
          company_id: string
          contract_id: string | null
          created_at: string
          employee_id: string
          gosi_employee: number
          gosi_employer: number
          gross_pay: number
          housing_allowance: number
          iban_snapshot: string | null
          id: string
          late_deduction: number
          net_pay: number
          other_allowance: number
          other_deductions: number
          overtime_amount: number
          overtime_minutes: number
          payroll_run_id: string
          total_deductions: number
          transport_allowance: number
          updated_at: string
        }
        Insert: {
          absence_deduction?: number
          advances?: number
          basic_salary?: number
          company_id: string
          contract_id?: string | null
          created_at?: string
          employee_id: string
          gosi_employee?: number
          gosi_employer?: number
          gross_pay?: number
          housing_allowance?: number
          iban_snapshot?: string | null
          id?: string
          late_deduction?: number
          net_pay?: number
          other_allowance?: number
          other_deductions?: number
          overtime_amount?: number
          overtime_minutes?: number
          payroll_run_id: string
          total_deductions?: number
          transport_allowance?: number
          updated_at?: string
        }
        Update: {
          absence_deduction?: number
          advances?: number
          basic_salary?: number
          company_id?: string
          contract_id?: string | null
          created_at?: string
          employee_id?: string
          gosi_employee?: number
          gosi_employer?: number
          gross_pay?: number
          housing_allowance?: number
          iban_snapshot?: string | null
          id?: string
          late_deduction?: number
          net_pay?: number
          other_allowance?: number
          other_deductions?: number
          overtime_amount?: number
          overtime_minutes?: number
          payroll_run_id?: string
          total_deductions?: number
          transport_allowance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "employee_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_periods: {
        Row: {
          company_id: string
          created_at: string
          end_date: string
          id: string
          is_closed: boolean
          month: number
          pay_date: string | null
          start_date: string
          updated_at: string
          year: number
        }
        Insert: {
          company_id: string
          created_at?: string
          end_date: string
          id?: string
          is_closed?: boolean
          month: number
          pay_date?: string | null
          start_date: string
          updated_at?: string
          year: number
        }
        Update: {
          company_id?: string
          created_at?: string
          end_date?: string
          id?: string
          is_closed?: boolean
          month?: number
          pay_date?: string | null
          start_date?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          created_by: string | null
          employee_count: number
          gosi_snapshot: Json | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          period_id: string
          reversal_of_run_id: string | null
          run_number: string
          status: Database["public"]["Enums"]["payroll_run_status"]
          total_deductions: number
          total_gosi_employee: number
          total_gosi_employer: number
          total_gross: number
          total_net: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          employee_count?: number
          gosi_snapshot?: Json | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          period_id: string
          reversal_of_run_id?: string | null
          run_number: string
          status?: Database["public"]["Enums"]["payroll_run_status"]
          total_deductions?: number
          total_gosi_employee?: number
          total_gosi_employer?: number
          total_gross?: number
          total_net?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          employee_count?: number
          gosi_snapshot?: Json | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          period_id?: string
          reversal_of_run_id?: string | null
          run_number?: string
          status?: Database["public"]["Enums"]["payroll_run_status"]
          total_deductions?: number
          total_gosi_employee?: number
          total_gosi_employer?: number
          total_gross?: number
          total_net?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_reversal_of_run_id_fkey"
            columns: ["reversal_of_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      production_orders: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          notes: string | null
          po_number: string
          sales_order_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["production_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          po_number: string
          sales_order_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["production_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          po_number?: string
          sales_order_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["production_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_orders_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      production_stages: {
        Row: {
          created_at: string
          id: string
          inspected_at: string | null
          inspected_by: string | null
          name_ar: string
          name_en: string | null
          production_order_id: string
          qc_notes: string | null
          sequence: number
          status: Database["public"]["Enums"]["stage_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          name_ar: string
          name_en?: string | null
          production_order_id: string
          qc_notes?: string | null
          sequence?: number
          status?: Database["public"]["Enums"]["stage_status"]
        }
        Update: {
          created_at?: string
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          name_ar?: string
          name_en?: string | null
          production_order_id?: string
          qc_notes?: string | null
          sequence?: number
          status?: Database["public"]["Enums"]["stage_status"]
        }
        Relationships: [
          {
            foreignKeyName: "production_stages_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          language: string
          phone: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id: string
          is_active?: boolean
          language?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          language?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_drawings: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          current_revision: number
          discipline: string | null
          drawing_number: string
          id: string
          project_id: string
          status: Database["public"]["Enums"]["approval_status"]
          title_ar: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          current_revision?: number
          discipline?: string | null
          drawing_number: string
          id?: string
          project_id: string
          status?: Database["public"]["Enums"]["approval_status"]
          title_ar: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          current_revision?: number
          discipline?: string | null
          drawing_number?: string
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["approval_status"]
          title_ar?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_drawings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_drawings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_manufacturing_orders: {
        Row: {
          company_id: string
          created_at: string
          id: string
          manufacturing_order_id: string
          project_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          manufacturing_order_id: string
          project_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          manufacturing_order_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_manufacturing_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_manufacturing_orders_manufacturing_order_id_fkey"
            columns: ["manufacturing_order_id"]
            isOneToOne: false
            referencedRelation: "manufacturing_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_manufacturing_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          can_edit: boolean
          company_id: string
          created_at: string
          id: string
          member_role: string
          project_id: string
          user_id: string
        }
        Insert: {
          can_edit?: boolean
          company_id: string
          created_at?: string
          id?: string
          member_role?: string
          project_id: string
          user_id: string
        }
        Update: {
          can_edit?: boolean
          company_id?: string
          created_at?: string
          id?: string
          member_role?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          actual_date: string | null
          company_id: string
          created_at: string
          id: string
          notes: string | null
          planned_date: string | null
          progress_percent: number
          project_id: string
          sort_order: number
          title_ar: string
          updated_at: string
        }
        Insert: {
          actual_date?: string | null
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          planned_date?: string | null
          progress_percent?: number
          project_id: string
          sort_order?: number
          title_ar: string
          updated_at?: string
        }
        Update: {
          actual_date?: string | null
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          planned_date?: string | null
          progress_percent?: number
          project_id?: string
          sort_order?: number
          title_ar?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_settings: {
        Row: {
          claim_response_hours: number
          company_id: string
          created_at: string
          default_warranty_months: number
          id: string
          notify_critical_snags: boolean
          notify_overdue_tasks: boolean
          notify_pending_approvals: boolean
          notify_upcoming_deliveries: boolean
          notify_upcoming_installations: boolean
          notify_warranty_expiry: boolean
          upcoming_window_days: number
          updated_at: string
          warranty_expiry_notice_days: number
          warranty_scope_ar: string
          warranty_terms_ar: string | null
        }
        Insert: {
          claim_response_hours?: number
          company_id: string
          created_at?: string
          default_warranty_months?: number
          id?: string
          notify_critical_snags?: boolean
          notify_overdue_tasks?: boolean
          notify_pending_approvals?: boolean
          notify_upcoming_deliveries?: boolean
          notify_upcoming_installations?: boolean
          notify_warranty_expiry?: boolean
          upcoming_window_days?: number
          updated_at?: string
          warranty_expiry_notice_days?: number
          warranty_scope_ar?: string
          warranty_terms_ar?: string | null
        }
        Update: {
          claim_response_hours?: number
          company_id?: string
          created_at?: string
          default_warranty_months?: number
          id?: string
          notify_critical_snags?: boolean
          notify_overdue_tasks?: boolean
          notify_pending_approvals?: boolean
          notify_upcoming_deliveries?: boolean
          notify_upcoming_installations?: boolean
          notify_warranty_expiry?: boolean
          upcoming_window_days?: number
          updated_at?: string
          warranty_expiry_notice_days?: number
          warranty_scope_ar?: string
          warranty_terms_ar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          actual_end: string | null
          actual_hours: number
          actual_start: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_critical: boolean
          milestone_id: string | null
          planned_end: string | null
          planned_hours: number
          planned_start: string | null
          priority: Database["public"]["Enums"]["project_priority"]
          progress_percent: number
          project_id: string
          status: Database["public"]["Enums"]["ptask_status"]
          title_ar: string
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          actual_hours?: number
          actual_start?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_critical?: boolean
          milestone_id?: string | null
          planned_end?: string | null
          planned_hours?: number
          planned_start?: string | null
          priority?: Database["public"]["Enums"]["project_priority"]
          progress_percent?: number
          project_id: string
          status?: Database["public"]["Enums"]["ptask_status"]
          title_ar: string
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          actual_hours?: number
          actual_start?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_critical?: boolean
          milestone_id?: string | null
          planned_end?: string | null
          planned_hours?: number
          planned_start?: string | null
          priority?: Database["public"]["Enums"]["project_priority"]
          progress_percent?: number
          project_id?: string
          status?: Database["public"]["Enums"]["ptask_status"]
          title_ar?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "project_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_end_date: string | null
          budget_amount: number
          city: string | null
          closure_exception_by: string | null
          closure_exception_note: string | null
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          description: string | null
          id: string
          manager_id: string | null
          name_ar: string
          name_en: string | null
          priority: Database["public"]["Enums"]["project_priority"]
          project_number: string
          quotation_id: string | null
          sales_order_id: string | null
          site_address: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          target_end_date: string | null
          updated_at: string
        }
        Insert: {
          actual_end_date?: string | null
          budget_amount?: number
          city?: string | null
          closure_exception_by?: string | null
          closure_exception_note?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name_ar: string
          name_en?: string | null
          priority?: Database["public"]["Enums"]["project_priority"]
          project_number: string
          quotation_id?: string | null
          sales_order_id?: string | null
          site_address?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          target_end_date?: string | null
          updated_at?: string
        }
        Update: {
          actual_end_date?: string | null
          budget_amount?: number
          city?: string | null
          closure_exception_by?: string | null
          closure_exception_note?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name_ar?: string
          name_en?: string | null
          priority?: Database["public"]["Enums"]["project_priority"]
          project_number?: string
          quotation_id?: string | null
          sales_order_id?: string | null
          site_address?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          target_end_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          company_id: string
          created_at: string
          description: string
          discount_amount: number
          discount_percent: number
          id: string
          item_id: string | null
          line_total: number
          purchase_order_id: string
          purchase_request_item_id: string | null
          quantity: number
          received_quantity: number
          taxable_amount: number
          unit: string
          unit_price: number
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          company_id: string
          created_at?: string
          description: string
          discount_amount?: number
          discount_percent?: number
          id?: string
          item_id?: string | null
          line_total?: number
          purchase_order_id: string
          purchase_request_item_id?: string | null
          quantity: number
          received_quantity?: number
          taxable_amount?: number
          unit?: string
          unit_price: number
          vat_amount?: number
          vat_rate?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string
          discount_amount?: number
          discount_percent?: number
          id?: string
          item_id?: string | null
          line_total?: number
          purchase_order_id?: string
          purchase_request_item_id?: string | null
          quantity?: number
          received_quantity?: number
          taxable_amount?: number
          unit?: string
          unit_price?: number
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_request_item_id_fkey"
            columns: ["purchase_request_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_request_items"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cancelled_reason: string | null
          company_id: string
          created_at: string
          created_by: string | null
          discount_total: number
          expected_date: string | null
          id: string
          notes: string | null
          order_date: string
          po_number: string
          purchase_request_id: string | null
          rfq_id: string | null
          status: Database["public"]["Enums"]["po_status"]
          subtotal: number
          supplier_id: string
          tax_exemption_reason: string | null
          tax_treatment: Database["public"]["Enums"]["tax_treatment"]
          total: number
          updated_at: string
          vat_amount: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cancelled_reason?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          discount_total?: number
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number: string
          purchase_request_id?: string | null
          rfq_id?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          subtotal?: number
          supplier_id: string
          tax_exemption_reason?: string | null
          tax_treatment?: Database["public"]["Enums"]["tax_treatment"]
          total?: number
          updated_at?: string
          vat_amount?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cancelled_reason?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          discount_total?: number
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number?: string
          purchase_request_id?: string | null
          rfq_id?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          subtotal?: number
          supplier_id?: string
          tax_exemption_reason?: string | null
          tax_treatment?: Database["public"]["Enums"]["tax_treatment"]
          total?: number
          updated_at?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_purchase_request_id_fkey"
            columns: ["purchase_request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
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
      purchase_request_items: {
        Row: {
          company_id: string
          created_at: string
          description: string
          estimated_price: number
          id: string
          item_id: string | null
          needed_date: string | null
          purchase_request_id: string
          quantity: number
          specification: string | null
          unit: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description: string
          estimated_price?: number
          id?: string
          item_id?: string | null
          needed_date?: string | null
          purchase_request_id: string
          quantity: number
          specification?: string | null
          unit?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string
          estimated_price?: number
          id?: string
          item_id?: string | null
          needed_date?: string | null
          purchase_request_id?: string
          quantity?: number
          specification?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_request_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_request_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_request_items_purchase_request_id_fkey"
            columns: ["purchase_request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          estimated_total: number
          id: string
          justification: string | null
          manufacturing_order_id: string | null
          needed_date: string | null
          pr_number: string
          rejection_reason: string | null
          requested_by: string | null
          status: Database["public"]["Enums"]["pr_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          estimated_total?: number
          id?: string
          justification?: string | null
          manufacturing_order_id?: string | null
          needed_date?: string | null
          pr_number: string
          rejection_reason?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["pr_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          estimated_total?: number
          id?: string
          justification?: string | null
          manufacturing_order_id?: string | null
          needed_date?: string | null
          pr_number?: string
          rejection_reason?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["pr_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_manufacturing_order_id_fkey"
            columns: ["manufacturing_order_id"]
            isOneToOne: false
            referencedRelation: "manufacturing_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_inspections: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          attachments: Json
          checklist: Json
          company_id: string
          corrective_action: string | null
          created_at: string
          defects: string | null
          id: string
          inspected_at: string
          inspected_by: string | null
          manufacturing_order_id: string
          result: Database["public"]["Enums"]["qc_result"]
          stage_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json
          checklist?: Json
          company_id: string
          corrective_action?: string | null
          created_at?: string
          defects?: string | null
          id?: string
          inspected_at?: string
          inspected_by?: string | null
          manufacturing_order_id: string
          result: Database["public"]["Enums"]["qc_result"]
          stage_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json
          checklist?: Json
          company_id?: string
          corrective_action?: string | null
          created_at?: string
          defects?: string | null
          id?: string
          inspected_at?: string
          inspected_by?: string | null
          manufacturing_order_id?: string
          result?: Database["public"]["Enums"]["qc_result"]
          stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_inspections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_inspections_manufacturing_order_id_fkey"
            columns: ["manufacturing_order_id"]
            isOneToOne: false
            referencedRelation: "manufacturing_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_inspections_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "manufacturing_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          created_at: string
          description: string
          discount_amount: number
          discount_percent: number
          id: string
          line_total: number
          quantity: number
          quotation_id: string
          taxable_amount: number
          unit: string
          unit_price: number
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          created_at?: string
          description: string
          discount_amount?: number
          discount_percent?: number
          id?: string
          line_total?: number
          quantity?: number
          quotation_id: string
          taxable_amount?: number
          unit?: string
          unit_price?: number
          vat_amount?: number
          vat_rate?: number
        }
        Update: {
          created_at?: string
          description?: string
          discount_amount?: number
          discount_percent?: number
          id?: string
          line_total?: number
          quantity?: number
          quotation_id?: string
          taxable_amount?: number
          unit?: string
          unit_price?: number
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          discount_total: number
          id: string
          issue_date: string
          notes: string | null
          quote_number: string
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number
          total: number
          updated_at: string
          valid_until: string | null
          vat_amount: number
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          discount_total?: number
          id?: string
          issue_date?: string
          notes?: string | null
          quote_number: string
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
          vat_amount?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          discount_total?: number
          id?: string
          issue_date?: string
          notes?: string | null
          quote_number?: string
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_suppliers: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_awarded: boolean
          lead_time_days: number | null
          notes: string | null
          payment_terms_days: number | null
          quality_score: number | null
          rfq_id: string
          subtotal: number
          supplier_id: string
          total: number
          vat_amount: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_awarded?: boolean
          lead_time_days?: number | null
          notes?: string | null
          payment_terms_days?: number | null
          quality_score?: number | null
          rfq_id: string
          subtotal?: number
          supplier_id: string
          total?: number
          vat_amount?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_awarded?: boolean
          lead_time_days?: number | null
          notes?: string | null
          payment_terms_days?: number | null
          quality_score?: number | null
          rfq_id?: string
          subtotal?: number
          supplier_id?: string
          total?: number
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "rfq_suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_suppliers_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      rfqs: {
        Row: {
          award_reason: string | null
          awarded_at: string | null
          awarded_by: string | null
          awarded_supplier_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          notes: string | null
          purchase_request_id: string | null
          rfq_number: string
          status: Database["public"]["Enums"]["rfq_status"]
          updated_at: string
        }
        Insert: {
          award_reason?: string | null
          awarded_at?: string | null
          awarded_by?: string | null
          awarded_supplier_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          purchase_request_id?: string | null
          rfq_number: string
          status?: Database["public"]["Enums"]["rfq_status"]
          updated_at?: string
        }
        Update: {
          award_reason?: string | null
          awarded_at?: string | null
          awarded_by?: string | null
          awarded_supplier_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          purchase_request_id?: string | null
          rfq_number?: string
          status?: Database["public"]["Enums"]["rfq_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfqs_awarded_supplier_id_fkey"
            columns: ["awarded_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_purchase_request_id_fkey"
            columns: ["purchase_request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_items: {
        Row: {
          created_at: string
          description: string
          discount_amount: number
          discount_percent: number
          id: string
          line_total: number
          quantity: number
          sales_order_id: string
          taxable_amount: number
          unit: string
          unit_price: number
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          created_at?: string
          description: string
          discount_amount?: number
          discount_percent?: number
          id?: string
          line_total?: number
          quantity?: number
          sales_order_id: string
          taxable_amount?: number
          unit?: string
          unit_price?: number
          vat_amount?: number
          vat_rate?: number
        }
        Update: {
          created_at?: string
          description?: string
          discount_amount?: number
          discount_percent?: number
          id?: string
          line_total?: number
          quantity?: number
          sales_order_id?: string
          taxable_amount?: number
          unit?: string
          unit_price?: number
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          delivery_date: string | null
          discount_total: number
          id: string
          notes: string | null
          order_date: string
          order_number: string
          quotation_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
          vat_amount: number
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          delivery_date?: string | null
          discount_total?: number
          id?: string
          notes?: string | null
          order_date?: string
          order_number: string
          quotation_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          vat_amount?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          delivery_date?: string | null
          discount_total?: number
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          quotation_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_visits: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          customer_signature_path: string | null
          id: string
          internal_cost: number
          outcome: string | null
          parts_used: string | null
          performed_at: string | null
          scheduled_at: string | null
          technician_employee_id: string | null
          technician_user_id: string | null
          updated_at: string
          visit_number: string
          warranty_claim_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_signature_path?: string | null
          id?: string
          internal_cost?: number
          outcome?: string | null
          parts_used?: string | null
          performed_at?: string | null
          scheduled_at?: string | null
          technician_employee_id?: string | null
          technician_user_id?: string | null
          updated_at?: string
          visit_number: string
          warranty_claim_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_signature_path?: string | null
          id?: string
          internal_cost?: number
          outcome?: string | null
          parts_used?: string | null
          performed_at?: string | null
          scheduled_at?: string | null
          technician_employee_id?: string | null
          technician_user_id?: string | null
          updated_at?: string
          visit_number?: string
          warranty_claim_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_visits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_visits_technician_employee_id_fkey"
            columns: ["technician_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_visits_warranty_claim_id_fkey"
            columns: ["warranty_claim_id"]
            isOneToOne: false
            referencedRelation: "warranty_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          break_minutes: number
          code: string
          company_id: string
          created_at: string
          crosses_midnight: boolean
          end_time: string
          grace_minutes: number
          id: string
          is_active: boolean
          name_ar: string
          name_en: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          break_minutes?: number
          code: string
          company_id: string
          created_at?: string
          crosses_midnight?: boolean
          end_time: string
          grace_minutes?: number
          id?: string
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          start_time: string
          updated_at?: string
        }
        Update: {
          break_minutes?: number
          code?: string
          company_id?: string
          created_at?: string
          crosses_midnight?: boolean
          end_time?: string
          grace_minutes?: number
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      site_measurements: {
        Row: {
          area_name: string
          company_id: string
          created_at: string
          height_value: number | null
          id: string
          item_description: string
          length_value: number | null
          notes: string | null
          quantity: number
          site_survey_id: string
          unit: string
          width_value: number | null
        }
        Insert: {
          area_name: string
          company_id: string
          created_at?: string
          height_value?: number | null
          id?: string
          item_description: string
          length_value?: number | null
          notes?: string | null
          quantity?: number
          site_survey_id: string
          unit?: string
          width_value?: number | null
        }
        Update: {
          area_name?: string
          company_id?: string
          created_at?: string
          height_value?: number | null
          id?: string
          item_description?: string
          length_value?: number | null
          notes?: string | null
          quantity?: number
          site_survey_id?: string
          unit?: string
          width_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "site_measurements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_measurements_site_survey_id_fkey"
            columns: ["site_survey_id"]
            isOneToOne: false
            referencedRelation: "site_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      site_surveys: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          customer_approved_at: string | null
          customer_approved_by: string | null
          id: string
          notes: string | null
          project_id: string
          revision: number
          risks: string | null
          site_conditions: string | null
          status: Database["public"]["Enums"]["survey_status"]
          supersedes_id: string | null
          survey_number: string
          surveyor_id: string | null
          updated_at: string
          visit_date: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_approved_at?: string | null
          customer_approved_by?: string | null
          id?: string
          notes?: string | null
          project_id: string
          revision?: number
          risks?: string | null
          site_conditions?: string | null
          status?: Database["public"]["Enums"]["survey_status"]
          supersedes_id?: string | null
          survey_number: string
          surveyor_id?: string | null
          updated_at?: string
          visit_date: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_approved_at?: string | null
          customer_approved_by?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          revision?: number
          risks?: string | null
          site_conditions?: string | null
          status?: Database["public"]["Enums"]["survey_status"]
          supersedes_id?: string | null
          survey_number?: string
          surveyor_id?: string | null
          updated_at?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_surveys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_surveys_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_surveys_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "site_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      snag_items: {
        Row: {
          after_photo_path: string | null
          assignee_user_id: string | null
          before_photo_path: string | null
          closed_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          handover_record_id: string | null
          id: string
          is_critical: boolean
          location_note: string | null
          project_id: string
          status: Database["public"]["Enums"]["snag_status"]
          title_ar: string
          updated_at: string
          waiver_note: string | null
        }
        Insert: {
          after_photo_path?: string | null
          assignee_user_id?: string | null
          before_photo_path?: string | null
          closed_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          handover_record_id?: string | null
          id?: string
          is_critical?: boolean
          location_note?: string | null
          project_id: string
          status?: Database["public"]["Enums"]["snag_status"]
          title_ar: string
          updated_at?: string
          waiver_note?: string | null
        }
        Update: {
          after_photo_path?: string | null
          assignee_user_id?: string | null
          before_photo_path?: string | null
          closed_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          handover_record_id?: string | null
          id?: string
          is_critical?: boolean
          location_note?: string | null
          project_id?: string
          status?: Database["public"]["Enums"]["snag_status"]
          title_ar?: string
          updated_at?: string
          waiver_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "snag_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snag_items_handover_record_id_fkey"
            columns: ["handover_record_id"]
            isOneToOne: false
            referencedRelation: "handover_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snag_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_balances: {
        Row: {
          company_id: string
          created_at: string
          id: string
          item_id: string
          location_id: string | null
          quantity: number
          reserved_quantity: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          item_id: string
          location_id?: string | null
          quantity?: number
          reserved_quantity?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          item_id?: string
          location_id?: string | null
          quantity?: number
          reserved_quantity?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_balances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_balances_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_balances_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_balances_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          bom_line_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          idempotency_key: string
          item_id: string
          location_id: string | null
          manufacturing_order_id: string | null
          movement_type: Database["public"]["Enums"]["stock_move_type"]
          note: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          to_location_id: string | null
          to_warehouse_id: string | null
          unit_cost: number
          warehouse_id: string
        }
        Insert: {
          bom_line_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key: string
          item_id: string
          location_id?: string | null
          manufacturing_order_id?: string | null
          movement_type: Database["public"]["Enums"]["stock_move_type"]
          note?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          to_location_id?: string | null
          to_warehouse_id?: string | null
          unit_cost?: number
          warehouse_id: string
        }
        Update: {
          bom_line_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string
          item_id?: string
          location_id?: string | null
          manufacturing_order_id?: string | null
          movement_type?: Database["public"]["Enums"]["stock_move_type"]
          note?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          to_location_id?: string | null
          to_warehouse_id?: string | null
          unit_cost?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_bom_line_id_fkey"
            columns: ["bom_line_id"]
            isOneToOne: false
            referencedRelation: "bom_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_manufacturing_order_id_fkey"
            columns: ["manufacturing_order_id"]
            isOneToOne: false
            referencedRelation: "manufacturing_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_locations: {
        Row: {
          code: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name_ar: string
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar: string
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storage_locations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_contacts: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          id: string
          is_primary: boolean
          name: string
          phone: string | null
          supplier_id: string
          title: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          phone?: string | null
          supplier_id: string
          title?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string | null
          supplier_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_contacts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_invoice_items: {
        Row: {
          company_id: string
          created_at: string
          description: string
          discount_amount: number
          discount_percent: number
          id: string
          item_id: string | null
          line_total: number
          purchase_order_item_id: string | null
          quantity: number
          supplier_invoice_id: string
          taxable_amount: number
          unit: string
          unit_price: number
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          company_id: string
          created_at?: string
          description: string
          discount_amount?: number
          discount_percent?: number
          id?: string
          item_id?: string | null
          line_total?: number
          purchase_order_item_id?: string | null
          quantity?: number
          supplier_invoice_id: string
          taxable_amount?: number
          unit?: string
          unit_price?: number
          vat_amount?: number
          vat_rate?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string
          discount_amount?: number
          discount_percent?: number
          id?: string
          item_id?: string | null
          line_total?: number
          purchase_order_item_id?: string | null
          quantity?: number
          supplier_invoice_id?: string
          taxable_amount?: number
          unit?: string
          unit_price?: number
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_invoice_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoice_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoice_items_purchase_order_item_id_fkey"
            columns: ["purchase_order_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoice_items_supplier_invoice_id_fkey"
            columns: ["supplier_invoice_id"]
            isOneToOne: false
            referencedRelation: "supplier_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_invoices: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          created_by: string | null
          discrepancy_note: string | null
          due_date: string | null
          id: string
          invoice_date: string
          match_status: string
          purchase_order_id: string | null
          status: Database["public"]["Enums"]["sinv_status"]
          subtotal: number
          supplier_id: string
          supplier_invoice_number: string
          tax_treatment: Database["public"]["Enums"]["tax_treatment"]
          total: number
          updated_at: string
          vat_amount: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          discrepancy_note?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          match_status?: string
          purchase_order_id?: string | null
          status?: Database["public"]["Enums"]["sinv_status"]
          subtotal?: number
          supplier_id: string
          supplier_invoice_number: string
          tax_treatment?: Database["public"]["Enums"]["tax_treatment"]
          total?: number
          updated_at?: string
          vat_amount?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          discrepancy_note?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          match_status?: string
          purchase_order_id?: string | null
          status?: Database["public"]["Enums"]["sinv_status"]
          subtotal?: number
          supplier_id?: string
          supplier_invoice_number?: string
          tax_treatment?: Database["public"]["Enums"]["tax_treatment"]
          total?: number
          updated_at?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_return_items: {
        Row: {
          company_id: string
          created_at: string
          id: string
          item_id: string
          note: string | null
          purchase_order_item_id: string | null
          quantity: number
          supplier_return_id: string
          unit_price: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          item_id: string
          note?: string | null
          purchase_order_item_id?: string | null
          quantity: number
          supplier_return_id: string
          unit_price?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          item_id?: string
          note?: string | null
          purchase_order_item_id?: string | null
          quantity?: number
          supplier_return_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_return_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_return_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_return_items_purchase_order_item_id_fkey"
            columns: ["purchase_order_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_return_items_supplier_return_id_fkey"
            columns: ["supplier_return_id"]
            isOneToOne: false
            referencedRelation: "supplier_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_returns: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          goods_receipt_id: string | null
          id: string
          posted_at: string | null
          purchase_order_id: string | null
          reason: string
          return_date: string
          return_number: string
          status: Database["public"]["Enums"]["grn_status"]
          supplier_id: string
          supplier_invoice_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          goods_receipt_id?: string | null
          id?: string
          posted_at?: string | null
          purchase_order_id?: string | null
          reason: string
          return_date?: string
          return_number: string
          status?: Database["public"]["Enums"]["grn_status"]
          supplier_id: string
          supplier_invoice_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          goods_receipt_id?: string | null
          id?: string
          posted_at?: string | null
          purchase_order_id?: string | null
          reason?: string
          return_date?: string
          return_number?: string
          status?: Database["public"]["Enums"]["grn_status"]
          supplier_id?: string
          supplier_invoice_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_returns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_returns_goods_receipt_id_fkey"
            columns: ["goods_receipt_id"]
            isOneToOne: false
            referencedRelation: "goods_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_returns_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_returns_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_returns_supplier_invoice_id_fkey"
            columns: ["supplier_invoice_id"]
            isOneToOne: false
            referencedRelation: "supplier_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          bank_name: string | null
          category: string | null
          city: string | null
          code: string
          company_id: string
          cr_number: string | null
          created_at: string
          created_by: string | null
          email: string | null
          iban: string | null
          id: string
          name_ar: string
          name_en: string | null
          notes: string | null
          payment_terms_days: number
          phone: string | null
          status: string
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          bank_name?: string | null
          category?: string | null
          city?: string | null
          code: string
          company_id: string
          cr_number?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          name_ar: string
          name_en?: string | null
          notes?: string | null
          payment_terms_days?: number
          phone?: string | null
          status?: string
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          bank_name?: string | null
          category?: string | null
          city?: string | null
          code?: string
          company_id?: string
          cr_number?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          name_ar?: string
          name_en?: string | null
          notes?: string | null
          payment_terms_days?: number
          phone?: string | null
          status?: string
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignments: {
        Row: {
          company_id: string
          created_at: string
          employee_id: string | null
          id: string
          task_id: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          employee_id?: string | null
          id?: string
          task_id: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          employee_id?: string | null
          id?: string
          task_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          company_id: string
          created_at: string
          depends_on_task_id: string
          id: string
          task_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          depends_on_task_id: string
          id?: string
          task_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          depends_on_task_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      template_versions: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          footer_ar: string | null
          id: string
          is_published: boolean
          layout: Json
          published_at: string | null
          published_by: string | null
          show_logo: boolean
          show_qr: boolean
          template_id: string
          terms_ar: string | null
          updated_at: string
          version: number
          watermark_text: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          footer_ar?: string | null
          id?: string
          is_published?: boolean
          layout?: Json
          published_at?: string | null
          published_by?: string | null
          show_logo?: boolean
          show_qr?: boolean
          template_id: string
          terms_ar?: string | null
          updated_at?: string
          version: number
          watermark_text?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          footer_ar?: string | null
          id?: string
          is_published?: boolean
          layout?: Json
          published_at?: string | null
          published_by?: string | null
          show_logo?: boolean
          show_qr?: boolean
          template_id?: string
          terms_ar?: string | null
          updated_at?: string
          version?: number
          watermark_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          company_id: string
          created_at: string
          employee_id: string | null
          hourly_cost: number
          hours: number
          id: string
          notes: string | null
          project_id: string
          task_id: string | null
          total_cost: number
          updated_at: string
          user_id: string | null
          work_date: string
        }
        Insert: {
          company_id: string
          created_at?: string
          employee_id?: string | null
          hourly_cost?: number
          hours: number
          id?: string
          notes?: string | null
          project_id: string
          task_id?: string | null
          total_cost?: number
          updated_at?: string
          user_id?: string | null
          work_date?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          employee_id?: string | null
          hourly_cost?: number
          hours?: number
          id?: string
          notes?: string | null
          project_id?: string
          task_id?: string | null
          total_cost?: number
          updated_at?: string
          user_id?: string | null
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_conversations: {
        Row: {
          assigned_to: string | null
          company_id: string
          contact_name: string | null
          contact_phone: string
          contact_phone_masked: string
          created_at: string
          customer_id: string | null
          id: string
          integration_id: string | null
          last_message_at: string | null
          priority: Database["public"]["Enums"]["thread_priority"]
          project_id: string | null
          quotation_id: string | null
          sales_order_id: string | null
          sla_due_at: string | null
          status: string
          tags: string[]
          unread_count: number
          updated_at: string
          window_expires_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          company_id: string
          contact_name?: string | null
          contact_phone: string
          contact_phone_masked: string
          created_at?: string
          customer_id?: string | null
          id?: string
          integration_id?: string | null
          last_message_at?: string | null
          priority?: Database["public"]["Enums"]["thread_priority"]
          project_id?: string | null
          quotation_id?: string | null
          sales_order_id?: string | null
          sla_due_at?: string | null
          status?: string
          tags?: string[]
          unread_count?: number
          updated_at?: string
          window_expires_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          company_id?: string
          contact_name?: string | null
          contact_phone?: string
          contact_phone_masked?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          integration_id?: string | null
          last_message_at?: string | null
          priority?: Database["public"]["Enums"]["thread_priority"]
          project_id?: string | null
          quotation_id?: string | null
          sales_order_id?: string | null
          sla_due_at?: string | null
          status?: string
          tags?: string[]
          unread_count?: number
          updated_at?: string
          window_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_conversations_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_conversations_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_conversations_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_messages: {
        Row: {
          approved_by: string | null
          body: string | null
          company_id: string
          conversation_id: string
          created_at: string
          direction: Database["public"]["Enums"]["wa_direction"]
          error_text: string | null
          generated_document_id: string | null
          id: string
          media_mime: string | null
          media_path: string | null
          media_size_bytes: number | null
          message_type: string
          provider_message_id: string | null
          sent_by: string | null
          status: Database["public"]["Enums"]["wa_message_status"]
          status_updated_at: string | null
          template_id: string | null
        }
        Insert: {
          approved_by?: string | null
          body?: string | null
          company_id: string
          conversation_id: string
          created_at?: string
          direction: Database["public"]["Enums"]["wa_direction"]
          error_text?: string | null
          generated_document_id?: string | null
          id?: string
          media_mime?: string | null
          media_path?: string | null
          media_size_bytes?: number | null
          message_type?: string
          provider_message_id?: string | null
          sent_by?: string | null
          status?: Database["public"]["Enums"]["wa_message_status"]
          status_updated_at?: string | null
          template_id?: string | null
        }
        Update: {
          approved_by?: string | null
          body?: string | null
          company_id?: string
          conversation_id?: string
          created_at?: string
          direction?: Database["public"]["Enums"]["wa_direction"]
          error_text?: string | null
          generated_document_id?: string | null
          id?: string
          media_mime?: string | null
          media_path?: string | null
          media_size_bytes?: number | null
          message_type?: string
          provider_message_id?: string | null
          sent_by?: string | null
          status?: Database["public"]["Enums"]["wa_message_status"]
          status_updated_at?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "wa_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_messages_generated_document_id_fkey"
            columns: ["generated_document_id"]
            isOneToOne: false
            referencedRelation: "generated_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_messages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "wa_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_templates: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          body: string
          category: string
          company_id: string
          created_at: string
          id: string
          language: string
          name: string
          status: Database["public"]["Enums"]["wa_template_status"]
          updated_at: string
          variables: string[]
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          body: string
          category?: string
          company_id: string
          created_at?: string
          id?: string
          language?: string
          name: string
          status?: Database["public"]["Enums"]["wa_template_status"]
          updated_at?: string
          variables?: string[]
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          body?: string
          category?: string
          company_id?: string
          created_at?: string
          id?: string
          language?: string
          name?: string
          status?: Database["public"]["Enums"]["wa_template_status"]
          updated_at?: string
          variables?: string[]
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "wa_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string | null
          updated_at: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      warranties: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          end_date: string
          handover_record_id: string | null
          id: string
          project_id: string
          scope_ar: string
          start_date: string
          status: Database["public"]["Enums"]["warranty_status"]
          terms_ar: string | null
          updated_at: string
          warranty_number: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          end_date: string
          handover_record_id?: string | null
          id?: string
          project_id: string
          scope_ar?: string
          start_date: string
          status?: Database["public"]["Enums"]["warranty_status"]
          terms_ar?: string | null
          updated_at?: string
          warranty_number: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          end_date?: string
          handover_record_id?: string | null
          id?: string
          project_id?: string
          scope_ar?: string
          start_date?: string
          status?: Database["public"]["Enums"]["warranty_status"]
          terms_ar?: string | null
          updated_at?: string
          warranty_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_handover_record_id_fkey"
            columns: ["handover_record_id"]
            isOneToOne: false
            referencedRelation: "handover_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_claims: {
        Row: {
          category: string | null
          claim_number: string
          closed_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          is_covered: boolean | null
          priority: Database["public"]["Enums"]["project_priority"]
          project_id: string
          reported_at: string
          resolution: string | null
          sla_due_at: string | null
          status: Database["public"]["Enums"]["claim_status"]
          updated_at: string
          warranty_id: string
        }
        Insert: {
          category?: string | null
          claim_number: string
          closed_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          is_covered?: boolean | null
          priority?: Database["public"]["Enums"]["project_priority"]
          project_id: string
          reported_at?: string
          resolution?: string | null
          sla_due_at?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
          warranty_id: string
        }
        Update: {
          category?: string | null
          claim_number?: string
          closed_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_covered?: boolean | null
          priority?: Database["public"]["Enums"]["project_priority"]
          project_id?: string
          reported_at?: string
          resolution?: string | null
          sla_due_at?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
          warranty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_claims_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_claims_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_claims_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          company_id: string
          created_at: string
          event_timestamp: string | null
          event_type: string | null
          id: string
          integration_id: string | null
          payload_digest: string
          process_error: string | null
          processed_at: string | null
          provider_event_id: string
          signature_valid: boolean
          source: Database["public"]["Enums"]["integration_kind"]
        }
        Insert: {
          company_id: string
          created_at?: string
          event_timestamp?: string | null
          event_type?: string | null
          id?: string
          integration_id?: string | null
          payload_digest: string
          process_error?: string | null
          processed_at?: string | null
          provider_event_id: string
          signature_valid?: boolean
          source: Database["public"]["Enums"]["integration_kind"]
        }
        Update: {
          company_id?: string
          created_at?: string
          event_timestamp?: string | null
          event_type?: string | null
          id?: string
          integration_id?: string | null
          payload_digest?: string
          process_error?: string | null
          processed_at?: string | null
          provider_event_id?: string
          signature_valid?: boolean
          source?: Database["public"]["Enums"]["integration_kind"]
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      website_submission_files: {
        Row: {
          company_id: string
          created_at: string
          file_name: string
          id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          submission_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          file_name: string
          id?: string
          mime_type: string
          size_bytes?: number
          storage_path: string
          submission_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_submission_files_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_submission_files_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "website_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      website_submissions: {
        Row: {
          assigned_to: string | null
          captcha_verified: boolean
          city: string | null
          company_id: string
          converted_at: string | null
          converted_customer_id: string | null
          converted_quotation_id: string | null
          created_at: string
          details: Json
          email: string | null
          full_name: string
          id: string
          idempotency_key: string
          integration_id: string | null
          kind: Database["public"]["Enums"]["submission_kind"]
          message: string | null
          phone: string | null
          priority: Database["public"]["Enums"]["thread_priority"]
          reviewed_at: string | null
          reviewed_by: string | null
          sla_due_at: string | null
          source_ip_hash: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["submission_status"]
          subject: string | null
          tags: string[]
          unread: boolean
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          captcha_verified?: boolean
          city?: string | null
          company_id: string
          converted_at?: string | null
          converted_customer_id?: string | null
          converted_quotation_id?: string | null
          created_at?: string
          details?: Json
          email?: string | null
          full_name: string
          id?: string
          idempotency_key: string
          integration_id?: string | null
          kind?: Database["public"]["Enums"]["submission_kind"]
          message?: string | null
          phone?: string | null
          priority?: Database["public"]["Enums"]["thread_priority"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          sla_due_at?: string | null
          source_ip_hash?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          subject?: string | null
          tags?: string[]
          unread?: boolean
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          captcha_verified?: boolean
          city?: string | null
          company_id?: string
          converted_at?: string | null
          converted_customer_id?: string | null
          converted_quotation_id?: string | null
          created_at?: string
          details?: Json
          email?: string | null
          full_name?: string
          id?: string
          idempotency_key?: string
          integration_id?: string | null
          kind?: Database["public"]["Enums"]["submission_kind"]
          message?: string | null
          phone?: string | null
          priority?: Database["public"]["Enums"]["thread_priority"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          sla_due_at?: string | null
          source_ip_hash?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          subject?: string | null
          tags?: string[]
          unread?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_submissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_submissions_converted_customer_id_fkey"
            columns: ["converted_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_submissions_converted_quotation_id_fkey"
            columns: ["converted_quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_submissions_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      work_locations: {
        Row: {
          address: string | null
          code: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name_ar: string
          name_en: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_wa_unread: {
        Args: { _conversation_id: string }
        Returns: undefined
      }
      analytics_can_view_costs: { Args: never; Returns: boolean }
      analytics_can_view_finance: { Args: never; Returns: boolean }
      analytics_can_view_hr: { Args: never; Returns: boolean }
      analytics_executive: {
        Args: { _from: string; _to: string }
        Returns: Json
      }
      analytics_finance: { Args: { _from: string; _to: string }; Returns: Json }
      analytics_hr: {
        Args: { _department_id?: string; _from: string; _to: string }
        Returns: Json
      }
      analytics_inventory: {
        Args: { _from: string; _to: string }
        Returns: Json
      }
      analytics_log_export: {
        Args: { _format: string; _report: string; _scope: Json }
        Returns: undefined
      }
      analytics_manufacturing: {
        Args: { _from: string; _to: string }
        Returns: Json
      }
      analytics_projects: {
        Args: { _from: string; _project_id?: string; _to: string }
        Returns: Json
      }
      analytics_purchasing: {
        Args: { _from: string; _to: string }
        Returns: Json
      }
      analytics_sales: {
        Args: { _customer_id?: string; _from: string; _to: string }
        Returns: Json
      }
      can_ai_kind: {
        Args: { _kind: Database["public"]["Enums"]["ai_job_kind"] }
        Returns: boolean
      }
      can_edit_project: { Args: { _project_id: string }; Returns: boolean }
      can_view_employee: { Args: { _employee_id: string }; Returns: boolean }
      can_view_project: { Args: { _project_id: string }; Returns: boolean }
      current_company_id: { Args: never; Returns: string }
      current_employee_id: { Args: never; Returns: string }
      has_any_role: { Args: { _roles: string[] }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_comms_admin: { Args: never; Returns: boolean }
      is_comms_staff: { Args: never; Returns: boolean }
      is_company_admin: { Args: never; Returns: boolean }
      is_hr_staff: { Args: never; Returns: boolean }
      is_manager_of: { Args: { _employee_id: string }; Returns: boolean }
      is_payroll_staff: { Args: never; Returns: boolean }
      is_portal_customer: { Args: never; Returns: boolean }
      is_project_staff: { Args: never; Returns: boolean }
      my_customer_ids: { Args: never; Returns: string[] }
      next_document_number: {
        Args: { _company_id: string; _doc_type: string; _prefix: string }
        Returns: string
      }
      next_document_serial: {
        Args: {
          _company_id: string
          _kind: Database["public"]["Enums"]["doc_template_kind"]
          _period: string
          _prefix: string
        }
        Returns: string
      }
      purge_expired_ai_jobs: { Args: { _company_id: string }; Returns: number }
    }
    Enums: {
      account_type: "asset" | "liability" | "equity" | "revenue" | "expense"
      ai_job_kind:
        | "supplier_invoice"
        | "expense"
        | "quotation"
        | "sales_order"
        | "employee_contract"
        | "furniture_design"
        | "drawing_measurements"
        | "general_document"
        | "seating_capacity"
        | "design_skill"
      ai_job_status: "queued" | "running" | "completed" | "failed" | "cancelled"
      ai_rec_status: "draft" | "approved" | "rejected" | "applied"
      ai_review_action: "approve" | "reject" | "request_changes" | "reanalyze"
      ai_value_kind: "fact" | "assumption" | "estimate"
      app_role:
        | "super_admin"
        | "factory_owner"
        | "general_manager"
        | "sales_manager"
        | "sales_employee"
        | "production_manager"
        | "warehouse_manager"
        | "purchasing_manager"
        | "accountant"
        | "hr"
        | "designer"
        | "technician"
        | "project_manager"
        | "quality_manager"
        | "installer"
        | "customer_portal"
      approval_status:
        | "draft"
        | "submitted"
        | "approved"
        | "rejected"
        | "superseded"
      attendance_status:
        | "present"
        | "absent"
        | "late"
        | "on_leave"
        | "holiday"
        | "weekend"
      claim_status:
        | "new"
        | "triaged"
        | "scheduled"
        | "in_progress"
        | "resolved"
        | "rejected"
        | "closed"
      comm_channel:
        | "call"
        | "whatsapp"
        | "email"
        | "meeting"
        | "site_visit"
        | "other"
      company_doc_status:
        | "draft"
        | "review"
        | "approved"
        | "rejected"
        | "expired"
      custody_status: "issued" | "returned" | "lost" | "damaged"
      delivery_status: "draft" | "delivered" | "acknowledged"
      doc_status: "draft" | "review" | "approved" | "issued" | "void"
      doc_template_kind:
        | "quotation"
        | "sales_order"
        | "tax_invoice"
        | "receipt_voucher"
        | "payment_voucher"
        | "manufacturing_order"
        | "goods_receipt"
        | "delivery_note"
        | "measurement_report"
        | "design_approval"
        | "final_handover"
        | "supply_contract"
        | "employee_contract"
      employment_status:
        | "active"
        | "probation"
        | "on_leave"
        | "suspended"
        | "terminated"
        | "resigned"
      grn_status: "draft" | "posted" | "cancelled"
      handover_type: "preliminary" | "final"
      hr_contract_status:
        | "draft"
        | "active"
        | "expired"
        | "terminated"
        | "cancelled"
      hr_contract_type:
        | "permanent"
        | "fixed_term"
        | "part_time"
        | "temporary"
        | "trainee"
      hr_document_type:
        | "national_id"
        | "iqama"
        | "passport"
        | "visa"
        | "contract"
        | "certificate"
        | "medical"
        | "license"
        | "other"
      identity_review_status: "draft" | "review" | "approved"
      install_status:
        | "draft"
        | "scheduled"
        | "dispatched"
        | "in_progress"
        | "paused"
        | "completed"
        | "cancelled"
      integration_health: "unknown" | "healthy" | "degraded" | "down"
      integration_kind: "website" | "whatsapp" | "email"
      integration_status:
        | "disconnected"
        | "configured"
        | "active"
        | "error"
        | "paused"
      invoice_status: "draft" | "issued" | "paid" | "void"
      je_status: "draft" | "approved" | "posted" | "reversed"
      leave_request_status:
        | "draft"
        | "submitted"
        | "approved"
        | "rejected"
        | "cancelled"
      mfg_status:
        | "draft"
        | "approved"
        | "awaiting_materials"
        | "ready_to_produce"
        | "in_production"
        | "quality_check"
        | "ready_for_delivery"
        | "delivered"
        | "cancelled"
      notification_channel: "in_app" | "email" | "whatsapp"
      notification_status: "pending" | "sent" | "delivered" | "failed" | "read"
      order_status:
        | "draft"
        | "confirmed"
        | "in_production"
        | "ready"
        | "delivered"
        | "cancelled"
      outbox_status: "pending" | "processing" | "done" | "failed" | "dead"
      payreq_status:
        | "draft"
        | "submitted"
        | "approved"
        | "rejected"
        | "executed"
        | "cancelled"
      payroll_run_status:
        | "draft"
        | "calculated"
        | "approved"
        | "paid"
        | "cancelled"
      period_status: "open" | "closed"
      po_status:
        | "draft"
        | "approved"
        | "partially_received"
        | "received"
        | "closed"
        | "cancelled"
      pr_status:
        | "draft"
        | "submitted"
        | "approved"
        | "rejected"
        | "converted"
        | "cancelled"
      production_status:
        | "planned"
        | "in_progress"
        | "qc"
        | "completed"
        | "on_hold"
      project_priority: "low" | "normal" | "high" | "critical"
      project_status:
        | "draft"
        | "planning"
        | "survey"
        | "design"
        | "approved"
        | "in_production"
        | "installation"
        | "handover"
        | "completed"
        | "on_hold"
        | "cancelled"
      ptask_status: "todo" | "in_progress" | "blocked" | "done" | "cancelled"
      qc_result: "pass" | "fail" | "rework"
      quote_status: "draft" | "sent" | "accepted" | "rejected" | "expired"
      rfq_status: "draft" | "sent" | "closed" | "awarded" | "cancelled"
      sinv_status:
        | "draft"
        | "matched"
        | "discrepancy"
        | "approved"
        | "paid"
        | "void"
      snag_status: "open" | "in_progress" | "fixed" | "verified" | "waived"
      stage_status: "pending" | "in_progress" | "passed" | "failed"
      stock_move_type:
        | "receipt"
        | "issue_to_mfg"
        | "return_from_mfg"
        | "transfer"
        | "adjustment"
        | "reserve"
        | "release_reserve"
        | "return_to_supplier"
      submission_kind: "contact" | "quote_request" | "measurement"
      submission_status: "new" | "triage" | "converted" | "rejected" | "spam"
      survey_status:
        | "draft"
        | "submitted"
        | "customer_approved"
        | "superseded"
        | "cancelled"
      tax_treatment: "standard" | "exempt" | "out_of_scope"
      thread_priority: "low" | "normal" | "high" | "urgent"
      voucher_status: "draft" | "confirmed" | "cancelled"
      voucher_type: "receipt" | "payment" | "transfer"
      wa_direction: "inbound" | "outbound"
      wa_message_status: "pending" | "sent" | "delivered" | "read" | "failed"
      wa_template_status: "draft" | "approved" | "rejected" | "archived"
      warranty_status: "active" | "expired" | "void"
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
      account_type: ["asset", "liability", "equity", "revenue", "expense"],
      ai_job_kind: [
        "supplier_invoice",
        "expense",
        "quotation",
        "sales_order",
        "employee_contract",
        "furniture_design",
        "drawing_measurements",
        "general_document",
        "seating_capacity",
        "design_skill",
      ],
      ai_job_status: ["queued", "running", "completed", "failed", "cancelled"],
      ai_rec_status: ["draft", "approved", "rejected", "applied"],
      ai_review_action: ["approve", "reject", "request_changes", "reanalyze"],
      ai_value_kind: ["fact", "assumption", "estimate"],
      app_role: [
        "super_admin",
        "factory_owner",
        "general_manager",
        "sales_manager",
        "sales_employee",
        "production_manager",
        "warehouse_manager",
        "purchasing_manager",
        "accountant",
        "hr",
        "designer",
        "technician",
        "project_manager",
        "quality_manager",
        "installer",
        "customer_portal",
      ],
      approval_status: [
        "draft",
        "submitted",
        "approved",
        "rejected",
        "superseded",
      ],
      attendance_status: [
        "present",
        "absent",
        "late",
        "on_leave",
        "holiday",
        "weekend",
      ],
      claim_status: [
        "new",
        "triaged",
        "scheduled",
        "in_progress",
        "resolved",
        "rejected",
        "closed",
      ],
      comm_channel: [
        "call",
        "whatsapp",
        "email",
        "meeting",
        "site_visit",
        "other",
      ],
      company_doc_status: [
        "draft",
        "review",
        "approved",
        "rejected",
        "expired",
      ],
      custody_status: ["issued", "returned", "lost", "damaged"],
      delivery_status: ["draft", "delivered", "acknowledged"],
      doc_status: ["draft", "review", "approved", "issued", "void"],
      doc_template_kind: [
        "quotation",
        "sales_order",
        "tax_invoice",
        "receipt_voucher",
        "payment_voucher",
        "manufacturing_order",
        "goods_receipt",
        "delivery_note",
        "measurement_report",
        "design_approval",
        "final_handover",
        "supply_contract",
        "employee_contract",
      ],
      employment_status: [
        "active",
        "probation",
        "on_leave",
        "suspended",
        "terminated",
        "resigned",
      ],
      grn_status: ["draft", "posted", "cancelled"],
      handover_type: ["preliminary", "final"],
      hr_contract_status: [
        "draft",
        "active",
        "expired",
        "terminated",
        "cancelled",
      ],
      hr_contract_type: [
        "permanent",
        "fixed_term",
        "part_time",
        "temporary",
        "trainee",
      ],
      hr_document_type: [
        "national_id",
        "iqama",
        "passport",
        "visa",
        "contract",
        "certificate",
        "medical",
        "license",
        "other",
      ],
      identity_review_status: ["draft", "review", "approved"],
      install_status: [
        "draft",
        "scheduled",
        "dispatched",
        "in_progress",
        "paused",
        "completed",
        "cancelled",
      ],
      integration_health: ["unknown", "healthy", "degraded", "down"],
      integration_kind: ["website", "whatsapp", "email"],
      integration_status: [
        "disconnected",
        "configured",
        "active",
        "error",
        "paused",
      ],
      invoice_status: ["draft", "issued", "paid", "void"],
      je_status: ["draft", "approved", "posted", "reversed"],
      leave_request_status: [
        "draft",
        "submitted",
        "approved",
        "rejected",
        "cancelled",
      ],
      mfg_status: [
        "draft",
        "approved",
        "awaiting_materials",
        "ready_to_produce",
        "in_production",
        "quality_check",
        "ready_for_delivery",
        "delivered",
        "cancelled",
      ],
      notification_channel: ["in_app", "email", "whatsapp"],
      notification_status: ["pending", "sent", "delivered", "failed", "read"],
      order_status: [
        "draft",
        "confirmed",
        "in_production",
        "ready",
        "delivered",
        "cancelled",
      ],
      outbox_status: ["pending", "processing", "done", "failed", "dead"],
      payreq_status: [
        "draft",
        "submitted",
        "approved",
        "rejected",
        "executed",
        "cancelled",
      ],
      payroll_run_status: [
        "draft",
        "calculated",
        "approved",
        "paid",
        "cancelled",
      ],
      period_status: ["open", "closed"],
      po_status: [
        "draft",
        "approved",
        "partially_received",
        "received",
        "closed",
        "cancelled",
      ],
      pr_status: [
        "draft",
        "submitted",
        "approved",
        "rejected",
        "converted",
        "cancelled",
      ],
      production_status: [
        "planned",
        "in_progress",
        "qc",
        "completed",
        "on_hold",
      ],
      project_priority: ["low", "normal", "high", "critical"],
      project_status: [
        "draft",
        "planning",
        "survey",
        "design",
        "approved",
        "in_production",
        "installation",
        "handover",
        "completed",
        "on_hold",
        "cancelled",
      ],
      ptask_status: ["todo", "in_progress", "blocked", "done", "cancelled"],
      qc_result: ["pass", "fail", "rework"],
      quote_status: ["draft", "sent", "accepted", "rejected", "expired"],
      rfq_status: ["draft", "sent", "closed", "awarded", "cancelled"],
      sinv_status: [
        "draft",
        "matched",
        "discrepancy",
        "approved",
        "paid",
        "void",
      ],
      snag_status: ["open", "in_progress", "fixed", "verified", "waived"],
      stage_status: ["pending", "in_progress", "passed", "failed"],
      stock_move_type: [
        "receipt",
        "issue_to_mfg",
        "return_from_mfg",
        "transfer",
        "adjustment",
        "reserve",
        "release_reserve",
        "return_to_supplier",
      ],
      submission_kind: ["contact", "quote_request", "measurement"],
      submission_status: ["new", "triage", "converted", "rejected", "spam"],
      survey_status: [
        "draft",
        "submitted",
        "customer_approved",
        "superseded",
        "cancelled",
      ],
      tax_treatment: ["standard", "exempt", "out_of_scope"],
      thread_priority: ["low", "normal", "high", "urgent"],
      voucher_status: ["draft", "confirmed", "cancelled"],
      voucher_type: ["receipt", "payment", "transfer"],
      wa_direction: ["inbound", "outbound"],
      wa_message_status: ["pending", "sent", "delivered", "read", "failed"],
      wa_template_status: ["draft", "approved", "rejected", "archived"],
      warranty_status: ["active", "expired", "void"],
    },
  },
} as const

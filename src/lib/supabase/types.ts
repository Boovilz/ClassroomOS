/**
 * Hand-written Supabase Database types matching supabase/migrations/*.sql.
 *
 * TODO: once the project is linked to a real Supabase instance, regenerate
 * this file with the official codegen for full accuracy:
 *   npx supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts
 *
 * This hand-written version covers the Tier 1/2 tables used by real
 * queries in the app; Tier 3 tables are included for completeness but are
 * not yet queried anywhere.
 */

export type Role = "super_admin" | "school_admin" | "teacher" | "parent" | "student";

export type AttendanceStatus = "present" | "late" | "sick" | "personal_leave" | "absent";

export interface Database {
  public: {
    Tables: {
      schools: {
        Row: {
          id: string;
          name: string;
          name_en: string | null;
          address: string | null;
          province: string | null;
          phone: string | null;
          logo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["schools"]["Row"]> & { name: string };
        Update: Partial<Database["public"]["Tables"]["schools"]["Row"]>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          school_id: string | null;
          email: string;
          full_name: string;
          role: Role;
          avatar_url: string | null;
          phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["users"]["Row"]> & {
          id: string;
          email: string;
          full_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Row"]>;
        Relationships: [];
      };
      teachers: {
        Row: {
          id: string;
          user_id: string;
          school_id: string;
          teacher_code: string | null;
          subject_specialty: string | null;
          homeroom_classroom: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["teachers"]["Row"]> & {
          user_id: string;
          school_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["teachers"]["Row"]>;
        Relationships: [];
      };
      students: {
        Row: {
          id: string;
          school_id: string;
          user_id: string | null;
          teacher_id: string | null;
          student_code: string;
          citizen_id: string | null;
          full_name: string;
          full_name_en: string | null;
          nickname: string | null;
          gender: "male" | "female" | "other" | null;
          birth_date: string | null;
          grade: string | null;
          classroom: string | null;
          address: string | null;
          blood_type: string | null;
          avatar_url: string | null;
          level: number;
          xp: number;
          coins: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["students"]["Row"]> & {
          school_id: string;
          student_code: string;
          full_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["students"]["Row"]>;
        Relationships: [];
      };
      parents: {
        Row: {
          id: string;
          user_id: string | null;
          school_id: string;
          student_id: string;
          full_name: string;
          relationship: "father" | "mother" | "guardian" | "other" | null;
          occupation: string | null;
          phone: string | null;
          email: string | null;
          is_primary_contact: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["parents"]["Row"]> & {
          school_id: string;
          student_id: string;
          full_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["parents"]["Row"]>;
        Relationships: [];
      };
      attendance: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          date: string;
          status: AttendanceStatus;
          check_in_time: string | null;
          check_out_time: string | null;
          recorded_by: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["attendance"]["Row"]> & {
          school_id: string;
          student_id: string;
          date: string;
        };
        Update: Partial<Database["public"]["Tables"]["attendance"]["Row"]>;
        Relationships: [
          { foreignKeyName: "attendance_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
        ];
      };
      attendance_logs: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          attendance_id: string | null;
          source: "qr_kiosk" | "manual" | "qr_token" | "import";
          scanned_at: string;
          device_info: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["attendance_logs"]["Row"]> & {
          school_id: string;
          student_id: string;
          source: "qr_kiosk" | "manual" | "qr_token" | "import";
        };
        Update: Partial<Database["public"]["Tables"]["attendance_logs"]["Row"]>;
        Relationships: [];
      };
      qr_tokens: {
        Row: {
          id: string;
          school_id: string;
          student_id: string | null;
          token: string;
          purpose: "attendance" | "kiosk_session";
          expires_at: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["qr_tokens"]["Row"]> & {
          school_id: string;
          token: string;
          expires_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["qr_tokens"]["Row"]>;
        Relationships: [];
      };
      behavior_records: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          recorded_by: string | null;
          category: "positive" | "negative";
          title: string;
          description: string | null;
          points: number;
          occurred_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["behavior_records"]["Row"]> & {
          school_id: string;
          student_id: string;
          category: "positive" | "negative";
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["behavior_records"]["Row"]>;
        Relationships: [
          { foreignKeyName: "behavior_records_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
        ];
      };
      xp_transactions: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          amount: number;
          reason: string;
          related_behavior_record_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["xp_transactions"]["Row"]> & {
          school_id: string;
          student_id: string;
          amount: number;
          reason: string;
        };
        Update: Partial<Database["public"]["Tables"]["xp_transactions"]["Row"]>;
        Relationships: [];
      };
      coin_transactions: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          amount: number;
          reason: string;
          reward_item_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["coin_transactions"]["Row"]> & {
          school_id: string;
          student_id: string;
          amount: number;
          reason: string;
        };
        Update: Partial<Database["public"]["Tables"]["coin_transactions"]["Row"]>;
        Relationships: [];
      };
      achievements: {
        Row: {
          id: string;
          school_id: string | null;
          code: string;
          title: string;
          description: string | null;
          icon: string | null;
          xp_reward: number;
          coin_reward: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["achievements"]["Row"]> & {
          code: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["achievements"]["Row"]>;
        Relationships: [];
      };
      student_achievements: {
        Row: {
          id: string;
          student_id: string;
          achievement_id: string;
          awarded_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["student_achievements"]["Row"]> & {
          student_id: string;
          achievement_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["student_achievements"]["Row"]>;
        Relationships: [];
      };
      leaderboards: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          period: "weekly" | "monthly" | "all_time";
          rank: number;
          xp: number;
          computed_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["leaderboards"]["Row"]> & {
          school_id: string;
          student_id: string;
          period: "weekly" | "monthly" | "all_time";
          rank: number;
          xp: number;
        };
        Update: Partial<Database["public"]["Tables"]["leaderboards"]["Row"]>;
        Relationships: [];
      };
      reward_shop_items: {
        Row: {
          id: string;
          school_id: string;
          name: string;
          description: string | null;
          cost_coins: number;
          stock: number | null;
          image_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["reward_shop_items"]["Row"]> & {
          school_id: string;
          name: string;
          cost_coins: number;
        };
        Update: Partial<Database["public"]["Tables"]["reward_shop_items"]["Row"]>;
        Relationships: [];
      };
      subjects: {
        Row: {
          id: string;
          school_id: string;
          name: string;
          code: string | null;
          teacher_id: string | null;
          grade: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["subjects"]["Row"]> & {
          school_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["subjects"]["Row"]>;
        Relationships: [];
      };
      scores: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          subject_id: string;
          assignment_id: string | null;
          score: number;
          max_score: number;
          term: string | null;
          recorded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["scores"]["Row"]> & {
          school_id: string;
          student_id: string;
          subject_id: string;
          score: number;
        };
        Update: Partial<Database["public"]["Tables"]["scores"]["Row"]>;
        Relationships: [
          { foreignKeyName: "scores_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] },
          { foreignKeyName: "scores_subject_id_fkey"; columns: ["subject_id"]; isOneToOne: false; referencedRelation: "subjects"; referencedColumns: ["id"] }
        ];
      };
      health_records: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          height_cm: number | null;
          weight_kg: number | null;
          vision_left: string | null;
          vision_right: string | null;
          allergies: string | null;
          chronic_conditions: string | null;
          notes: string | null;
          recorded_by: string | null;
          recorded_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["health_records"]["Row"]> & {
          school_id: string;
          student_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["health_records"]["Row"]>;
        Relationships: [
          { foreignKeyName: "health_records_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
        ];
      };
      finance_accounts: {
        Row: {
          id: string;
          school_id: string;
          name: string;
          account_type: "classroom_fund" | "school_fund" | "lunch_fund" | "savings" | "other";
          balance: number;
          classroom: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["finance_accounts"]["Row"]> & {
          school_id: string;
          name: string;
          account_type: "classroom_fund" | "school_fund" | "lunch_fund" | "savings" | "other";
        };
        Update: Partial<Database["public"]["Tables"]["finance_accounts"]["Row"]>;
        Relationships: [];
      };
      finance_transactions: {
        Row: {
          id: string;
          school_id: string;
          account_id: string;
          student_id: string | null;
          type: "income" | "expense";
          category: string | null;
          amount: number;
          description: string | null;
          recorded_by: string | null;
          occurred_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["finance_transactions"]["Row"]> & {
          school_id: string;
          account_id: string;
          type: "income" | "expense";
          amount: number;
        };
        Update: Partial<Database["public"]["Tables"]["finance_transactions"]["Row"]>;
        Relationships: [
          { foreignKeyName: "finance_transactions_account_id_fkey"; columns: ["account_id"]; isOneToOne: false; referencedRelation: "finance_accounts"; referencedColumns: ["id"] }
        ];
      };
      meal_records: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          date: string;
          meal_type: "breakfast" | "lunch" | "snack";
          status: "served" | "absent" | "special_diet";
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["meal_records"]["Row"]> & {
          school_id: string;
          student_id: string;
          date: string;
          meal_type: "breakfast" | "lunch" | "snack";
        };
        Update: Partial<Database["public"]["Tables"]["meal_records"]["Row"]>;
        Relationships: [];
      };
      home_visits: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          teacher_id: string | null;
          visit_date: string;
          summary: string | null;
          family_situation: string | null;
          follow_up_required: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["home_visits"]["Row"]> & {
          school_id: string;
          student_id: string;
          visit_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["home_visits"]["Row"]>;
        Relationships: [];
      };
      sdq_assessments: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          assessed_by: string | null;
          assessment_date: string;
          emotional_score: number | null;
          conduct_score: number | null;
          hyperactivity_score: number | null;
          peer_problems_score: number | null;
          prosocial_score: number | null;
          total_difficulties_score: number | null;
          risk_level: "normal" | "borderline" | "abnormal" | null;
          raw_answers: Record<string, number> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["sdq_assessments"]["Row"]> & {
          school_id: string;
          student_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["sdq_assessments"]["Row"]>;
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          school_id: string;
          student_id: string | null;
          uploaded_by: string | null;
          title: string;
          category: string | null;
          file_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["documents"]["Row"]> & {
          school_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Row"]>;
        Relationships: [];
      };
      announcements: {
        Row: {
          id: string;
          school_id: string;
          created_by: string | null;
          title: string;
          body: string;
          audience: "all" | "teachers" | "parents" | "students";
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["announcements"]["Row"]> & {
          school_id: string;
          title: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["announcements"]["Row"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          school_id: string;
          user_id: string;
          title: string;
          body: string | null;
          link: string | null;
          read_at: string | null;
          priority: "low" | "medium" | "high" | "critical";
          category: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & {
          school_id: string;
          user_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
        Relationships: [];
      };
      calendar_events: {
        Row: {
          id: string;
          school_id: string;
          created_by: string | null;
          title: string;
          description: string | null;
          event_type: "exam" | "activity" | "parent_meeting" | "field_trip" | "holiday";
          classroom: string | null;
          starts_at: string;
          ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["calendar_events"]["Row"]> & {
          school_id: string;
          title: string;
          event_type: "exam" | "activity" | "parent_meeting" | "field_trip" | "holiday";
          starts_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["calendar_events"]["Row"]>;
        Relationships: [];
      };
      dashboard_activities: {
        Row: {
          id: string;
          school_id: string;
          actor_id: string | null;
          student_id: string | null;
          activity_type: "attendance" | "xp_award" | "behavior" | "health" | "finance" | "communication" | "academic";
          description: string;
          occurred_at: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["dashboard_activities"]["Row"]> & {
          school_id: string;
          activity_type: "attendance" | "xp_award" | "behavior" | "health" | "finance" | "communication" | "academic";
          description: string;
        };
        Update: Partial<Database["public"]["Tables"]["dashboard_activities"]["Row"]>;
        Relationships: [];
      };
      dashboard_ai_insights: {
        Row: {
          id: string;
          school_id: string;
          teacher_id: string | null;
          insight_type: "attendance_risk" | "academic_risk" | "behavior_trend" | "health_concern" | "intervention";
          severity: "low" | "medium" | "high" | "critical";
          student_id: string | null;
          title: string;
          recommendation: string;
          dismissed_at: string | null;
          generated_at: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["dashboard_ai_insights"]["Row"]> & {
          school_id: string;
          insight_type: "attendance_risk" | "academic_risk" | "behavior_trend" | "health_concern" | "intervention";
          title: string;
          recommendation: string;
        };
        Update: Partial<Database["public"]["Tables"]["dashboard_ai_insights"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

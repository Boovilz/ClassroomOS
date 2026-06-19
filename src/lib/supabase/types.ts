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

export type AttendanceMode =
  | "classroom"
  | "morning_assembly"
  | "subject"
  | "lunch"
  | "activity"
  | "library"
  | "event";

export type AssessmentType = "knowledge" | "process" | "attitude" | "competency" | "characteristic";
export type AssessmentMethod = "quiz" | "exam" | "project" | "observation" | "portfolio" | "performance_task" | "homework";
export type GradebookComponent =
  | "attendance"
  | "homework"
  | "assignment"
  | "quiz"
  | "midterm"
  | "final"
  | "project"
  | "behavior";

export interface RubricLevel {
  label: string;
  points: number;
}

export interface RubricCriterion {
  name: string;
  levels: RubricLevel[];
}

export interface RubricScoreEntry {
  criterion: string;
  levelLabel: string;
  points: number;
}

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
          title: string | null;
          nationality: string | null;
          religion: string | null;
          province: string | null;
          district: string | null;
          subdistrict: string | null;
          postal_code: string | null;
          phone_number: string | null;
          profile_picture_url: string | null;
          student_number: string | null;
          enrollment_date: string | null;
          graduation_status: string | null;
          learning_support_status: string | null;
          scholarship_status: string | null;
          family_income: number | null;
          family_members_count: number | null;
          housing_type: string | null;
          internet_access: boolean | null;
          device_ownership: string | null;
          transportation_method: string | null;
          risk_category: string | null;
          poor_student_program: boolean;
          government_support_programs: string | null;
          risk_level: "low" | "medium" | "high" | null;
          is_archived: boolean;
          emergency_contact_name: string | null;
          emergency_contact_relationship: string | null;
          emergency_contact_phone: string | null;
          behavior_score: number;
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
          income: number | null;
          line_id: string | null;
          address: string | null;
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
      student_avatars: {
        Row: {
          student_id: string;
          equipped_hair: string | null;
          equipped_uniform: string | null;
          equipped_accessory: string | null;
          equipped_background: string | null;
          equipped_frame: string | null;
          unlocked_items: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["student_avatars"]["Row"]> & {
          student_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["student_avatars"]["Row"]>;
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
          mode: AttendanceMode;
          method: "qr" | "manual" | "import";
          approved_by: string | null;
          override_note: string | null;
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
          mode: AttendanceMode;
          result: "success" | "failed" | "duplicate";
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
          payload: string | null;
          issued_for_academic_year: number | null;
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
      qr_scan_history: {
        Row: {
          id: string;
          school_id: string;
          student_id: string | null;
          scanned_by: string | null;
          token_used: string | null;
          mode: AttendanceMode;
          status: "success" | "invalid_token" | "expired_token" | "duplicate" | "error";
          message: string | null;
          device_info: string | null;
          client_scanned_at: string | null;
          synced_at: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["qr_scan_history"]["Row"]> & {
          school_id: string;
          status: "success" | "invalid_token" | "expired_token" | "duplicate" | "error";
        };
        Update: Partial<Database["public"]["Tables"]["qr_scan_history"]["Row"]>;
        Relationships: [];
      };
      attendance_risk_students: {
        Row: {
          student_id: string;
          school_id: string;
          risk_level: "low" | "medium" | "high";
          consecutive_absences: number;
          absences_last_30_days: number;
          late_count_last_30_days: number;
          attendance_rate_percent: number | null;
          reason: string | null;
          computed_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["attendance_risk_students"]["Row"]> & {
          student_id: string;
          school_id: string;
          risk_level: "low" | "medium" | "high";
        };
        Update: Partial<Database["public"]["Tables"]["attendance_risk_students"]["Row"]>;
        Relationships: [];
      };
      attendance_settings: {
        Row: {
          school_id: string;
          present_cutoff_time: string;
          late_cutoff_time: string;
          pending_cutoff_time: string;
          qr_token_ttl_seconds: number;
          risk_absence_threshold: number;
          risk_consecutive_threshold: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["attendance_settings"]["Row"]> & {
          school_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["attendance_settings"]["Row"]>;
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
          evidence_url: string | null;
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
      behavior_categories: {
        Row: {
          id: string;
          school_id: string | null;
          category: "positive" | "negative";
          title: string;
          points: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["behavior_categories"]["Row"]> & {
          category: "positive" | "negative";
          title: string;
          points: number;
        };
        Update: Partial<Database["public"]["Tables"]["behavior_categories"]["Row"]>;
        Relationships: [];
      };
      quests: {
        Row: {
          id: string;
          school_id: string;
          period: "daily" | "weekly" | "monthly";
          title: string;
          description: string | null;
          target_count: number;
          xp_reward: number;
          coin_reward: number;
          badge_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["quests"]["Row"]> & {
          school_id: string;
          period: "daily" | "weekly" | "monthly";
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["quests"]["Row"]>;
        Relationships: [];
      };
      student_quests: {
        Row: {
          id: string;
          student_id: string;
          quest_id: string;
          progress_count: number;
          completed_at: string | null;
          period_start: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["student_quests"]["Row"]> & {
          student_id: string;
          quest_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["student_quests"]["Row"]>;
        Relationships: [
          { foreignKeyName: "student_quests_quest_id_fkey"; columns: ["quest_id"]; isOneToOne: false; referencedRelation: "quests"; referencedColumns: ["id"] }
        ];
      };
      reward_redemptions: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          reward_item_id: string;
          coin_transaction_id: string | null;
          status: "pending" | "fulfilled" | "cancelled";
          redeemed_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["reward_redemptions"]["Row"]> & {
          school_id: string;
          student_id: string;
          reward_item_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["reward_redemptions"]["Row"]>;
        Relationships: [
          { foreignKeyName: "reward_redemptions_reward_item_id_fkey"; columns: ["reward_item_id"]; isOneToOne: false; referencedRelation: "reward_shop_items"; referencedColumns: ["id"] }
        ];
      };
      subjects: {
        Row: {
          id: string;
          school_id: string;
          name: string;
          code: string | null;
          teacher_id: string | null;
          grade: string | null;
          credits: number;
          academic_year: number | null;
          semester: 1 | 2 | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["subjects"]["Row"]> & {
          school_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["subjects"]["Row"]>;
        Relationships: [
          { foreignKeyName: "subjects_teacher_id_fkey"; columns: ["teacher_id"]; isOneToOne: false; referencedRelation: "teachers"; referencedColumns: ["id"] }
        ];
      };
      assignments: {
        Row: {
          id: string;
          school_id: string;
          subject_id: string;
          title: string;
          description: string | null;
          max_score: number;
          due_date: string | null;
          file_url: string | null;
          assessment_type: AssessmentType | null;
          method: AssessmentMethod | null;
          rubric_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["assignments"]["Row"]> & {
          school_id: string;
          subject_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["assignments"]["Row"]>;
        Relationships: [
          { foreignKeyName: "assignments_subject_id_fkey"; columns: ["subject_id"]; isOneToOne: false; referencedRelation: "subjects"; referencedColumns: ["id"] }
        ];
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
          assessment_type: AssessmentType | null;
          method: AssessmentMethod | null;
          component: GradebookComponent | null;
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
      gradebook_weights: {
        Row: {
          id: string;
          school_id: string;
          subject_id: string;
          attendance_weight: number;
          homework_weight: number;
          assignment_weight: number;
          quiz_weight: number;
          midterm_weight: number;
          final_weight: number;
          project_weight: number;
          behavior_weight: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["gradebook_weights"]["Row"]> & {
          school_id: string;
          subject_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["gradebook_weights"]["Row"]>;
        Relationships: [];
      };
      assignment_submissions: {
        Row: {
          id: string;
          school_id: string;
          assignment_id: string;
          student_id: string;
          status: "pending" | "submitted" | "late" | "graded" | "returned";
          file_url: string | null;
          notes: string | null;
          submitted_at: string | null;
          graded_at: string | null;
          score: number | null;
          feedback: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["assignment_submissions"]["Row"]> & {
          school_id: string;
          assignment_id: string;
          student_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["assignment_submissions"]["Row"]>;
        Relationships: [
          { foreignKeyName: "assignment_submissions_assignment_id_fkey"; columns: ["assignment_id"]; isOneToOne: false; referencedRelation: "assignments"; referencedColumns: ["id"] }
        ];
      };
      rubrics: {
        Row: {
          id: string;
          school_id: string;
          subject_id: string;
          title: string;
          criteria: RubricCriterion[];
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["rubrics"]["Row"]> & {
          school_id: string;
          subject_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["rubrics"]["Row"]>;
        Relationships: [];
      };
      rubric_scores: {
        Row: {
          id: string;
          school_id: string;
          rubric_id: string;
          student_id: string;
          assignment_id: string | null;
          scores: RubricScoreEntry[];
          total_score: number;
          scored_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["rubric_scores"]["Row"]> & {
          school_id: string;
          rubric_id: string;
          student_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["rubric_scores"]["Row"]>;
        Relationships: [
          { foreignKeyName: "rubric_scores_rubric_id_fkey"; columns: ["rubric_id"]; isOneToOne: false; referencedRelation: "rubrics"; referencedColumns: ["id"] }
        ];
      };
      learning_standards: {
        Row: {
          id: string;
          school_id: string;
          subject_id: string;
          code: string;
          description: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["learning_standards"]["Row"]> & {
          school_id: string;
          subject_id: string;
          code: string;
          description: string;
        };
        Update: Partial<Database["public"]["Tables"]["learning_standards"]["Row"]>;
        Relationships: [
          { foreignKeyName: "learning_standards_subject_id_fkey"; columns: ["subject_id"]; isOneToOne: false; referencedRelation: "subjects"; referencedColumns: ["id"] }
        ];
      };
      learning_outcomes: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          standard_id: string;
          status: "achieved" | "partially_achieved" | "needs_improvement";
          assessed_at: string;
          assessed_by: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["learning_outcomes"]["Row"]> & {
          school_id: string;
          student_id: string;
          standard_id: string;
          status: "achieved" | "partially_achieved" | "needs_improvement";
        };
        Update: Partial<Database["public"]["Tables"]["learning_outcomes"]["Row"]>;
        Relationships: [
          { foreignKeyName: "learning_outcomes_standard_id_fkey"; columns: ["standard_id"]; isOneToOne: false; referencedRelation: "learning_standards"; referencedColumns: ["id"] }
        ];
      };
      academic_certificates: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          template_type: "graduation" | "honor_roll" | "perfect_attendance" | "subject_excellence" | "completion" | "other";
          title: string;
          description: string | null;
          issued_at: string;
          issued_by: string | null;
          file_url: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["academic_certificates"]["Row"]> & {
          school_id: string;
          student_id: string;
          template_type: "graduation" | "honor_roll" | "perfect_attendance" | "subject_excellence" | "completion" | "other";
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["academic_certificates"]["Row"]>;
        Relationships: [
          { foreignKeyName: "academic_certificates_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
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
          student_id: string | null;
          account_number: string | null;
          status: "active" | "frozen" | "closed";
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["finance_accounts"]["Row"]> & {
          school_id: string;
          name: string;
          account_type: "classroom_fund" | "school_fund" | "lunch_fund" | "savings" | "other";
        };
        Update: Partial<Database["public"]["Tables"]["finance_accounts"]["Row"]>;
        Relationships: [
          { foreignKeyName: "finance_accounts_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
        ];
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
          transaction_no: string | null;
          balance_after: number | null;
          status: "pending" | "completed" | "rejected" | "cancelled";
          txn_subtype: "deposit" | "withdrawal" | "expense" | "donation" | "fund_income" | null;
          approved_by: string | null;
          approved_at: string | null;
          rejection_reason: string | null;
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
      finance_categories: {
        Row: {
          id: string;
          school_id: string | null;
          kind: "income" | "expense";
          name: string;
          icon: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["finance_categories"]["Row"]> & {
          kind: "income" | "expense";
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["finance_categories"]["Row"]>;
        Relationships: [];
      };
      finance_expenses: {
        Row: {
          id: string;
          school_id: string;
          account_id: string;
          category_id: string | null;
          finance_transaction_id: string | null;
          name: string;
          amount: number;
          expense_date: string;
          receipt_url: string | null;
          description: string | null;
          requested_by: string | null;
          approved_by: string | null;
          approved_at: string | null;
          status: "pending" | "approved" | "rejected";
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["finance_expenses"]["Row"]> & {
          school_id: string;
          account_id: string;
          name: string;
          amount: number;
        };
        Update: Partial<Database["public"]["Tables"]["finance_expenses"]["Row"]>;
        Relationships: [
          { foreignKeyName: "finance_expenses_account_id_fkey"; columns: ["account_id"]; isOneToOne: false; referencedRelation: "finance_accounts"; referencedColumns: ["id"] },
          { foreignKeyName: "finance_expenses_category_id_fkey"; columns: ["category_id"]; isOneToOne: false; referencedRelation: "finance_categories"; referencedColumns: ["id"] }
        ];
      };
      finance_receipts: {
        Row: {
          id: string;
          school_id: string;
          receipt_no: string;
          receipt_type: "deposit" | "withdrawal" | "expense" | "donation";
          finance_transaction_id: string | null;
          finance_expense_id: string | null;
          issued_to: string | null;
          amount: number;
          verification_code: string;
          issued_by: string | null;
          issued_at: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["finance_receipts"]["Row"]> & {
          school_id: string;
          receipt_no: string;
          receipt_type: "deposit" | "withdrawal" | "expense" | "donation";
          amount: number;
          verification_code: string;
        };
        Update: Partial<Database["public"]["Tables"]["finance_receipts"]["Row"]>;
        Relationships: [
          { foreignKeyName: "finance_receipts_finance_transaction_id_fkey"; columns: ["finance_transaction_id"]; isOneToOne: false; referencedRelation: "finance_transactions"; referencedColumns: ["id"] }
        ];
      };
      finance_qr_payments: {
        Row: {
          id: string;
          school_id: string;
          purpose: "school_activity" | "fundraising" | "donation" | "field_trip" | "other";
          title: string;
          description: string | null;
          qr_type: "static" | "dynamic";
          target_amount: number | null;
          amount: number | null;
          payload: string;
          status: "active" | "paid" | "expired" | "cancelled";
          created_by: string | null;
          paid_at: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["finance_qr_payments"]["Row"]> & {
          school_id: string;
          purpose: "school_activity" | "fundraising" | "donation" | "field_trip" | "other";
          title: string;
          payload: string;
        };
        Update: Partial<Database["public"]["Tables"]["finance_qr_payments"]["Row"]>;
        Relationships: [];
      };
      finance_goals: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          account_id: string | null;
          title: string;
          target_amount: number;
          current_amount: number;
          target_date: string | null;
          status: "active" | "achieved" | "cancelled";
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["finance_goals"]["Row"]> & {
          school_id: string;
          student_id: string;
          title: string;
          target_amount: number;
        };
        Update: Partial<Database["public"]["Tables"]["finance_goals"]["Row"]>;
        Relationships: [
          { foreignKeyName: "finance_goals_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
        ];
      };
      finance_goal_progress: {
        Row: {
          id: string;
          goal_id: string;
          finance_transaction_id: string | null;
          amount: number;
          recorded_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["finance_goal_progress"]["Row"]> & {
          goal_id: string;
          amount: number;
        };
        Update: Partial<Database["public"]["Tables"]["finance_goal_progress"]["Row"]>;
        Relationships: [
          { foreignKeyName: "finance_goal_progress_goal_id_fkey"; columns: ["goal_id"]; isOneToOne: false; referencedRelation: "finance_goals"; referencedColumns: ["id"] }
        ];
      };
      finance_audit_logs: {
        Row: {
          id: string;
          school_id: string;
          actor_id: string | null;
          action: "create" | "update" | "delete" | "approve" | "reject";
          entity_type: string;
          entity_id: string | null;
          details: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["finance_audit_logs"]["Row"]> & {
          school_id: string;
          action: "create" | "update" | "delete" | "approve" | "reject";
          entity_type: string;
        };
        Update: Partial<Database["public"]["Tables"]["finance_audit_logs"]["Row"]>;
        Relationships: [];
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

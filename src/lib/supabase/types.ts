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

export type Role =
  | "super_admin"
  | "school_admin"
  | "teacher"
  | "parent"
  | "student"
  | "principal"
  | "homeroom_teacher"
  | "finance_officer"
  | "health_officer"
  | "guidance_teacher";

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
          plan: "free" | "school_standard" | "school_pro" | "district_enterprise";
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
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
          deleted_at: string | null;
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
          deleted_at: string | null;
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
          poverty_risk_score: number | null;
          last_home_visit_at: string | null;
          welfare_status: "normal" | "monitoring" | "needs_support" | "critical" | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
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
          education_level: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
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
          bmi: number | null;
          nutrition_status: "severely_underweight" | "underweight" | "normal" | "overweight" | "obese" | null;
          vision_screening_result: string | null;
          remarks: string | null;
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
      vaccinations: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          vaccine_name: string;
          dose_number: number | null;
          administered_at: string | null;
          next_due_at: string | null;
          notes: string | null;
          status: "scheduled" | "completed" | "overdue" | "exempted";
          hospital: string | null;
          recorded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["vaccinations"]["Row"]> & {
          school_id: string;
          student_id: string;
          vaccine_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["vaccinations"]["Row"]>;
        Relationships: [
          { foreignKeyName: "vaccinations_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
        ];
      };
      vaccination_schedules: {
        Row: {
          id: string;
          school_id: string | null;
          vaccine_name: string;
          dose_number: number;
          recommended_age_months: number | null;
          is_required: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["vaccination_schedules"]["Row"]> & {
          vaccine_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["vaccination_schedules"]["Row"]>;
        Relationships: [];
      };
      medical_conditions: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          condition_type: "chronic" | "congenital" | "physical_disability" | "learning_disability" | "mental_health";
          name: string;
          severity: "mild" | "moderate" | "severe";
          diagnosed_date: string | null;
          notes: string | null;
          care_instructions: string | null;
          is_active: boolean;
          recorded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["medical_conditions"]["Row"]> & {
          school_id: string;
          student_id: string;
          condition_type: "chronic" | "congenital" | "physical_disability" | "learning_disability" | "mental_health";
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["medical_conditions"]["Row"]>;
        Relationships: [
          { foreignKeyName: "medical_conditions_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
        ];
      };
      allergies: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          allergy_type: "food" | "drug" | "environmental" | "religious" | "medical_diet" | "nutrition_plan";
          allergen: string;
          severity: "mild" | "moderate" | "severe" | "life_threatening";
          reaction: string | null;
          emergency_instructions: string | null;
          is_active: boolean;
          recorded_by: string | null;
          diet_label: string | null;
          show_at_meal_distribution: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["allergies"]["Row"]> & {
          school_id: string;
          student_id: string;
          allergy_type: "food" | "drug" | "environmental" | "religious" | "medical_diet" | "nutrition_plan";
          allergen: string;
        };
        Update: Partial<Database["public"]["Tables"]["allergies"]["Row"]>;
        Relationships: [
          { foreignKeyName: "allergies_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
        ];
      };
      health_screenings: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          screening_type: "vision" | "hearing" | "dental" | "physical" | "mental_health";
          screening_date: string;
          result: "pass" | "monitor" | "refer";
          findings: string | null;
          recommendation: string | null;
          next_screening_date: string | null;
          recorded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["health_screenings"]["Row"]> & {
          school_id: string;
          student_id: string;
          screening_type: "vision" | "hearing" | "dental" | "physical" | "mental_health";
          result: "pass" | "monitor" | "refer";
        };
        Update: Partial<Database["public"]["Tables"]["health_screenings"]["Row"]>;
        Relationships: [
          { foreignKeyName: "health_screenings_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
        ];
      };
      dental_records: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          checkup_date: string;
          tooth_decay_count: number;
          oral_hygiene_status: "good" | "fair" | "poor";
          treatment_needed: string | null;
          treatment_completed: boolean;
          notes: string | null;
          recorded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["dental_records"]["Row"]> & {
          school_id: string;
          student_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["dental_records"]["Row"]>;
        Relationships: [
          { foreignKeyName: "dental_records_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
        ];
      };
      medications: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          medication_name: string;
          dosage: string | null;
          schedule: string | null;
          prescribing_doctor: string | null;
          instructions: string | null;
          start_date: string | null;
          end_date: string | null;
          is_active: boolean;
          special_care_notes: string | null;
          recorded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["medications"]["Row"]> & {
          school_id: string;
          student_id: string;
          medication_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["medications"]["Row"]>;
        Relationships: [
          { foreignKeyName: "medications_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
        ];
      };
      health_alerts: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          alert_type: "missing_record" | "vaccination_due" | "bmi_risk" | "medical_condition_risk" | "screening_due" | "allergy_alert";
          severity: "low" | "medium" | "high" | "critical";
          message: string;
          is_resolved: boolean;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["health_alerts"]["Row"]> & {
          school_id: string;
          student_id: string;
          alert_type: "missing_record" | "vaccination_due" | "bmi_risk" | "medical_condition_risk" | "screening_due" | "allergy_alert";
          message: string;
        };
        Update: Partial<Database["public"]["Tables"]["health_alerts"]["Row"]>;
        Relationships: [
          { foreignKeyName: "health_alerts_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
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
      audit_logs: {
        Row: {
          id: string;
          school_id: string | null;
          actor_id: string | null;
          action: string;
          entity_table: string | null;
          entity_id: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]> & {
          action: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]>;
        Relationships: [];
      };
      role_permissions: {
        Row: {
          id: string;
          school_id: string | null;
          role: Role;
          permission_key: string;
          allowed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["role_permissions"]["Row"]> & {
          role: Role;
          permission_key: string;
        };
        Update: Partial<Database["public"]["Tables"]["role_permissions"]["Row"]>;
        Relationships: [];
      };
      system_settings: {
        Row: {
          id: string;
          school_id: string;
          category: string;
          settings: Record<string, unknown>;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["system_settings"]["Row"]> & {
          school_id: string;
          category: string;
        };
        Update: Partial<Database["public"]["Tables"]["system_settings"]["Row"]>;
        Relationships: [];
      };
      login_logs: {
        Row: {
          id: string;
          school_id: string | null;
          user_id: string | null;
          success: boolean;
          ip_address: string | null;
          user_agent: string | null;
          failure_reason: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["login_logs"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["login_logs"]["Row"]>;
        Relationships: [];
      };
      api_keys: {
        Row: {
          id: string;
          school_id: string;
          provider: string;
          config: Record<string, unknown>;
          secret_ciphertext: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["api_keys"]["Row"]> & {
          school_id: string;
          provider: string;
        };
        Update: Partial<Database["public"]["Tables"]["api_keys"]["Row"]>;
        Relationships: [];
      };
      backup_jobs: {
        Row: {
          id: string;
          school_id: string | null;
          job_type: string;
          direction: string;
          target: string;
          status: string;
          file_path: string | null;
          row_counts: Record<string, number> | null;
          error_message: string | null;
          created_by: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["backup_jobs"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["backup_jobs"]["Row"]>;
        Relationships: [];
      };
      theme_settings: {
        Row: {
          id: string;
          school_id: string;
          primary_color: string;
          secondary_color: string;
          logo_url: string | null;
          favicon_url: string | null;
          login_background_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["theme_settings"]["Row"]> & { school_id: string };
        Update: Partial<Database["public"]["Tables"]["theme_settings"]["Row"]>;
        Relationships: [];
      };
      api_usage_logs: {
        Row: {
          id: string;
          school_id: string | null;
          route: string;
          kind: string;
          input_tokens: number | null;
          output_tokens: number | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["api_usage_logs"]["Row"]> & { route: string };
        Update: Partial<Database["public"]["Tables"]["api_usage_logs"]["Row"]>;
        Relationships: [];
      };
      school_quotas: {
        Row: {
          school_id: string;
          max_students: number;
          max_teachers: number;
          max_storage_mb: number;
          ai_credits_per_month: number;
          ai_credits_used_this_month: number;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["school_quotas"]["Row"]> & { school_id: string };
        Update: Partial<Database["public"]["Tables"]["school_quotas"]["Row"]>;
        Relationships: [
          { foreignKeyName: "school_quotas_school_id_fkey"; columns: ["school_id"]; isOneToOne: true; referencedRelation: "schools"; referencedColumns: ["id"] }
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
          menu_id: string | null;
          distribution_method: "qr" | "student_id" | "manual";
          distributed_by: string | null;
          eligibility_status_snapshot: string | null;
          cost: number | null;
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
        Relationships: [
          { foreignKeyName: "meal_records_menu_id_fkey"; columns: ["menu_id"]; isOneToOne: false; referencedRelation: "menus"; referencedColumns: ["id"] }
        ];
      };
      menus: {
        Row: {
          id: string;
          school_id: string;
          name: string;
          menu_date: string;
          meal_type: "breakfast" | "lunch" | "snack";
          plan_scope: "daily" | "weekly" | "monthly" | "semester";
          description: string | null;
          image_url: string | null;
          total_calories: number | null;
          total_protein_g: number | null;
          total_carbs_g: number | null;
          total_fat_g: number | null;
          estimated_cost_per_student: number | null;
          status: "planned" | "published" | "served" | "cancelled";
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["menus"]["Row"]> & {
          school_id: string;
          name: string;
          menu_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["menus"]["Row"]>;
        Relationships: [];
      };
      menu_items: {
        Row: {
          id: string;
          school_id: string;
          menu_id: string;
          name: string;
          category: "rice" | "noodle" | "soup" | "dessert" | "fruit" | "milk";
          ingredients: string | null;
          calories: number | null;
          protein_g: number | null;
          carbs_g: number | null;
          fat_g: number | null;
          has_vegetables: boolean;
          has_fruit: boolean;
          has_milk: boolean;
          image_url: string | null;
          cost_per_serving: number | null;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["menu_items"]["Row"]> & {
          school_id: string;
          menu_id: string;
          name: string;
          category: "rice" | "noodle" | "soup" | "dessert" | "fruit" | "milk";
        };
        Update: Partial<Database["public"]["Tables"]["menu_items"]["Row"]>;
        Relationships: [
          { foreignKeyName: "menu_items_menu_id_fkey"; columns: ["menu_id"]; isOneToOne: false; referencedRelation: "menus"; referencedColumns: ["id"] }
        ];
      };
      meal_eligibility: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          program_type: "free_lunch" | "special_support" | "scholarship" | "paid";
          status: "eligible" | "not_eligible" | "pending_review";
          meal_restrictions: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          effective_from: string;
          effective_to: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["meal_eligibility"]["Row"]> & {
          school_id: string;
          student_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["meal_eligibility"]["Row"]>;
        Relationships: [
          { foreignKeyName: "meal_eligibility_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
        ];
      };
      food_inventory: {
        Row: {
          id: string;
          school_id: string;
          item_name: string;
          category: "ingredient" | "supply" | "kitchen_material";
          quantity: number;
          unit: string;
          reorder_level: number;
          purchase_date: string | null;
          expiration_date: string | null;
          supplier_id: string | null;
          unit_cost: number | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["food_inventory"]["Row"]> & {
          school_id: string;
          item_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["food_inventory"]["Row"]>;
        Relationships: [
          { foreignKeyName: "food_inventory_supplier_id_fkey"; columns: ["supplier_id"]; isOneToOne: false; referencedRelation: "food_suppliers"; referencedColumns: ["id"] }
        ];
      };
      inventory_transactions: {
        Row: {
          id: string;
          school_id: string;
          inventory_id: string;
          txn_type: "add" | "remove" | "adjust" | "transfer" | "audit";
          quantity_change: number;
          quantity_after: number;
          reason: string | null;
          recorded_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["inventory_transactions"]["Row"]> & {
          school_id: string;
          inventory_id: string;
          txn_type: "add" | "remove" | "adjust" | "transfer" | "audit";
          quantity_change: number;
          quantity_after: number;
        };
        Update: Partial<Database["public"]["Tables"]["inventory_transactions"]["Row"]>;
        Relationships: [
          { foreignKeyName: "inventory_transactions_inventory_id_fkey"; columns: ["inventory_id"]; isOneToOne: false; referencedRelation: "food_inventory"; referencedColumns: ["id"] }
        ];
      };
      food_suppliers: {
        Row: {
          id: string;
          school_id: string;
          name: string;
          contact_name: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["food_suppliers"]["Row"]> & {
          school_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["food_suppliers"]["Row"]>;
        Relationships: [];
      };
      purchase_orders: {
        Row: {
          id: string;
          school_id: string;
          supplier_id: string;
          order_no: string;
          item_summary: string | null;
          total_amount: number;
          status: "draft" | "ordered" | "delivered" | "invoiced" | "paid" | "cancelled";
          ordered_at: string;
          expected_delivery_date: string | null;
          delivered_at: string | null;
          finance_expense_id: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["purchase_orders"]["Row"]> & {
          school_id: string;
          supplier_id: string;
          order_no: string;
        };
        Update: Partial<Database["public"]["Tables"]["purchase_orders"]["Row"]>;
        Relationships: [
          { foreignKeyName: "purchase_orders_supplier_id_fkey"; columns: ["supplier_id"]; isOneToOne: false; referencedRelation: "food_suppliers"; referencedColumns: ["id"] }
        ];
      };
      food_safety_logs: {
        Row: {
          id: string;
          school_id: string;
          log_type: "inspection" | "hygiene" | "equipment_maintenance" | "temperature" | "cleaning_schedule";
          log_date: string;
          subject: string;
          result: "pass" | "fail" | "needs_attention" | null;
          temperature_celsius: number | null;
          notes: string | null;
          recorded_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["food_safety_logs"]["Row"]> & {
          school_id: string;
          log_type: "inspection" | "hygiene" | "equipment_maintenance" | "temperature" | "cleaning_schedule";
          subject: string;
        };
        Update: Partial<Database["public"]["Tables"]["food_safety_logs"]["Row"]>;
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
          visit_time: string | null;
          visit_type: "routine" | "follow_up" | "emergency" | "poverty_screening" | "welfare_check";
          purpose: string | null;
          outcome: string | null;
          duration_minutes: number | null;
          status: "scheduled" | "completed" | "cancelled" | "rescheduled";
          latitude: number | null;
          longitude: number | null;
          maps_url: string | null;
          economic_status: string | null;
          educational_support: string | null;
          family_support: string | null;
          health_status_note: string | null;
          behavior_concerns: string | null;
          attendance_concerns: string | null;
          academic_concerns: string | null;
          created_by: string | null;
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
          risk_level: "normal" | "borderline" | "at_risk" | "high_risk" | "critical" | null;
          raw_answers: Record<string, number> | null;
          assessment_type: "teacher" | "parent" | "student";
          assessment_period: "beginning_of_semester" | "mid_semester" | "end_of_semester" | "custom";
          status: "pending" | "in_progress" | "completed" | "cancelled";
          assigned_to_user_id: string | null;
          assigned_to_parent_id: string | null;
          submitted_at: string | null;
          created_by: string | null;
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
          home_visit_id: string | null;
          shared_with_parent_id: string | null;
          acknowledged_at: string | null;
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
      document_templates: {
        Row: {
          id: string;
          school_id: string;
          name: string;
          description: string | null;
          category: string;
          storage_path: string;
          fields: string[];
          version: number;
          status: "active" | "archived";
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["document_templates"]["Row"]> & {
          school_id: string;
          name: string;
          category: string;
          storage_path: string;
        };
        Update: Partial<Database["public"]["Tables"]["document_templates"]["Row"]>;
        Relationships: [];
      };
      generated_documents: {
        Row: {
          id: string;
          school_id: string;
          template_id: string;
          student_id: string | null;
          storage_path: string;
          file_name: string;
          generated_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["generated_documents"]["Row"]> & {
          school_id: string;
          template_id: string;
          storage_path: string;
          file_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["generated_documents"]["Row"]>;
        Relationships: [
          { foreignKeyName: "generated_documents_template_id_fkey"; columns: ["template_id"]; isOneToOne: false; referencedRelation: "document_templates"; referencedColumns: ["id"] },
          { foreignKeyName: "generated_documents_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
        ];
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
          category: "general" | "school_activity" | "examination" | "meeting" | "homework" | "urgent";
          scheduled_at: string | null;
          attachment_urls: string[] | null;
          target_classrooms: string[] | null;
          target_parent_ids: string[] | null;
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
          channel: "in_app" | "simulated_line" | "email_stub" | "sms_stub";
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
      home_visit_photos: {
        Row: {
          id: string;
          school_id: string;
          home_visit_id: string;
          photo_url: string;
          category: "house" | "study_area" | "family" | "other";
          caption: string | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["home_visit_photos"]["Row"]> & {
          school_id: string;
          home_visit_id: string;
          photo_url: string;
        };
        Update: Partial<Database["public"]["Tables"]["home_visit_photos"]["Row"]>;
        Relationships: [];
      };
      household_profiles: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          housing_ownership: "owned" | "rented" | "relative_owned" | "temporary" | "homeless" | null;
          utilities_access: boolean | null;
          housing_quality: "excellent" | "good" | "fair" | "needs_support" | null;
          sleeping_arrangement: "excellent" | "good" | "fair" | "needs_support" | null;
          study_environment: "excellent" | "good" | "fair" | "needs_support" | null;
          electricity_water_access: "excellent" | "good" | "fair" | "needs_support" | null;
          sanitation_condition: "excellent" | "good" | "fair" | "needs_support" | null;
          safety_condition: "excellent" | "good" | "fair" | "needs_support" | null;
          family_size: number | null;
          household_assets: string | null;
          government_assistance_received: string | null;
          assessed_by: string | null;
          assessed_at: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["household_profiles"]["Row"]> & {
          school_id: string;
          student_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["household_profiles"]["Row"]>;
        Relationships: [];
      };
      family_members: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          full_name: string;
          relationship: string;
          occupation: string | null;
          monthly_income: number | null;
          education_level: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["family_members"]["Row"]> & {
          school_id: string;
          student_id: string;
          full_name: string;
          relationship: string;
        };
        Update: Partial<Database["public"]["Tables"]["family_members"]["Row"]>;
        Relationships: [];
      };
      assistance_programs: {
        Row: {
          id: string;
          school_id: string;
          name: string;
          program_type: "scholarship" | "educational_grant" | "emergency_assistance" | "uniform_support" | "learning_materials";
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["assistance_programs"]["Row"]> & {
          school_id: string;
          name: string;
          program_type: "scholarship" | "educational_grant" | "emergency_assistance" | "uniform_support" | "learning_materials";
        };
        Update: Partial<Database["public"]["Tables"]["assistance_programs"]["Row"]>;
        Relationships: [];
      };
      student_assistance: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          program_id: string;
          status: "eligible" | "not_eligible" | "pending_review" | "enrolled";
          amount: number | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["student_assistance"]["Row"]> & {
          school_id: string;
          student_id: string;
          program_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["student_assistance"]["Row"]>;
        Relationships: [
          { foreignKeyName: "student_assistance_program_id_fkey"; columns: ["program_id"]; isOneToOne: false; referencedRelation: "assistance_programs"; referencedColumns: ["id"] }
        ];
      };
      intervention_plans: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          case_id: string | null;
          plan_type: "support_plan" | "improvement_plan" | "follow_up_action";
          title: string;
          description: string | null;
          responsible_staff: string | null;
          status: "open" | "in_progress" | "completed" | "cancelled";
          start_date: string;
          target_completion_date: string | null;
          completed_at: string | null;
          progress_notes: string | null;
          created_by: string | null;
          sdq_assessment_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["intervention_plans"]["Row"]> & {
          school_id: string;
          student_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["intervention_plans"]["Row"]>;
        Relationships: [];
      };
      student_cases: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          title: string;
          concern_type: "welfare" | "academic" | "behavior" | "attendance" | "health" | "family";
          description: string | null;
          status: "open" | "monitoring" | "improving" | "resolved" | "closed";
          opened_by: string | null;
          assigned_to: string | null;
          resolved_at: string | null;
          resolution_notes: string | null;
          sdq_assessment_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["student_cases"]["Row"]> & {
          school_id: string;
          student_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["student_cases"]["Row"]>;
        Relationships: [];
      };
      parent_communications: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          case_id: string | null;
          home_visit_id: string | null;
          communication_type: "meeting" | "phone_call" | "line_message" | "home_visit_discussion" | "agreement";
          summary: string;
          agreements: string | null;
          follow_up_action: string | null;
          follow_up_date: string | null;
          communicated_by: string | null;
          occurred_at: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["parent_communications"]["Row"]> & {
          school_id: string;
          student_id: string;
          summary: string;
        };
        Update: Partial<Database["public"]["Tables"]["parent_communications"]["Row"]>;
        Relationships: [];
      };
      sdq_questions: {
        Row: {
          id: string;
          item_no: number;
          subscale: "emotional" | "conduct" | "hyperactivity" | "peer_problems" | "prosocial";
          question_text_th: string;
          is_reverse_scored: boolean;
          display_order: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["sdq_questions"]["Row"]> & {
          item_no: number;
          subscale: "emotional" | "conduct" | "hyperactivity" | "peer_problems" | "prosocial";
          question_text_th: string;
          display_order: number;
        };
        Update: Partial<Database["public"]["Tables"]["sdq_questions"]["Row"]>;
        Relationships: [];
      };
      sdq_responses: {
        Row: {
          id: string;
          school_id: string;
          assessment_id: string;
          question_id: string;
          answer_value: 0 | 1 | 2;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["sdq_responses"]["Row"]> & {
          school_id: string;
          assessment_id: string;
          question_id: string;
          answer_value: 0 | 1 | 2;
        };
        Update: Partial<Database["public"]["Tables"]["sdq_responses"]["Row"]>;
        Relationships: [];
      };
      sdq_scores: {
        Row: {
          id: string;
          school_id: string;
          assessment_id: string;
          student_id: string;
          emotional_score: number;
          conduct_score: number;
          hyperactivity_score: number;
          peer_problems_score: number;
          prosocial_score: number;
          total_difficulties_score: number;
          risk_level: "normal" | "borderline" | "at_risk" | "high_risk" | "critical";
          computed_at: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["sdq_scores"]["Row"]> & {
          school_id: string;
          assessment_id: string;
          student_id: string;
          emotional_score: number;
          conduct_score: number;
          hyperactivity_score: number;
          peer_problems_score: number;
          prosocial_score: number;
          total_difficulties_score: number;
          risk_level: "normal" | "borderline" | "at_risk" | "high_risk" | "critical";
        };
        Update: Partial<Database["public"]["Tables"]["sdq_scores"]["Row"]>;
        Relationships: [];
      };
      // ----------------------------------------------------------------------
      // Module 11 - Parent Communication & LINE OA (simulated). See
      // supabase/migrations/20250101000020_communication_line_oa.sql header
      // for the full reuse-vs-new rationale.
      // ----------------------------------------------------------------------
      line_users: {
        Row: {
          id: string;
          school_id: string;
          parent_id: string;
          line_user_id: string;
          display_name: string | null;
          linking_code: string;
          verification_status: "pending" | "verified" | "revoked";
          notifications_enabled: boolean;
          linked_at: string | null;
          consent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["line_users"]["Row"]> & {
          school_id: string;
          parent_id: string;
          line_user_id: string;
          linking_code: string;
        };
        Update: Partial<Database["public"]["Tables"]["line_users"]["Row"]>;
        Relationships: [];
      };
      announcement_recipients: {
        Row: {
          id: string;
          school_id: string;
          announcement_id: string;
          parent_id: string | null;
          user_id: string | null;
          delivery_status: "queued" | "simulated" | "delivered" | "failed";
          read_at: string | null;
          acknowledged_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["announcement_recipients"]["Row"]> & {
          school_id: string;
          announcement_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["announcement_recipients"]["Row"]>;
        Relationships: [];
      };
      message_threads: {
        Row: {
          id: string;
          school_id: string;
          thread_type: "direct" | "class_group" | "broadcast";
          title: string | null;
          classroom: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["message_threads"]["Row"]> & {
          school_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["message_threads"]["Row"]>;
        Relationships: [];
      };
      message_thread_participants: {
        Row: {
          id: string;
          thread_id: string;
          user_id: string | null;
          parent_id: string | null;
          joined_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["message_thread_participants"]["Row"]> & {
          thread_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["message_thread_participants"]["Row"]>;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          school_id: string;
          thread_id: string;
          sender_user_id: string | null;
          sender_parent_id: string | null;
          body: string;
          is_quick_reply: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["messages"]["Row"]> & {
          school_id: string;
          thread_id: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Row"]>;
        Relationships: [];
      };
      message_attachments: {
        Row: {
          id: string;
          message_id: string;
          file_url: string;
          file_type: "image" | "file";
          file_name: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["message_attachments"]["Row"]> & {
          message_id: string;
          file_url: string;
        };
        Update: Partial<Database["public"]["Tables"]["message_attachments"]["Row"]>;
        Relationships: [];
      };
      message_read_receipts: {
        Row: {
          id: string;
          message_id: string;
          user_id: string | null;
          parent_id: string | null;
          read_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["message_read_receipts"]["Row"]> & {
          message_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["message_read_receipts"]["Row"]>;
        Relationships: [];
      };
      notification_templates: {
        Row: {
          id: string;
          school_id: string | null;
          template_type:
            | "attendance_alert"
            | "late_arrival"
            | "homework_reminder"
            | "exam_announcement"
            | "behavior_update"
            | "parent_meeting_invitation"
            | "emergency_notice"
            | "custom";
          title: string;
          body_template: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notification_templates"]["Row"]> & {
          template_type:
            | "attendance_alert"
            | "late_arrival"
            | "homework_reminder"
            | "exam_announcement"
            | "behavior_update"
            | "parent_meeting_invitation"
            | "emergency_notice"
            | "custom";
          title: string;
          body_template: string;
        };
        Update: Partial<Database["public"]["Tables"]["notification_templates"]["Row"]>;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          school_id: string;
          created_by: string | null;
          title: string;
          description: string | null;
          event_category: "parent_meeting" | "school_activity" | "event" | "workshop";
          classroom: string | null;
          location: string | null;
          starts_at: string;
          ends_at: string | null;
          reminder_sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["events"]["Row"]> & {
          school_id: string;
          title: string;
          starts_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Row"]>;
        Relationships: [];
      };
      event_rsvps: {
        Row: {
          id: string;
          school_id: string;
          event_id: string;
          parent_id: string | null;
          user_id: string | null;
          rsvp_status: "pending" | "attending" | "declined" | "maybe";
          attended: boolean | null;
          responded_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["event_rsvps"]["Row"]> & {
          school_id: string;
          event_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["event_rsvps"]["Row"]>;
        Relationships: [];
      };
      parent_surveys: {
        Row: {
          id: string;
          school_id: string;
          created_by: string | null;
          title: string;
          description: string | null;
          survey_type: "satisfaction" | "feedback" | "poll" | "vote";
          is_anonymous: boolean;
          status: "draft" | "open" | "closed";
          opens_at: string | null;
          closes_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["parent_surveys"]["Row"]> & {
          school_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["parent_surveys"]["Row"]>;
        Relationships: [];
      };
      survey_questions: {
        Row: {
          id: string;
          survey_id: string;
          question_text: string;
          question_type: "rating" | "single_choice" | "multiple_choice" | "text";
          options: unknown;
          display_order: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["survey_questions"]["Row"]> & {
          survey_id: string;
          question_text: string;
        };
        Update: Partial<Database["public"]["Tables"]["survey_questions"]["Row"]>;
        Relationships: [];
      };
      survey_responses: {
        Row: {
          id: string;
          school_id: string;
          survey_id: string;
          parent_id: string | null;
          submitted_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["survey_responses"]["Row"]> & {
          school_id: string;
          survey_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["survey_responses"]["Row"]>;
        Relationships: [];
      };
      survey_answers: {
        Row: {
          id: string;
          response_id: string;
          question_id: string;
          answer_value: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["survey_answers"]["Row"]> & {
          response_id: string;
          question_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["survey_answers"]["Row"]>;
        Relationships: [];
      };
      communication_logs: {
        Row: {
          id: string;
          school_id: string;
          actor_id: string | null;
          channel: "in_app" | "simulated_line" | "email_stub" | "sms_stub";
          message_type: "announcement" | "message" | "notification" | "event_reminder" | "survey_invite" | "document_share";
          recipient_parent_id: string | null;
          recipient_user_id: string | null;
          reference_table: string | null;
          reference_id: string | null;
          status: "queued" | "simulated" | "delivered" | "failed";
          detail: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["communication_logs"]["Row"]> & {
          school_id: string;
          channel: "in_app" | "simulated_line" | "email_stub" | "sms_stub";
          message_type: "announcement" | "message" | "notification" | "event_reminder" | "survey_invite" | "document_share";
        };
        Update: Partial<Database["public"]["Tables"]["communication_logs"]["Row"]>;
        Relationships: [];
      };
      // ======================================================================
      // Module 12 - AI Teacher Assistant (Claude-powered chat/insights/RAG)
      // ======================================================================
      ai_conversations: {
        Row: {
          id: string;
          school_id: string;
          user_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ai_conversations"]["Row"]> & {
          school_id: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_conversations"]["Row"]>;
        Relationships: [];
      };
      ai_messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          input_tokens: number | null;
          output_tokens: number | null;
          model: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ai_messages"]["Row"]> & {
          conversation_id: string;
          role: "user" | "assistant" | "system";
          content: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_messages"]["Row"]>;
        Relationships: [];
      };
      ai_generated_content: {
        Row: {
          id: string;
          school_id: string;
          student_id: string | null;
          content_type:
            | "insight"
            | "recommendation"
            | "alert"
            | "report"
            | "document"
            | "certificate_text"
            | "message_draft"
            | "lesson_plan"
            | "workflow_run";
          domain: string | null;
          title: string;
          content: string;
          metadata: Record<string, unknown>;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ai_generated_content"]["Row"]> & {
          school_id: string;
          content_type: Database["public"]["Tables"]["ai_generated_content"]["Row"]["content_type"];
          title: string;
          content: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_generated_content"]["Row"]>;
        Relationships: [
          { foreignKeyName: "ai_generated_content_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
        ];
      };
      ai_knowledge_base: {
        Row: {
          id: string;
          school_id: string;
          category: string;
          title: string;
          content: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ai_knowledge_base"]["Row"]> & {
          school_id: string;
          title: string;
          content: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_knowledge_base"]["Row"]>;
        Relationships: [];
      };
      ai_usage_logs: {
        Row: {
          id: string;
          school_id: string | null;
          user_id: string | null;
          feature: string;
          model: string | null;
          input_tokens: number | null;
          output_tokens: number | null;
          succeeded: boolean;
          error_message: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ai_usage_logs"]["Row"]> & {
          feature: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_usage_logs"]["Row"]>;
        Relationships: [];
      };
      import_jobs: {
        Row: {
          id: string;
          school_id: string;
          source: "excel" | "csv" | "api" | "qr";
          file_name: string | null;
          imported_by: string | null;
          total_rows: number;
          succeeded_count: number;
          updated_count: number;
          failed_count: number;
          status: "pending" | "processing" | "completed" | "completed_with_errors" | "rolled_back";
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["import_jobs"]["Row"]> & {
          school_id: string;
          source: "excel" | "csv" | "api" | "qr";
        };
        Update: Partial<Database["public"]["Tables"]["import_jobs"]["Row"]>;
        Relationships: [];
      };
      import_job_rows: {
        Row: {
          id: string;
          import_job_id: string;
          row_number: number;
          student_id: string | null;
          action: "created" | "updated" | "merged" | "skipped" | "failed";
          previous_values: Record<string, unknown> | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["import_job_rows"]["Row"]> & {
          import_job_id: string;
          row_number: number;
          action: "created" | "updated" | "merged" | "skipped" | "failed";
        };
        Update: Partial<Database["public"]["Tables"]["import_job_rows"]["Row"]>;
        Relationships: [
          { foreignKeyName: "import_job_rows_import_job_id_fkey"; columns: ["import_job_id"]; isOneToOne: false; referencedRelation: "import_jobs"; referencedColumns: ["id"] }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

export interface AdminTableStat {
  table_name: string;
  row_estimate: number;
  total_bytes: number;
}

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

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  school_id: string | null;
  avatar_url: string | null;
}

export interface Student {
  id: string;
  school_id: string;
  classroom_id: string | null;
  student_code: string;
  citizen_id: string | null;
  full_name: string;
  nickname: string | null;
  gender: "male" | "female" | "other" | null;
  birth_date: string | null;
  grade: string | null;
  classroom: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  coins: number;
  created_at: string;
}

import { z } from "zod";

export const studentSchema = z.object({
  // ข้อมูลส่วนตัว (Personal)
  student_code: z.string().min(1, "กรุณากรอกรหัสนักเรียน"),
  title: z.string().optional().or(z.literal("")),
  full_name: z.string().min(2, "กรุณากรอกชื่อ-นามสกุล"),
  full_name_en: z.string().optional().or(z.literal("")),
  nickname: z.string().optional().or(z.literal("")),
  gender: z.enum(["male", "female", "other"]).optional(),
  birth_date: z.string().optional().or(z.literal("")),
  citizen_id: z.string().optional().or(z.literal("")),
  nationality: z.string().optional().or(z.literal("")),
  religion: z.string().optional().or(z.literal("")),
  blood_type: z.string().optional().or(z.literal("")),
  phone_number: z.string().optional().or(z.literal("")),
  profile_picture_url: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  province: z.string().optional().or(z.literal("")),
  district: z.string().optional().or(z.literal("")),
  subdistrict: z.string().optional().or(z.literal("")),
  postal_code: z.string().optional().or(z.literal("")),
  emergency_contact_name: z.string().optional().or(z.literal("")),
  emergency_contact_relationship: z.string().optional().or(z.literal("")),
  emergency_contact_phone: z.string().optional().or(z.literal("")),

  // ข้อมูลการศึกษา (Educational)
  grade: z.string().optional().or(z.literal("")),
  classroom: z.string().optional().or(z.literal("")),
  student_number: z.string().optional().or(z.literal("")),
  enrollment_date: z.string().optional().or(z.literal("")),
  graduation_status: z.string().optional().or(z.literal("")),
  learning_support_status: z.string().optional().or(z.literal("")),
  scholarship_status: z.string().optional().or(z.literal("")),
  risk_level: z.enum(["low", "medium", "high"]).optional(),
  risk_category: z.string().optional().or(z.literal("")),

  // ข้อมูลผู้ปกครอง (single inline parent — multi-parent CRUD lives on the detail page)
  parent_full_name: z.string().optional().or(z.literal("")),
  parent_relationship: z.enum(["father", "mother", "guardian", "other"]).optional(),
  parent_phone: z.string().optional().or(z.literal("")),
  parent_occupation: z.string().optional().or(z.literal("")),
  parent_income: z.string().optional().or(z.literal("")),
  parent_line_id: z.string().optional().or(z.literal("")),
  parent_address: z.string().optional().or(z.literal("")),

  // ข้อมูลสุขภาพ (upserted into the latest health_records row)
  height_cm: z.string().optional().or(z.literal("")),
  weight_kg: z.string().optional().or(z.literal("")),
  vision_left: z.string().optional().or(z.literal("")),
  vision_right: z.string().optional().or(z.literal("")),
  allergies: z.string().optional().or(z.literal("")),
  chronic_conditions: z.string().optional().or(z.literal("")),
  health_notes: z.string().optional().or(z.literal("")),

  // ข้อมูลเศรษฐกิจสังคม (Socioeconomic)
  family_income: z.string().optional().or(z.literal("")),
  family_members_count: z.string().optional().or(z.literal("")),
  housing_type: z.string().optional().or(z.literal("")),
  internet_access: z.boolean().optional(),
  device_ownership: z.string().optional().or(z.literal("")),
  transportation_method: z.string().optional().or(z.literal("")),
  poor_student_program: z.boolean().optional(),
  government_support_programs: z.string().optional().or(z.literal("")),
});

export type StudentFormValues = z.infer<typeof studentSchema>;

import { z } from "zod";

export const studentSchema = z.object({
  student_code: z.string().min(1, "กรุณากรอกรหัสนักเรียน"),
  full_name: z.string().min(2, "กรุณากรอกชื่อ-นามสกุล"),
  nickname: z.string().optional().or(z.literal("")),
  gender: z.enum(["male", "female", "other"]).optional(),
  birth_date: z.string().optional().or(z.literal("")),
  grade: z.string().optional().or(z.literal("")),
  classroom: z.string().optional().or(z.literal("")),
  blood_type: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
});

export type StudentFormValues = z.infer<typeof studentSchema>;

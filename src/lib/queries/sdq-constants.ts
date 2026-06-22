// Pure types/constants shared between server query code (sdq.ts) and client
// components. Kept separate from sdq.ts because that file (transitively, via
// welfare.ts) imports "@/lib/supabase/server" (which pulls in next/headers)
// and therefore cannot be imported from "use client" components - same
// pattern as welfare-constants.ts in Module 9.

export type SdqSubscale = "emotional" | "conduct" | "hyperactivity" | "peer_problems" | "prosocial";
export type SdqAssessmentType = "teacher" | "parent" | "student";
export type SdqAssessmentPeriod = "beginning_of_semester" | "mid_semester" | "end_of_semester" | "custom";
export type SdqAssessmentStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type SdqRiskLevel = "normal" | "borderline" | "at_risk" | "high_risk" | "critical";

export const SDQ_DISCLAIMER =
  "แบบประเมิน SDQ นี้จัดทำขึ้นเพื่อการคัดกรองและสนับสนุนการดูแลนักเรียนเชิงการศึกษาเท่านั้น ไม่ใช่เครื่องมือวินิจฉัยทางคลินิก ผลการประเมินควรใช้ร่วมกับวิจารณญาณของครู/ผู้เชี่ยวชาญ และส่งต่อผู้เชี่ยวชาญเมื่อจำเป็น";

export const sdqAssessmentTypeLabel: Record<SdqAssessmentType, string> = {
  teacher: "ครูประเมิน",
  parent: "ผู้ปกครองประเมิน",
  student: "นักเรียนประเมินตนเอง",
};

export const sdqAssessmentPeriodLabel: Record<SdqAssessmentPeriod, string> = {
  beginning_of_semester: "ต้นภาคเรียน",
  mid_semester: "กลางภาคเรียน",
  end_of_semester: "ปลายภาคเรียน",
  custom: "กำหนดเอง",
};

export const sdqAssessmentStatusLabel: Record<SdqAssessmentStatus, string> = {
  pending: "รอดำเนินการ",
  in_progress: "กำลังทำแบบประเมิน",
  completed: "เสร็จสมบูรณ์",
  cancelled: "ยกเลิก",
};

export const sdqRiskLevelLabel: Record<SdqRiskLevel, string> = {
  normal: "ปกติ",
  borderline: "เฝ้าระวัง",
  at_risk: "มีความเสี่ยง",
  high_risk: "ความเสี่ยงสูง",
  critical: "วิกฤต",
};

export const sdqRiskLevelColor: Record<SdqRiskLevel, "success" | "secondary" | "accent" | "destructive"> = {
  normal: "success",
  borderline: "secondary",
  at_risk: "accent",
  high_risk: "destructive",
  critical: "destructive",
};

export const sdqSubscaleLabel: Record<SdqSubscale, string> = {
  emotional: "ด้านอารมณ์",
  conduct: "ด้านความประพฤติ",
  hyperactivity: "ด้านการอยู่ไม่นิ่ง/สมาธิสั้น",
  peer_problems: "ด้านปัญหาความสัมพันธ์กับเพื่อน",
  prosocial: "ด้านสัมพันธภาพทางสังคม (จุดแข็ง)",
};

export function classifySdqRisk(totalDifficulties: number): SdqRiskLevel {
  if (totalDifficulties <= 13) return "normal";
  if (totalDifficulties <= 16) return "borderline";
  if (totalDifficulties <= 19) return "at_risk";
  if (totalDifficulties <= 24) return "high_risk";
  return "critical";
}

import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Composite Risk Score
// ============================================================================
// Combines attendance, academics, behavior, health, and SDQ into a single
// 0-100 score (higher = more at-risk), since `students.risk_level` alone is a
// manually-set label with no visible derivation. Weights are deliberately
// simple and documented inline rather than configurable, since there is no
// product requirement yet for schools to tune them per-context.

export type RiskBand = "low" | "medium" | "high";

export interface RiskFactor {
  key: "attendance" | "academic" | "behavior" | "health" | "sdq";
  label: string;
  /** 0-100, higher = more at-risk. */
  score: number;
  weight: number;
  detail: string;
}

export interface StudentRiskScore {
  studentId: string;
  /** 0-100, higher = more at-risk. */
  totalScore: number;
  band: RiskBand;
  factors: RiskFactor[];
}

function bandFor(score: number): RiskBand {
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

const WEIGHTS = {
  attendance: 0.25,
  academic: 0.25,
  behavior: 0.2,
  health: 0.15,
  sdq: 0.15,
};

export async function getStudentRiskScore(studentId: string): Promise<StudentRiskScore> {
  const supabase = await createClient();
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const since = sixtyDaysAgo.toISOString().slice(0, 10);

  const [{ data: attendance }, { data: scores }, { data: behaviorRecords }, { data: healthRecords }, { data: sdq }] =
    await Promise.all([
      supabase.from("attendance").select("status").eq("student_id", studentId).gte("date", since),
      supabase.from("scores").select("score, max_score").eq("student_id", studentId),
      supabase
        .from("behavior_records")
        .select("category, points")
        .eq("student_id", studentId)
        .gte("occurred_at", since),
      supabase
        .from("health_records")
        .select("nutrition_status, allergies, chronic_conditions")
        .eq("student_id", studentId)
        .order("recorded_at", { ascending: false })
        .limit(1),
      supabase
        .from("sdq_assessments")
        .select("risk_level, total_difficulties_score")
        .eq("student_id", studentId)
        .order("assessment_date", { ascending: false })
        .limit(1),
    ]);

  // --- Attendance: absence rate over the last 60 days. ---
  const attendanceTotal = attendance?.length ?? 0;
  const absences = attendance?.filter((a) => a.status === "absent").length ?? 0;
  const lates = attendance?.filter((a) => a.status === "late").length ?? 0;
  const attendanceScore = attendanceTotal > 0 ? Math.min(100, ((absences + lates * 0.5) / attendanceTotal) * 100) : 0;
  const attendanceDetail =
    attendanceTotal > 0
      ? `ขาด ${absences} ครั้ง · มาสาย ${lates} ครั้ง จาก ${attendanceTotal} ครั้ง (60 วันล่าสุด)`
      : "ไม่มีข้อมูลการเข้าเรียนในช่วง 60 วันล่าสุด";

  // --- Academic: inverse of average score percentage. ---
  const scoreTotal = scores?.length ?? 0;
  const avgPct =
    scoreTotal > 0 ? scores!.reduce((sum, s) => sum + (s.max_score > 0 ? s.score / s.max_score : 0), 0) / scoreTotal : null;
  const academicScore = avgPct !== null ? Math.min(100, Math.max(0, (1 - avgPct) * 100)) : 0;
  const academicDetail = avgPct !== null ? `คะแนนเฉลี่ย ${(avgPct * 100).toFixed(0)}% จาก ${scoreTotal} รายการ` : "ไม่มีข้อมูลผลการเรียน";

  // --- Behavior: net negative points over the last 60 days. ---
  const negativePoints = behaviorRecords?.filter((b) => b.category === "negative").reduce((sum, b) => sum + Math.abs(b.points), 0) ?? 0;
  const positivePoints = behaviorRecords?.filter((b) => b.category === "positive").reduce((sum, b) => sum + b.points, 0) ?? 0;
  const behaviorScore = Math.min(100, Math.max(0, negativePoints * 4 - positivePoints * 1));
  const behaviorDetail = `คะแนนลบสะสม ${negativePoints} · คะแนนบวกสะสม ${positivePoints} (60 วันล่าสุด)`;

  // --- Health: presence of chronic conditions/allergies or abnormal nutrition status. ---
  const latestHealth = healthRecords?.[0];
  let healthScore = 0;
  const healthFlags: string[] = [];
  if (latestHealth?.chronic_conditions) {
    healthScore += 50;
    healthFlags.push(`โรคประจำตัว: ${latestHealth.chronic_conditions}`);
  }
  if (latestHealth?.allergies) {
    healthScore += 20;
    healthFlags.push(`แพ้: ${latestHealth.allergies}`);
  }
  if (latestHealth?.nutrition_status && latestHealth.nutrition_status !== "normal") {
    healthScore += 30;
    healthFlags.push(`ภาวะโภชนาการ: ${latestHealth.nutrition_status}`);
  }
  healthScore = Math.min(100, healthScore);
  const healthDetail = healthFlags.length > 0 ? healthFlags.join(" · ") : latestHealth ? "ไม่พบความเสี่ยงด้านสุขภาพ" : "ไม่มีข้อมูลสุขภาพ";

  // --- SDQ: latest risk_level band mapped to a score. ---
  const sdqLevelScore: Record<string, number> = { normal: 0, borderline: 35, at_risk: 55, high_risk: 75, critical: 100 };
  const latestSdq = sdq?.[0];
  const sdqScore = latestSdq?.risk_level ? sdqLevelScore[latestSdq.risk_level] ?? 0 : 0;
  const sdqDetail = latestSdq
    ? `ระดับความเสี่ยงล่าสุด: ${latestSdq.risk_level ?? "-"} (คะแนนความยาก ${latestSdq.total_difficulties_score ?? "-"})`
    : "ยังไม่มีแบบประเมิน SDQ";

  const factors: RiskFactor[] = [
    { key: "attendance", label: "การเข้าเรียน", score: attendanceScore, weight: WEIGHTS.attendance, detail: attendanceDetail },
    { key: "academic", label: "ผลการเรียน", score: academicScore, weight: WEIGHTS.academic, detail: academicDetail },
    { key: "behavior", label: "พฤติกรรม", score: behaviorScore, weight: WEIGHTS.behavior, detail: behaviorDetail },
    { key: "health", label: "สุขภาพ", score: healthScore, weight: WEIGHTS.health, detail: healthDetail },
    { key: "sdq", label: "SDQ", score: sdqScore, weight: WEIGHTS.sdq, detail: sdqDetail },
  ];

  const totalScore = Math.round(factors.reduce((sum, f) => sum + f.score * f.weight, 0));

  return { studentId, totalScore, band: bandFor(totalScore), factors };
}

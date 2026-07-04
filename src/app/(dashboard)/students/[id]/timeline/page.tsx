import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimelineClient } from "./timeline-client";

export default async function StudentTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, student_code, grade, classroom, coins, avatar_url, profile_picture_url")
    .eq("id", id)
    .single();

  if (!student) notFound();

  // Summary stats — parallel fetch
  const [
    { data: attendance },
    { data: behaviors },
    { data: scores },
    { data: healthLatest },
    { data: finance },
    { data: eqLatest },
    { data: sdqLatest },
  ] = await Promise.all([
    supabase.from("attendance").select("status").eq("student_id", id),
    supabase.from("behavior_records").select("points").eq("student_id", id),
    supabase.from("scores").select("score, max_score").eq("student_id", id),
    supabase.from("health_records").select("bmi, nutrition_status").eq("student_id", id).order("recorded_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("finance_transactions").select("balance_after").eq("student_id", id).order("occurred_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("eq_assessments").select("self_awareness, self_regulation, motivation, empathy, social_skills").eq("student_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("sdq_assessments").select("total_difficulties_score, risk_level").eq("student_id", id).order("assessment_date", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const presentDays = (attendance ?? []).filter((a) => a.status === "present").length;
  const absentDays  = (attendance ?? []).filter((a) => a.status === "absent").length;
  const totalBehavior = (behaviors ?? []).reduce((s, b) => s + (b.points ?? 0), 0);
  const validScores = (scores ?? []).filter((s) => s.max_score > 0);
  const avgScore = validScores.length > 0
    ? Math.round(validScores.reduce((s, r) => s + (r.score / r.max_score) * 100, 0) / validScores.length * 10) / 10
    : null;
  type EqRow = { self_awareness: number; self_regulation: number; motivation: number; empathy: number; social_skills: number };
  const eq = eqLatest as EqRow | null;
  const eqTotal = eq ? (eq.self_awareness ?? 0) + (eq.self_regulation ?? 0) + (eq.motivation ?? 0) + (eq.empathy ?? 0) + (eq.social_skills ?? 0) : null;
  const riskLabelMap: Record<string, string> = { normal: "ปกติ", borderline: "เฝ้าระวัง", at_risk: "มีความเสี่ยง", high_risk: "เสี่ยงสูง", critical: "วิกฤต" };

  const summary = {
    presentDays,
    absentDays,
    avgScore,
    coins: student.coins ?? 0,
    behavior: totalBehavior,
    bmi: healthLatest?.bmi ? Number(healthLatest.bmi).toFixed(1) : null,
    savings: finance?.balance_after != null ? Number(finance.balance_after) : null,
    eqTotal,
    sdqRisk: sdqLatest?.risk_level ? riskLabelMap[sdqLatest.risk_level] ?? sdqLatest.risk_level : null,
    sdqScore: sdqLatest?.total_difficulties_score ?? null,
  };

  const photoUrl = student.profile_picture_url ?? student.avatar_url ?? null;

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/students/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Student Timeline</h1>
          <p className="text-sm text-muted-foreground">ประวัติทุกเหตุการณ์ของนักเรียน</p>
        </div>
      </div>

      <TimelineClient student={{ id: student.id, full_name: student.full_name ?? "", student_code: student.student_code ?? "", grade: student.grade ?? "", classroom: student.classroom ?? "", photo_url: photoUrl }} summary={summary} />
    </div>
  );
}

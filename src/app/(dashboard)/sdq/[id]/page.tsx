import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SdqAssessmentForm } from "@/components/sdq/sdq-assessment-form";
import { SdqFollowUpDialog } from "@/components/sdq/sdq-follow-up-dialog";
import { PrintButton } from "@/components/health/export-buttons";
import {
  getSdqAssessmentWithResponses,
  getAiSdqAnalysis,
  sdqAssessmentPeriodLabel,
  sdqAssessmentTypeLabel,
  sdqAssessmentStatusLabel,
  sdqRiskLevelLabel,
  sdqRiskLevelColor,
  sdqSubscaleLabel,
  SDQ_DISCLAIMER,
} from "@/lib/queries/sdq";

export default async function SdqAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("id, school_id").eq("id", auth.user.id).single()
    : { data: null };

  const { assessment, questions, answers } = await getSdqAssessmentWithResponses(id);
  if (!assessment) notFound();

  const isCompleted = assessment.status === "completed";
  const analysis = isCompleted ? await getAiSdqAnalysis(id) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            แบบประเมิน SDQ - {assessment.students?.full_name} ({assessment.students?.student_code})
          </h1>
          <p className="text-sm text-muted-foreground">
            {sdqAssessmentTypeLabel[assessment.assessment_type]} · {sdqAssessmentPeriodLabel[assessment.assessment_period]} ·{" "}
            {new Date(assessment.assessment_date).toLocaleDateString("th-TH")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{sdqAssessmentStatusLabel[assessment.status]}</Badge>
          {isCompleted && assessment.risk_level && (
            <Badge variant={sdqRiskLevelColor[assessment.risk_level]}>{sdqRiskLevelLabel[assessment.risk_level]}</Badge>
          )}
          <PrintButton />
          {isCompleted && profile?.school_id && (
            <SdqFollowUpDialog
              assessmentId={id}
              schoolId={profile.school_id}
              studentId={assessment.student_id}
              studentName={assessment.students?.full_name ?? ""}
              currentUserId={profile.id}
            />
          )}
        </div>
      </div>

      <Card className="glass-card border-amber-500/40 bg-amber-500/5">
        <CardContent className="py-3 text-xs text-muted-foreground">{SDQ_DISCLAIMER}</CardContent>
      </Card>

      {isCompleted ? (
        <>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>ผลคะแนนการประเมิน</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {(
                [
                  ["emotional", assessment.emotional_score],
                  ["conduct", assessment.conduct_score],
                  ["hyperactivity", assessment.hyperactivity_score],
                  ["peer_problems", assessment.peer_problems_score],
                  ["prosocial", assessment.prosocial_score],
                ] as const
              ).map(([subscale, score]) => (
                <div key={subscale} className="rounded-xl border border-border/60 p-3 text-center">
                  <p className="text-xs text-muted-foreground">{sdqSubscaleLabel[subscale]}</p>
                  <p className="text-2xl font-bold">{score ?? "-"}/10</p>
                </div>
              ))}
              <div className="col-span-2 rounded-xl border border-primary/40 bg-primary/5 p-3 text-center sm:col-span-3 lg:col-span-5">
                <p className="text-xs text-muted-foreground">คะแนนความยากลำบากโดยรวม (Total Difficulties, ไม่รวมจุดแข็ง)</p>
                <p className="text-3xl font-bold">{assessment.total_difficulties_score ?? "-"}/40</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>การวิเคราะห์โดย AI (กฎอัตโนมัติ)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {analysis.map((line, idx) => (
                <p key={idx}>• {line}</p>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>คำตอบทั้งหมด</CardTitle>
            </CardHeader>
            <CardContent>
              <SdqAssessmentForm
                assessmentId={id}
                schoolId={assessment.school_id}
                questions={questions}
                initialAnswers={Object.fromEntries(answers) as Record<string, 0 | 1 | 2>}
                readOnly
              />
            </CardContent>
          </Card>
        </>
      ) : (
        <SdqAssessmentForm
          assessmentId={id}
          schoolId={assessment.school_id}
          questions={questions}
          initialAnswers={Object.fromEntries(answers) as Record<string, 0 | 1 | 2>}
        />
      )}
    </div>
  );
}

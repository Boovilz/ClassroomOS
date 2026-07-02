import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer } from "lucide-react";

const statusLabel: Record<string, string> = {
  draft: "ร่าง",
  completed: "เสร็จสิ้น",
  acknowledged: "รับทราบแล้ว",
};

const scoreLabels: { key: string; label: string }[] = [
  { key: "lesson_plan_score", label: "แผนการสอน" },
  { key: "teaching_method_score", label: "วิธีการสอน" },
  { key: "media_score", label: "สื่อการสอน" },
  { key: "assessment_score", label: "การวัดประเมินผล" },
  { key: "classroom_management_score", label: "การบริหารจัดการชั้นเรียน" },
];

type RecordRow = {
  id: string;
  supervised_at: string;
  subject: string | null;
  classroom: string | null;
  topic: string | null;
  student_count: number | null;
  lesson_plan_score: number | null;
  teaching_method_score: number | null;
  media_score: number | null;
  assessment_score: number | null;
  classroom_management_score: number | null;
  total_score: number | null;
  strengths: string | null;
  improvements: string | null;
  suggestions: string | null;
  follow_up_date: string | null;
  status: string;
  teacher: { full_name: string } | null;
  supervisor: { full_name: string } | null;
};

export default async function SupervisionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("supervision_records")
    .select(
      `id, supervised_at, subject, classroom, topic, student_count,
       lesson_plan_score, teaching_method_score, media_score, assessment_score, classroom_management_score,
       total_score, strengths, improvements, suggestions, follow_up_date, status,
       teacher:teacher_id(full_name), supervisor:supervisor_id(full_name)`
    )
    .eq("id", id)
    .returns<RecordRow[]>()
    .single();

  if (error || !data) notFound();

  const record = data;
  const supervisedDate = new Date(record.supervised_at).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Toolbar (hidden when printing) */}
      <div className="flex items-center justify-between print:hidden">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link href="/supervision">
            <ArrowLeft className="h-4 w-4" />
            กลับรายการ
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" />
          พิมพ์แบบบันทึก
        </Button>
      </div>

      {/* Printable record */}
      <div className="mx-auto max-w-3xl rounded-xl border bg-white p-8 shadow-sm print:border-none print:shadow-none">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold">แบบบันทึกการนิเทศการสอน</h1>
          <p className="text-sm text-muted-foreground">Teaching Supervision Record</p>
        </div>

        {/* Status badge */}
        <div className="mb-6 flex justify-end print:hidden">
          <Badge>{statusLabel[record.status] ?? record.status}</Badge>
        </div>

        {/* Info grid */}
        <div className="mb-6 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <InfoRow label="วันที่นิเทศ" value={supervisedDate} />
          <InfoRow label="ครูผู้สอน" value={record.teacher?.full_name ?? "-"} />
          <InfoRow label="ผู้นิเทศ" value={record.supervisor?.full_name ?? "-"} />
          <InfoRow label="วิชาที่สอน" value={record.subject ?? "-"} />
          <InfoRow label="ระดับชั้น/ห้อง" value={record.classroom ?? "-"} />
          <InfoRow label="หัวข้อที่สอน" value={record.topic ?? "-"} />
          <InfoRow
            label="จำนวนนักเรียน"
            value={record.student_count != null ? `${record.student_count} คน` : "-"}
          />
        </div>

        {/* Scores table */}
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-semibold">ผลการประเมิน</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-1.5 text-left font-medium">รายการ</th>
                <th className="py-1.5 text-center font-medium">คะแนน (1–5)</th>
              </tr>
            </thead>
            <tbody>
              {scoreLabels.map(({ key, label }) => (
                <tr key={key} className="border-b border-dashed">
                  <td className="py-1.5">{label}</td>
                  <td className="py-1.5 text-center">
                    {(record as Record<string, unknown>)[key] != null
                      ? String((record as Record<string, unknown>)[key])
                      : "-"}
                  </td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-1.5">คะแนนรวม</td>
                <td className="py-1.5 text-center">
                  {record.total_score ?? "-"}
                  <span className="font-normal text-muted-foreground"> / 25</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Text sections */}
        <div className="mb-6 space-y-4 text-sm">
          <TextSection label="จุดเด่น / ข้อดี" value={record.strengths} />
          <TextSection label="จุดที่ควรปรับปรุง" value={record.improvements} />
          <TextSection label="ข้อเสนอแนะ" value={record.suggestions} />
        </div>

        {/* Follow-up */}
        {record.follow_up_date && (
          <div className="mb-6 text-sm">
            <span className="font-medium">วันนิเทศติดตาม: </span>
            {new Date(record.follow_up_date).toLocaleDateString("th-TH", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        )}

        {/* Signature lines */}
        <div className="mt-10 grid grid-cols-2 gap-8 text-center text-sm">
          <div>
            <div className="mb-10 border-b border-dashed" />
            <p>ลงชื่อครูผู้สอน</p>
            <p className="text-muted-foreground">({record.teacher?.full_name ?? "....................."})</p>
          </div>
          <div>
            <div className="mb-10 border-b border-dashed" />
            <p>ลงชื่อผู้นิเทศ</p>
            <p className="text-muted-foreground">({record.supervisor?.full_name ?? "....................."})</p>
          </div>
        </div>
      </div>

      {/* Print button at bottom */}
      <div className="flex justify-center print:hidden">
        <Button
          variant="default"
          className="gap-2"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" />
          พิมพ์แบบบันทึก
        </Button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="min-w-[120px] font-medium text-muted-foreground">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

function TextSection({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="mb-1 font-medium">{label}</p>
      <p className="min-h-[48px] rounded border border-dashed p-2 text-muted-foreground">
        {value ?? "-"}
      </p>
    </div>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer } from "lucide-react";
import { SupervisionPrintClient } from "./supervision-print-client";

const statusLabel: Record<string, string> = {
  draft: "ร่าง",
  completed: "เสร็จสิ้น",
  acknowledged: "รับทราบแล้ว",
};

// 16-item rubric matching the PDF reference
const SUPERVISION_CRITERIA = [
  {
    category: "1. การจัดบรรยากาศและบริหารชั้นเรียน",
    items: [
      { no: 1, label: "1.1 การตรงต่อเวลา" },
      { no: 2, label: "1.2 การควบคุมความเป็นระเบียบในชั้นเรียน" },
      { no: 3, label: "1.3 การให้คำปรึกษาแก่ผู้เรียนในชั้นเรียน" },
      { no: 4, label: "1.4 การรักษาความสะอาดในชั้นเรียน" },
    ],
  },
  {
    category: "2. บุคลิกภาพ",
    items: [
      { no: 5, label: "2.1 การแต่งกายสุภาพ เหมาะสม" },
      { no: 6, label: "2.2 การใช้น้ำเสียง มีความชัดเจน" },
      { no: 7, label: "2.3 ความเชื่อมั่นใจตนเอง" },
      { no: 8, label: "2.4 การใช้ภาษาเพื่อสื่อสารและสร้างบรรยากาศการเรียนรู้" },
    ],
  },
  {
    category: "3. การดำเนินการสอน",
    items: [
      { no: 9, label: "3.1 วางแผนการจัดการเรียนรู้สอดคล้องกับมาตรฐานและตัวชี้วัด" },
      { no: 10, label: "3.2 เนื้อหาสอดคล้องกับจุดประสงค์การเรียนรู้" },
      { no: 11, label: "3.3 การสอดแทรกความรู้ทั่วไปและคุณธรรม จริยธรรม" },
      { no: 12, label: "3.4 การใช้วิธีการสอนที่เหมาะสมน่าสนใจ" },
      { no: 13, label: "3.5 การเปิดโอกาสให้ผู้เรียนซักถามหรือแสดงความคิดเห็น" },
      { no: 14, label: "3.6 มีการตั้งคำถามที่กระตุ้นผู้เรียนใช้กระบวนการคิด" },
      { no: 15, label: "3.7 การสรุปเนื้อหาได้ตรงตามจุดประสงค์" },
    ],
  },
  {
    category: "4. การใช้สื่อและนวัตกรรมการเรียนรู้",
    items: [
      { no: 16, label: "4.1 ใช้สื่อการสอนที่สอดคล้องตามตัวชี้วัด" },
    ],
  },
];

const QUALITY_LABEL: Record<string, string> = {
  excellent: "ดีมาก",
  good: "ดี",
  fair: "พอใช้",
  poor: "ปรับปรุง",
  fail: "ไม่ผ่านเกณฑ์",
};

function qualityFromScore(score: number): string {
  if (score >= 73) return "ดีมาก";
  if (score >= 65) return "ดี";
  if (score >= 57) return "พอใช้";
  if (score >= 48) return "ปรับปรุง";
  return "ไม่ผ่านเกณฑ์";
}

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
  teacher_name: string | null;
  strengths: string | null;
  improvements: string | null;
  suggestions: string | null;
  follow_up_date: string | null;
  status: string;
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
       total_score, teacher_name, strengths, improvements, suggestions, follow_up_date, status,
       supervisor:supervisor_id(full_name)`
    )
    .eq("id", id)
    .returns<RecordRow[]>()
    .single();

  if (error || !data) notFound();

  const record = data;

  const supervisedDate = record.supervised_at
    ? new Date(record.supervised_at).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "-";

  const getItemScore = (_itemNo: number): number | null => null;

  const totalScore = record.total_score ?? 0;
  const qualityLabel = qualityFromScore(totalScore);
  const round = 1;

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
        <div className="flex items-center gap-2">
          <Badge>{statusLabel[record.status] ?? record.status}</Badge>
          <SupervisionPrintClient />
        </div>
      </div>

      {/* Printable form — exact PDF layout */}
      <div className="mx-auto max-w-4xl rounded-xl border bg-white p-8 shadow-sm print:border-none print:rounded-none print:shadow-none print:p-6">
        {/* Header */}
        <div className="mb-4 text-center">
          <p className="text-sm font-medium">แบบบันทึกการนิเทศการสอนประจำภาคเรียน</p>
          <p className="text-sm">ฝ่ายบริหารงานวิชาการสถานศึกษา</p>
          <div className="mt-1 flex items-center justify-center gap-4 text-sm">
            <span>การนิเทศ ครั้งที่ {round}</span>
            <span>
              ปีการศึกษา{" "}
              {record.supervised_at
                ? new Date(record.supervised_at).getFullYear() + 543
                : new Date().getFullYear() + 543}
            </span>
          </div>
        </div>

        {/* Info fields */}
        <div className="mb-3 grid grid-cols-2 gap-x-8 gap-y-1 text-sm border p-3">
          <div className="flex gap-2">
            <span className="font-medium">ชื่อผู้สอน:</span>
            <span>{record.teacher_name ?? "-"}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium">กลุ่มสาระฯ:</span>
            <span>-</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium">รายวิชาที่สอน:</span>
            <span>{record.subject ?? "-"}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium">วันที่รับการนิเทศ:</span>
            <span>{supervisedDate}</span>
          </div>
        </div>

        {/* Rubric table */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border bg-gray-50">
              <th className="border px-2 py-1 w-8 text-center">ที่</th>
              <th className="border px-2 py-1 text-left">รายการประเมินพฤติกรรมการจัดการเรียนรู้</th>
              <th className="border px-2 py-1 text-center" colSpan={5}>ระดับคะแนน</th>
            </tr>
            <tr className="border bg-gray-50">
              <th className="border px-2 py-1" />
              <th className="border px-2 py-1" />
              {[5, 4, 3, 2, 1].map((n) => (
                <th key={n} className="border px-2 py-1 w-10 text-center font-normal">{n}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SUPERVISION_CRITERIA.map((cat) => (
              <>
                <tr key={cat.category} className="bg-gray-50">
                  <td className="border px-2 py-1" />
                  <td className="border px-2 py-1 font-medium" colSpan={6}>{cat.category}</td>
                </tr>
                {cat.items.map((item) => {
                  const score = getItemScore(item.no);
                  return (
                    <tr key={item.no} className="border">
                      <td className="border px-2 py-1 text-center">{item.no}</td>
                      <td className="border px-2 py-1">{item.label}</td>
                      {[5, 4, 3, 2, 1].map((level) => (
                        <td key={level} className="border px-2 py-1 text-center">
                          {score === level ? "✓" : ""}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </>
            ))}
            <tr className="font-semibold bg-gray-50">
              <td className="border px-2 py-1 text-right font-semibold" colSpan={2}>
                รวมคะแนนทั้งหมด :
              </td>
              <td className="border px-2 py-1 text-center" colSpan={5}>
                {totalScore} / 80 คะแนน
              </td>
            </tr>
            <tr>
              <td className="border px-2 py-1 text-right font-medium" colSpan={2}>
                สรุปผลการประเมินคุณภาพ :
              </td>
              <td className="border px-2 py-1 text-center font-semibold" colSpan={5}>
                {qualityLabel}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Comments */}
        <div className="mt-4 space-y-3 text-sm">
          <div>
            <p className="font-medium">● จุดเด่น / ข้อดี:</p>
            <p className="min-h-[36px] border-b border-dashed pl-4 text-gray-700">{record.strengths ?? "-"}</p>
          </div>
          <div>
            <p className="font-medium">● จุดที่ควรพัฒนา / ปรับปรุง:</p>
            <p className="min-h-[36px] border-b border-dashed pl-4 text-gray-700">{record.improvements ?? "-"}</p>
          </div>
          <div>
            <p className="font-medium">● ข้อเสนอแนะเพื่อการพัฒนางาน:</p>
            <p className="min-h-[36px] border-b border-dashed pl-4 text-gray-700">{record.suggestions ?? "-"}</p>
          </div>
        </div>

        {/* Signatures */}
        <div className="mt-8 grid grid-cols-2 gap-12 text-center text-sm">
          <div>
            <div className="mb-8 border-b border-dashed" />
            <p>( {record.teacher_name ?? "................................"} )</p>
            <p className="text-gray-500">ผู้รับการนิเทศ</p>
          </div>
          <div>
            <div className="mb-8 border-b border-dashed" />
            <p>( {record.supervisor?.full_name ?? "................................"} )</p>
            <p className="text-gray-500">ผู้นิเทศ</p>
          </div>
        </div>
      </div>
    </div>
  );
}

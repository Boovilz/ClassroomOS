import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PrintButton } from "./print-button";

interface RosterPrintPageProps {
  searchParams: Promise<{
    grade?: string;
    classroom?: string;
    year?: string;
  }>;
}

function currentBeYear(): number {
  return new Date().getFullYear() + 543;
}

export default async function RosterPrintPage({ searchParams }: RosterPrintPageProps) {
  const params = await searchParams;
  const grade = params.grade ?? "";
  const classroom = params.classroom ?? "";
  const academicYear = params.year ?? String(currentBeYear());

  const supabase = await createClient();

  // Get current user's school
  const { data: authUser } = await supabase.auth.getUser();
  let schoolName = "";
  let schoolId: string | null = null;
  let teacherName: string | null = null;

  if (authUser?.user) {
    const { data: userRow } = await supabase
      .from("users")
      .select("school_id, full_name")
      .eq("id", authUser.user.id)
      .maybeSingle();

    if (userRow?.school_id) {
      schoolId = userRow.school_id;

      const { data: school } = await supabase
        .from("schools")
        .select("name")
        .eq("id", schoolId)
        .maybeSingle();

      schoolName = school?.name ?? "";
    }
  }

  // Query students for the classroom
  const students: { student_code: string; full_name: string }[] = [];

  if (schoolId && grade && classroom) {
    const { data } = await supabase
      .from("students")
      .select("student_code, full_name, student_number:student_code")
      .eq("school_id", schoolId)
      .eq("grade", grade)
      .eq("classroom", classroom)
      .is("deleted_at", null)
      .order("student_code", { ascending: true })
      .limit(50);

    if (data) {
      students.push(...data.map((s) => ({ student_code: s.student_code, full_name: s.full_name })));
    }

    // Try to find homeroom teacher for this classroom
    const classroomKey = `${grade}/${classroom}`;
    const { data: teacherRow } = await supabase
      .from("teachers")
      .select("user_id")
      .eq("school_id", schoolId)
      .eq("homeroom_classroom", classroomKey)
      .is("deleted_at", null)
      .maybeSingle();

    if (teacherRow?.user_id) {
      const { data: teacherUser } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", teacherRow.user_id)
        .maybeSingle();
      teacherName = teacherUser?.full_name ?? null;
    }
  }

  // Pad to exactly 30 rows
  const rows: ({ student_code: string; full_name: string } | null)[] = [
    ...students,
    ...Array<null>(Math.max(0, 30 - students.length)).fill(null),
  ];

  return (
    <div>
      {/* Selector form — hidden when printing */}
      <div className="no-print p-6 space-y-4 border-b">
        <h1 className="text-xl font-bold">พิมพ์ใบรายชื่อนักเรียน</h1>
        <form method="GET" className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">ระดับชั้น</label>
            <Input name="grade" defaultValue={grade} placeholder="เช่น ป.4" className="w-32" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">ห้องเรียน</label>
            <Input name="classroom" defaultValue={classroom} placeholder="เช่น 2" className="w-24" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">ปีการศึกษา</label>
            <Input name="year" defaultValue={academicYear} placeholder="เช่น 2568" className="w-28" />
          </div>
          <Button type="submit" variant="secondary">
            ดูรายชื่อ
          </Button>
          <PrintButton />
          <Button variant="outline" asChild>
            <Link href={`/students?grade=${encodeURIComponent(grade)}&classroom=${encodeURIComponent(classroom)}`}>
              กลับหน้านักเรียน
            </Link>
          </Button>
        </form>
      </div>

      {/* Printable roster */}
      <div className="print-page p-8 font-sarabun">
        <div className="text-center mb-4">
          <p className="text-lg font-bold">ใบรายชื่อนักเรียน โรงเรียน{schoolName}</p>
          <p>
            ชั้น{grade}/{classroom}&nbsp;&nbsp;&nbsp;&nbsp;ปีการศึกษา {academicYear}
          </p>
          <p>ครูประจำชั้น : {teacherName ?? "-"}</p>
        </div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-black p-1 w-10 text-center">ลำดับ</th>
              <th className="border border-black p-1 w-24 text-center">รหัสประจำตัว</th>
              <th className="border border-black p-1 w-48 text-left">ชื่อ - นามสกุล</th>
              <th className="border border-black p-1 text-left">บันทึกการประเมิน / เวลาเรียน</th>
              <th className="border border-black p-1 w-24 text-left">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((student, i) => (
              <tr key={i} className="border border-black h-8">
                <td className="border border-black p-1 text-center">{i + 1}</td>
                <td className="border border-black p-1 text-center">{student?.student_code ?? ""}</td>
                <td className="border border-black p-1">{student?.full_name ?? ""}</td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
        }
      `}</style>
    </div>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStudentAcademicSummary } from "@/lib/queries/academic";
import { Pp7Client } from "./pp7-client";
import { Button } from "@/components/ui/button";

export default async function Pp7Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: studentRow } = await supabase
    .from("students")
    .select("school_id, full_name, student_code, grade, classroom, birth_date, citizen_id, gender, nationality, religion")
    .eq("id", id)
    .single();

  if (!studentRow) {
    return <p className="p-8 text-center text-muted-foreground">ไม่พบข้อมูล</p>;
  }

  const [summary, { data: school }, { data: parents }] = await Promise.all([
    getStudentAcademicSummary(id),
    supabase.from("schools").select("name, address, phone").eq("id", studentRow.school_id).single(),
    supabase
      .from("parents")
      .select("full_name, relationship")
      .eq("student_id", id)
      .in("relationship", ["father", "mother"]),
  ]);

  const fatherRow = parents?.find((p) => p.relationship === "father");
  const motherRow = parents?.find((p) => p.relationship === "mother");

  if (!summary) {
    return <p className="p-8 text-center text-muted-foreground">ไม่พบข้อมูล</p>;
  }

  return (
    <div className="space-y-4 p-6">
      <div className="print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/students/${id}`}>← กลับ</Link>
        </Button>
      </div>
      <Pp7Client
        student={{
          full_name: studentRow.full_name ?? summary.fullName,
          code: studentRow.student_code ?? summary.studentCode,
          grade: studentRow.grade ?? summary.grade ?? "-",
          classroom: studentRow.classroom ?? summary.classroom ?? "-",
          birth_date: studentRow.birth_date,
          national_id: studentRow.citizen_id,
          gender: studentRow.gender,
          nationality: studentRow.nationality,
          religion: studentRow.religion,
          father_name: fatherRow?.full_name ?? null,
          mother_name: motherRow?.full_name ?? null,
        }}
        school={{
          name: school?.name ?? "-",
          address: school?.address,
          phone: school?.phone,
        }}
        defaultGpa={summary.gpa ?? null}
        defaultAttendanceRate={summary.attendanceRatePercent ?? null}
      />
    </div>
  );
}

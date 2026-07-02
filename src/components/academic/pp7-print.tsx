"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface Props {
  student: {
    full_name: string;
    code: string;
    grade: string;
    classroom: string;
    birth_date?: string | null;
    national_id?: string | null;
  };
  school: {
    name: string;
    address?: string | null;
    phone?: string | null;
  };
  issueDate?: string;
  academicYear?: string;
  semester?: string;
}

function formatThaiDate(dateStr?: string): string {
  if (!dateStr) return new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
  return new Date(dateStr).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
}

export function Pp7Print({ student, school, issueDate, academicYear, semester }: Props) {
  const issueDateFormatted = issueDate ? formatThaiDate(issueDate) : formatThaiDate();
  const year = academicYear ?? new Date().getFullYear() + 543;
  const sem = semester ?? "1";

  return (
    <div className="space-y-4">
      <div className="flex justify-end print:hidden">
        <Button variant="outline" onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          พิมพ์ / บันทึก PDF
        </Button>
      </div>

      <div className="print-page mx-auto max-w-2xl rounded-2xl border-2 border-border bg-card p-10 print:rounded-none print:border-0">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">กระทรวงศึกษาธิการ</p>
          <h1 className="mt-1 text-xl font-bold">{school.name}</h1>
          {school.address && <p className="mt-1 text-sm text-muted-foreground">{school.address}</p>}
          {school.phone && <p className="text-sm text-muted-foreground">โทร. {school.phone}</p>}
          <div className="mt-4 border-t border-b border-foreground/20 py-2">
            <h2 className="text-lg font-bold tracking-wide">ใบรับรองสถานภาพการศึกษา</h2>
            <p className="text-base font-semibold">(ปพ.7)</p>
          </div>
        </div>

        {/* Certificate body */}
        <div className="mb-8 leading-relaxed text-sm space-y-4">
          <p className="text-right text-sm text-muted-foreground">วันที่ออกเอกสาร: {issueDateFormatted}</p>

          <p className="indent-8">
            ขอรับรองว่า{" "}
            <span className="font-semibold">{student.full_name}</span>{" "}
            เลขประจำตัวนักเรียน{" "}
            <span className="font-semibold">{student.code}</span>{" "}
            กำลังศึกษาอยู่ในระดับ{" "}
            <span className="font-semibold">{student.grade}</span>{" "}
            ห้อง{" "}
            <span className="font-semibold">{student.classroom}</span>{" "}
            ภาคเรียนที่{" "}
            <span className="font-semibold">{sem}</span>{" "}
            ปีการศึกษา{" "}
            <span className="font-semibold">{year}</span>{" "}
            ของ{school.name} เป็นนักเรียนที่มีสถานภาพสมบูรณ์ตามระเบียบกระทรวงศึกษาธิการ
          </p>

          {student.national_id && (
            <p>
              เลขประจำตัวประชาชน:{" "}
              <span className="font-semibold tracking-widest">{student.national_id}</span>
            </p>
          )}

          {student.birth_date && (
            <p>
              วันเดือนปีเกิด:{" "}
              <span className="font-semibold">{formatThaiDate(student.birth_date)}</span>
            </p>
          )}

          <p className="indent-8">
            ออกให้ ณ วันที่ {issueDateFormatted} เพื่อใช้เป็นหลักฐานแสดงสถานภาพการศึกษาของนักเรียนผู้นั้น
          </p>
        </div>

        {/* Signature block */}
        <div className="mt-16 flex justify-end">
          <div className="text-center w-64">
            <div className="mb-1 border-b border-dashed border-foreground/40 pb-10" />
            <p className="font-medium">ลงชื่อ ................................................</p>
            <p className="mt-1 text-sm text-muted-foreground">(ผู้อำนวยการโรงเรียน)</p>
            <p className="mt-1 text-sm text-muted-foreground">{school.name}</p>
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          เอกสารนี้ออกโดยระบบ ClassroomOS — ปพ.7 ใบรับรองความเป็นนักเรียน
        </p>
      </div>
    </div>
  );
}

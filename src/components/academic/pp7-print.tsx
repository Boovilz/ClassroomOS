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
    gender?: string | null;
    nationality?: string | null;
    religion?: string | null;
    father_name?: string | null;
    mother_name?: string | null;
  };
  school: {
    name: string;
    address?: string | null;
    phone?: string | null;
    principalName?: string | null;
  };
  issueDate?: string;
  academicYear?: string;
  semester?: string;
  documentNumber?: string;
  certPurpose?: string;
  showGpa?: boolean;
  gpa?: number | null;
  showAttendance?: boolean;
  attendanceRate?: number | null;
  showBehavior?: boolean;
  behaviorScore?: number | null;
  certText?: string;
  hidePrintButton?: boolean;
}

function formatThaiDate(dateStr?: string): string {
  if (!dateStr) return new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
  return new Date(dateStr).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
}

function formatNationalId(id?: string | null): string {
  if (!id) return "";
  const digits = id.replace(/\D/g, "");
  if (digits.length === 13) {
    return `${digits[0]}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10, 12)}-${digits[12]}`;
  }
  return id;
}

const genderLabel: Record<string, string> = { male: "ชาย", female: "หญิง", other: "อื่น ๆ" };

export function Pp7Print({
  student,
  school,
  issueDate,
  academicYear,
  semester,
  documentNumber,
  certPurpose,
  showGpa,
  gpa,
  showAttendance,
  attendanceRate,
  showBehavior,
  behaviorScore,
  certText,
  hidePrintButton,
}: Props) {
  const issueDateFormatted = issueDate ? formatThaiDate(issueDate) : formatThaiDate();
  const year = academicYear ?? String(new Date().getFullYear() + 543);
  const sem = semester ?? "1";
  const purpose = certPurpose?.trim() || "รับรองความเป็นนักเรียน";

  const hasExtraData = (showGpa && gpa != null) || (showAttendance && attendanceRate != null) || (showBehavior && behaviorScore != null);

  return (
    <div className="space-y-4">
      {!hidePrintButton && (
        <div className="flex justify-end print:hidden">
          <Button variant="outline" onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />
            พิมพ์ / บันทึก PDF
          </Button>
        </div>
      )}

      <div className="print-page mx-auto max-w-2xl rounded-2xl border-2 border-border bg-card p-10 print:rounded-none print:border-0">
        {/* Header */}
        <div className="mb-6 text-center">
          <p className="text-sm font-medium">กระทรวงศึกษาธิการ</p>
          <h1 className="mt-1 text-xl font-bold">{school.name}</h1>
          {school.address && <p className="mt-1 text-sm">{school.address}</p>}
          {school.phone && <p className="text-sm">โทร. {school.phone}</p>}
          <div className="mt-3 border-t border-b border-foreground/30 py-2">
            <h2 className="text-lg font-bold tracking-wide">ใบรับรองสถานภาพนักเรียน</h2>
            <p className="text-base font-semibold">(ปพ.7)</p>
          </div>
        </div>

        {/* Doc number + date row */}
        <div className="mb-4 flex justify-between text-sm">
          <span>เลขที่ {documentNumber || "…………………………………"}</span>
          <span>วันที่ {issueDateFormatted}</span>
        </div>

        {/* Certificate body */}
        <div className="mb-6 leading-loose text-sm space-y-3">
          <p className="indent-8">
            ขอรับรองว่า{" "}
            <span className="font-semibold">{student.full_name}</span>{" "}
            {student.gender ? <span>เพศ{genderLabel[student.gender] ?? student.gender} </span> : null}
            เลขประจำตัวประชาชน{" "}
            <span className="font-semibold tracking-widest">{formatNationalId(student.national_id) || "…………………………………"}</span>
            {student.birth_date ? (
              <span> เกิดวันที่ <span className="font-semibold">{formatThaiDate(student.birth_date)}</span></span>
            ) : null}
            {student.nationality ? <span> สัญชาติ{student.nationality}</span> : null}
            {student.religion ? <span> ศาสนา{student.religion}</span> : null}
          </p>

          {(student.father_name || student.mother_name) && (
            <p>
              {student.father_name && <span>บิดา <span className="font-semibold">{student.father_name}</span>  </span>}
              {student.mother_name && <span>มารดา <span className="font-semibold">{student.mother_name}</span></span>}
            </p>
          )}

          <p className="indent-8">
            เลขประจำตัวนักเรียน{" "}
            <span className="font-semibold">{student.code}</span>{" "}
            กำลังศึกษาอยู่ในระดับชั้น{" "}
            <span className="font-semibold">{student.grade}</span>{" "}
            ห้อง{" "}
            <span className="font-semibold">{student.classroom}</span>{" "}
            ภาคเรียนที่{" "}
            <span className="font-semibold">{sem}</span>{" "}
            ปีการศึกษา{" "}
            <span className="font-semibold">{year}</span>{" "}
            ของ{school.name} เป็นนักเรียนที่มีสถานภาพสมบูรณ์ตามระเบียบกระทรวงศึกษาธิการ
          </p>

          <p className="indent-8">หนังสือฉบับนี้ออกให้เพื่อ{purpose}</p>

          {/* Optional data table */}
          {hasExtraData && (
            <table className="w-full text-sm border border-border">
              <tbody>
                {showGpa && gpa != null && (
                  <tr className="border-b border-border">
                    <td className="px-3 py-1 font-medium bg-muted/40 w-1/2">ผลการเรียนเฉลี่ยสะสม (GPA)</td>
                    <td className="px-3 py-1">{gpa.toFixed(2)}</td>
                  </tr>
                )}
                {showAttendance && attendanceRate != null && (
                  <tr className="border-b border-border">
                    <td className="px-3 py-1 font-medium bg-muted/40">อัตราการเข้าเรียน</td>
                    <td className="px-3 py-1">{attendanceRate.toFixed(1)}%</td>
                  </tr>
                )}
                {showBehavior && behaviorScore != null && (
                  <tr>
                    <td className="px-3 py-1 font-medium bg-muted/40">คะแนนความประพฤติ</td>
                    <td className="px-3 py-1">{behaviorScore}</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {certText && <p className="indent-8 whitespace-pre-wrap">{certText}</p>}

          <p className="indent-8">
            ออกให้ ณ วันที่ {issueDateFormatted} เพื่อใช้เป็นหลักฐานแสดงสถานภาพการศึกษาของนักเรียนผู้นั้น
          </p>
        </div>

        {/* Dual signature block */}
        <div className="mt-12 grid grid-cols-2 gap-8 text-center text-sm">
          <div>
            <div className="mb-8 border-b border-dashed border-foreground/40" />
            <p>(……………………………………………)</p>
            <p>เจ้าหน้าที่ทะเบียน</p>
          </div>
          <div>
            <div className="mb-8 border-b border-dashed border-foreground/40" />
            <p>({school.principalName ?? "……………………………………………"})</p>
            <p>ผู้อำนวยการโรงเรียน</p>
            <p>{school.name}</p>
          </div>
        </div>

        {/* 60-day note */}
        <p className="mt-6 text-xs text-muted-foreground">
          หมายเหตุ ใบรับรองนี้มีอายุ 60 วัน นับจากวันที่ออก
        </p>
      </div>
    </div>
  );
}

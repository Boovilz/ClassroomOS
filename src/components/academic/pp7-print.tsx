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
  // NEW
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
          {/* Top-right meta */}
          <div className="flex justify-between items-start text-sm text-muted-foreground">
            <span>{documentNumber ? <span>เลขที่: <span className="font-semibold text-foreground">{documentNumber}</span></span> : null}</span>
            <span>วันที่ออกเอกสาร: {issueDateFormatted}</span>
          </div>

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

          {/* Purpose */}
          <p className="indent-8">
            หนังสือฉบับนี้ออกให้เพื่อ{purpose}
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

          {certText && (
            <p className="indent-8 whitespace-pre-wrap">{certText}</p>
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

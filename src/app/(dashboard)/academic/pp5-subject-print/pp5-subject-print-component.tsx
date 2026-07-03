"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface StudentRow {
  no: number;
  student_code: string;
  full_name: string;
  classroom: string | null;
  att_present: number;
  att_sick: number;
  att_personal: number;
  att_absent: number;
  att_total: number;
  att_pct: number | null;
  midterm: number | null;
  final: number | null;
  total: number | null;
  grade: string;
}

interface Props {
  schoolName: string;
  subjectCode: string;
  subjectName: string;
  credits: number;
  grade: string;
  classroom: string;
  academicYear: number;
  semester: number;
  teacherName: string;
  students: StudentRow[];
  gradeCount: Record<string, number>;
}

const GRADE_LEVELS = ["4", "3.5", "3", "2.5", "2", "1.5", "1", "0"];

export function Pp5SubjectPrint({
  schoolName,
  subjectCode,
  subjectName,
  credits,
  grade,
  classroom,
  academicYear,
  semester,
  teacherName,
  students,
  gradeCount,
}: Props) {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-lg font-bold">ปพ.5 — {subjectCode} {subjectName}</h1>
          <p className="text-sm text-muted-foreground">
            ชั้น {grade}{classroom ? `/${classroom}` : ""} ภาคเรียนที่ {semester}/{academicYear}
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          พิมพ์
        </Button>
      </div>

      {/* Page 1: Cover */}
      <div className="print-page mx-auto max-w-2xl border bg-white p-8 print:max-w-none print:border-0 print:shadow-none">
        <div className="mb-4 text-center">
          <p className="text-sm font-semibold">แบบบันทึกผลการพัฒนาคุณภาพของผู้เรียนรายวิชา</p>
          <p className="text-base font-bold">(ปพ.5)</p>
          <p className="text-sm">{schoolName}</p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-x-8 gap-y-1 border p-3 text-sm">
          <div className="flex gap-2">
            <span className="font-medium">รหัสวิชา:</span>
            <span>{subjectCode}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium">ชื่อวิชา:</span>
            <span>{subjectName}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium">หน่วยกิต:</span>
            <span>{credits}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium">ระดับชั้น:</span>
            <span>{grade}{classroom ? `/${classroom}` : ""}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium">ภาคเรียนที่:</span>
            <span>{semester}/{academicYear}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium">ครูผู้สอน:</span>
            <span>{teacherName}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium">จำนวนนักเรียน:</span>
            <span>{students.length} คน</span>
          </div>
        </div>

        {/* Grade distribution */}
        <p className="mb-2 text-sm font-semibold">สรุปผลการเรียน</p>
        <table className="mb-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border bg-gray-50">
              <th className="border px-2 py-1 text-center">ระดับผลการเรียน</th>
              {GRADE_LEVELS.map((g) => (
                <th key={g} className="border px-2 py-1 text-center">{g}</th>
              ))}
              <th className="border px-2 py-1 text-center">รวม</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border px-2 py-1 text-center font-medium">จำนวน (คน)</td>
              {GRADE_LEVELS.map((g) => (
                <td key={g} className="border px-2 py-1 text-center">{gradeCount[g] ?? 0}</td>
              ))}
              <td className="border px-2 py-1 text-center font-semibold">{students.length}</td>
            </tr>
          </tbody>
        </table>

        {/* Signatures */}
        <div className="mt-12 grid grid-cols-3 gap-4 text-center text-sm">
          {["ครูผู้สอน", "หัวหน้ากลุ่มสาระฯ", "ผู้อำนวยการโรงเรียน"].map((title) => (
            <div key={title}>
              <div className="mb-8 border-b border-dashed" />
              <p>({title === "ครูผู้สอน" ? teacherName : "............................"})</p>
              <p className="text-gray-500">{title}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Page 2: Student list */}
      <div className="print-page mx-auto max-w-2xl border bg-white p-8 print:max-w-none print:border-0 print:page-break-before-always">
        <div className="mb-4 text-center text-sm">
          <p className="font-semibold">รายชื่อนักเรียน</p>
          <p>วิชา {subjectCode} {subjectName} ชั้น {grade}{classroom ? `/${classroom}` : ""}</p>
        </div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border bg-gray-50">
              <th className="border px-2 py-1 text-center w-8">เลขที่</th>
              <th className="border px-2 py-1 text-center w-24">รหัส</th>
              <th className="border px-2 py-1 text-left">ชื่อ-นามสกุล</th>
              <th className="border px-2 py-1 text-center w-20">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.no} className="border">
                <td className="border px-2 py-1 text-center">{s.no}</td>
                <td className="border px-2 py-1 text-center">{s.student_code}</td>
                <td className="border px-2 py-1">{s.full_name}</td>
                <td className="border px-2 py-1" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Page 3: Attendance summary */}
      <div className="print-page mx-auto max-w-3xl border bg-white p-8 print:max-w-none print:border-0 print:page-break-before-always">
        <div className="mb-4 text-center text-sm">
          <p className="font-semibold">สรุปการมาเรียน</p>
          <p>วิชา {subjectCode} {subjectName} ชั้น {grade}{classroom ? `/${classroom}` : ""} ภาคเรียนที่ {semester}/{academicYear}</p>
        </div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border bg-gray-50">
              <th className="border px-2 py-1 text-center w-8">เลขที่</th>
              <th className="border px-2 py-1 text-left">ชื่อ-นามสกุล</th>
              <th className="border px-2 py-1 text-center w-10">มา</th>
              <th className="border px-2 py-1 text-center w-10">ลา</th>
              <th className="border px-2 py-1 text-center w-10">ป่วย</th>
              <th className="border px-2 py-1 text-center w-10">ขาด</th>
              <th className="border px-2 py-1 text-center w-12">รวม</th>
              <th className="border px-2 py-1 text-center w-14">ร้อยละ</th>
              <th className="border px-2 py-1 text-center w-14">สิทธิ์สอบ</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const eligible = s.att_pct === null || s.att_pct >= 80;
              return (
                <tr key={s.no} className="border">
                  <td className="border px-2 py-1 text-center">{s.no}</td>
                  <td className="border px-2 py-1">{s.full_name}</td>
                  <td className="border px-2 py-1 text-center">{s.att_present}</td>
                  <td className="border px-2 py-1 text-center">{s.att_personal}</td>
                  <td className="border px-2 py-1 text-center">{s.att_sick}</td>
                  <td className="border px-2 py-1 text-center">{s.att_absent}</td>
                  <td className="border px-2 py-1 text-center">{s.att_total}</td>
                  <td className="border px-2 py-1 text-center">{s.att_pct !== null ? `${s.att_pct}%` : "-"}</td>
                  <td className="border px-2 py-1 text-center font-medium">{s.att_total > 0 ? (eligible ? "มีสิทธิ์" : "ไม่มีสิทธิ์") : "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Page 4: Score summary */}
      <div className="print-page mx-auto max-w-3xl border bg-white p-8 print:max-w-none print:border-0 print:page-break-before-always">
        <div className="mb-4 text-center text-sm">
          <p className="font-semibold">สรุปผลการเรียน</p>
          <p>วิชา {subjectCode} {subjectName} ชั้น {grade}{classroom ? `/${classroom}` : ""} ภาคเรียนที่ {semester}/{academicYear}</p>
        </div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border bg-gray-50">
              <th className="border px-2 py-1 text-center w-8">เลขที่</th>
              <th className="border px-2 py-1 text-left">ชื่อ-นามสกุล</th>
              <th className="border px-2 py-1 text-center w-16">กลางภาค (20)</th>
              <th className="border px-2 py-1 text-center w-16">ปลายภาค (30)</th>
              <th className="border px-2 py-1 text-center w-16">คะแนนรวม (100)</th>
              <th className="border px-2 py-1 text-center w-14">ระดับ</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.no} className="border">
                <td className="border px-2 py-1 text-center">{s.no}</td>
                <td className="border px-2 py-1">{s.full_name}</td>
                <td className="border px-2 py-1 text-center">{s.midterm !== null ? s.midterm.toFixed(1) : "-"}</td>
                <td className="border px-2 py-1 text-center">{s.final !== null ? s.final.toFixed(1) : "-"}</td>
                <td className="border px-2 py-1 text-center font-medium">{s.total !== null ? s.total.toFixed(1) : "-"}</td>
                <td className="border px-2 py-1 text-center font-bold">{s.grade}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 grid grid-cols-2 gap-12 text-center text-sm">
          <div>
            <div className="mb-8 border-b border-dashed" />
            <p>({teacherName})</p>
            <p className="text-gray-500">ครูผู้สอน</p>
          </div>
          <div>
            <div className="mb-8 border-b border-dashed" />
            <p>(................................................)</p>
            <p className="text-gray-500">ผู้อำนวยการโรงเรียน</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          .print\\:hidden { display: none !important; }
          .print\\:page-break-before-always { page-break-before: always; }
          .print\\:border-0 { border: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:max-w-none { max-width: none !important; }
        }
      `}</style>
    </div>
  );
}

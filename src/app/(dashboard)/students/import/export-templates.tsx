"use client";

import { CsvExportButton } from "@/components/health/export-buttons";

/**
 * Header-only CSV templates (no new dependency — reuses the existing
 * CsvExportButton/exportToCsv client-side CSV builder from Module 7). One
 * template per data domain; columns match exactly what parser.ts's
 * COLUMN_ALIASES expects, in Thai labels matching the manual
 * student-form-dialog's field labels where an equivalent field exists.
 */
const TEMPLATES: { key: string; label: string; filename: string; headers: string[] }[] = [
  {
    key: "student",
    label: "นักเรียน (Student)",
    filename: "template-student.csv",
    headers: ["รหัสนักเรียน", "ชื่อ-นามสกุล", "ชื่อเล่น", "เพศ", "วันเกิด", "เลขประจำตัวประชาชน", "เบอร์โทรศัพท์", "ระดับชั้น", "ห้องเรียน", "ระดับความเสี่ยง"],
  },
  {
    key: "parent",
    label: "ผู้ปกครอง (Parent)",
    filename: "template-parent.csv",
    headers: ["รหัสนักเรียน", "ชื่อผู้ปกครอง", "ความสัมพันธ์", "เบอร์โทรผู้ปกครอง", "ไลน์ผู้ปกครอง"],
  },
  {
    key: "health",
    label: "สุขภาพ (Health)",
    filename: "template-health.csv",
    headers: ["รหัสนักเรียน", "ส่วนสูง", "น้ำหนัก", "ประวัติแพ้", "โรคประจำตัว"],
  },
  {
    key: "finance",
    label: "การเงิน (Finance)",
    filename: "template-finance.csv",
    headers: ["รหัสนักเรียน", "ชื่อ-นามสกุล"],
  },
  {
    key: "sdq",
    label: "SDQ",
    filename: "template-sdq.csv",
    headers: ["รหัสนักเรียน", "ชื่อ-นามสกุล", "ระดับชั้น", "ห้องเรียน"],
  },
  {
    key: "academic",
    label: "วิชาการ (Academic)",
    filename: "template-academic.csv",
    headers: ["รหัสนักเรียน", "ชื่อ-นามสกุล", "ระดับชั้น", "ห้องเรียน"],
  },
];

export function ExportTemplates() {
  return (
    <div className="glass-card space-y-3 rounded-2xl p-4">
      <h2 className="text-sm font-semibold">ดาวน์โหลดเทมเพลต</h2>
      <p className="text-xs text-muted-foreground">
        ดาวน์โหลดไฟล์ CSV เปล่า (มีแต่หัวคอลัมน์) เพื่อกรอกข้อมูลก่อนนำเข้า — คอลัมน์ตรงกับที่ระบบนำเข้ารองรับ
      </p>
      <div className="flex flex-wrap gap-2">
        {TEMPLATES.map((tpl) => (
          <CsvExportButton key={tpl.key} filename={tpl.filename} headers={tpl.headers} rows={[]} label={tpl.label} />
        ))}
      </div>
    </div>
  );
}

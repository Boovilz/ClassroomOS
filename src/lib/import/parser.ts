import * as XLSX from "xlsx";
import type { ImportRow } from "./types";

/**
 * Column alias map: source-file header (English or Thai) -> internal
 * `ImportRow` field. SheetJS parses both .xlsx/.xls and .csv through the
 * same `read`/`utils.sheet_to_json` call so there is only one parser code
 * path (per the task spec).
 */
export const COLUMN_ALIASES: Record<string, keyof ImportRow | "ignore"> = {
  // generic English
  student_code: "student_code",
  full_name: "full_name",
  nickname: "nickname",
  gender: "gender",
  birth_date: "birth_date",
  citizen_id: "citizen_id",
  phone_number: "phone_number",
  grade: "grade",
  classroom: "classroom",
  risk_level: "risk_level",
  parent_full_name: "parent_full_name",
  parent_relationship: "parent_relationship",
  parent_phone: "parent_phone",
  parent_line_id: "parent_line_id",
  height_cm: "height_cm",
  weight_kg: "weight_kg",
  allergies: "allergies",
  chronic_conditions: "chronic_conditions",

  // Thai labels (manual form / generic Thai export)
  รหัสนักเรียน: "student_code",
  "ชื่อ-นามสกุล": "full_name",
  ชื่อเล่น: "nickname",
  เพศ: "gender",
  วันเกิด: "birth_date",
  เลขประจำตัวประชาชน: "citizen_id",
  เบอร์โทรศัพท์: "phone_number",
  ระดับชั้น: "grade",
  ห้องเรียน: "classroom",
  ระดับความเสี่ยง: "risk_level",
  ชื่อผู้ปกครอง: "parent_full_name",
  ความสัมพันธ์: "parent_relationship",
  เบอร์โทรผู้ปกครอง: "parent_phone",
  ไลน์ผู้ปกครอง: "parent_line_id",
  ส่วนสูง: "height_cm",
  น้ำหนัก: "weight_kg",
  ประวัติแพ้: "allergies",
  โรคประจำตัว: "chronic_conditions",

  // DMC (ฐานข้อมูลกลาง สพฐ.) export columns - name parts are combined into
  // full_name separately below since DMC splits them into their own columns.
  ชั้น: "grade",
  ห้อง: "classroom",
  "หมายเลขโทรศัพท์ของผู้ปกครอง": "parent_phone",
  "ความเกี่ยวข้องของผู้ปกครองกับนักเรียน": "parent_relationship",
};

/** DMC splits a student's name across these columns; combined into full_name. */
const DMC_STUDENT_NAME_COLUMNS = ["คำนำหน้าชื่อ", "ชื่อ", "นามสกุล"];
/** DMC splits the guardian's name the same way; combined into parent_full_name. */
const DMC_PARENT_NAME_COLUMNS = ["คำนำหน้าชื่อผู้ปกครอง", "ชื่อผู้ปกครอง", "นามสกุลผู้ปกครอง"];

function joinNameParts(raw: Record<string, string>, columns: string[]): string {
  return columns
    .map((col) => raw[col]?.trim())
    .filter(Boolean)
    .join(" ");
}

const GENDER_ALIASES: Record<string, "male" | "female" | "other"> = {
  male: "male",
  female: "female",
  other: "other",
  ชาย: "male",
  หญิง: "female",
  ม: "male",
  ญ: "female",
  "1": "male",
  "2": "female",
};

const RELATIONSHIP_ALIASES: Record<string, "father" | "mother" | "guardian" | "other"> = {
  father: "father",
  mother: "mother",
  guardian: "guardian",
  other: "other",
  บิดา: "father",
  พ่อ: "father",
  มารดา: "mother",
  แม่: "mother",
  ผู้ปกครอง: "guardian",
  อื่นๆ: "other",
};

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

/**
 * Parses an Excel (.xlsx/.xls) or CSV file (as an ArrayBuffer) into rows of
 * raw string cells, using the first sheet. SheetJS's `read()` auto-detects
 * CSV vs binary workbook formats, so one code path handles both.
 */
export function parseSpreadsheet(buffer: ArrayBuffer): { rawHeaders: string[]; rawRows: Record<string, string>[] } {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });

  if (json.length === 0) return { rawHeaders: [], rawRows: [] };

  const rawHeaders = Object.keys(json[0]);
  const rawRows = json.map((record) => {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      out[key] = normalizeCell(value);
    }
    return out;
  });

  return { rawHeaders, rawRows };
}

/**
 * Maps raw header->value rows (from parseSpreadsheet or a generic API
 * payload that already used English keys) onto the shared
 * `ImportRow` shape used by validation/duplicate-detection/commit. Unknown
 * columns are kept in `raw` for display but otherwise ignored.
 *
 * `defaults` lets the "mass import level" UI (classroom/grade/school scope)
 * apply one shared grade/classroom value to every row when the source file
 * doesn't include that column itself.
 */
export function mapRawRowsToImportRows(
  rawRows: Record<string, string>[],
  defaults?: { grade?: string; classroom?: string }
): ImportRow[] {
  return rawRows.map((raw, idx) => {
    const mapped: Partial<ImportRow> = {};
    for (const [header, value] of Object.entries(raw)) {
      const field = COLUMN_ALIASES[header.trim()];
      if (!field || field === "ignore" || !value) continue;
      (mapped as Record<string, string>)[field] = value;
    }

    if (!mapped.full_name) {
      const dmcName = joinNameParts(raw, DMC_STUDENT_NAME_COLUMNS);
      if (dmcName) mapped.full_name = dmcName;
    }
    if (!mapped.parent_full_name) {
      const dmcParentName = joinNameParts(raw, DMC_PARENT_NAME_COLUMNS);
      if (dmcParentName) mapped.parent_full_name = dmcParentName;
    }

    if (mapped.gender) {
      mapped.gender = GENDER_ALIASES[mapped.gender.toLowerCase().trim()] ?? undefined;
    }
    if (mapped.parent_relationship) {
      mapped.parent_relationship =
        RELATIONSHIP_ALIASES[mapped.parent_relationship.toLowerCase().trim()] ?? undefined;
    }
    if (mapped.risk_level && !["low", "medium", "high"].includes(mapped.risk_level)) {
      mapped.risk_level = undefined;
    }

    if (defaults?.grade && !mapped.grade) mapped.grade = defaults.grade;
    if (defaults?.classroom && !mapped.classroom) mapped.classroom = defaults.classroom;

    return {
      rowNumber: idx + 2, // +1 for 1-based, +1 for header row
      student_code: mapped.student_code ?? "",
      full_name: mapped.full_name ?? "",
      nickname: mapped.nickname,
      gender: mapped.gender,
      birth_date: mapped.birth_date,
      citizen_id: mapped.citizen_id,
      phone_number: mapped.phone_number,
      grade: mapped.grade,
      classroom: mapped.classroom,
      risk_level: mapped.risk_level,
      parent_full_name: mapped.parent_full_name,
      parent_relationship: mapped.parent_relationship,
      parent_phone: mapped.parent_phone,
      parent_line_id: mapped.parent_line_id,
      height_cm: mapped.height_cm,
      weight_kg: mapped.weight_kg,
      allergies: mapped.allergies,
      chronic_conditions: mapped.chronic_conditions,
      raw,
    };
  });
}

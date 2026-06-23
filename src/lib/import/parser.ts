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
  const byBaseName = new Map<string, string>();
  for (const [header, value] of Object.entries(raw)) {
    byBaseName.set(baseHeaderName(header), value);
  }
  return columns
    .map((col) => byBaseName.get(col)?.trim())
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
  ช: "male",
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
  ปู่: "other",
  ย่า: "other",
  ตา: "other",
  ยาย: "other",
  ลุง: "other",
  ป้า: "other",
  อา: "other",
  น้า: "other",
};

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

/**
 * Some export tools (e.g. DMC school reports) prepend a "report generated
 * at ..." line above the real header row. Pick the row, among the first
 * few, with the most cells matching a known column alias - the actual
 * header row scores far higher than a one-off metadata line.
 */
function findHeaderRowIndex(rows: unknown[][]): number {
  let bestIndex = 0;
  let bestScore = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i] ?? [];
    const score = row.filter((cell) => COLUMN_ALIASES[String(cell ?? "").trim()] !== undefined).length;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return bestIndex;
}

/**
 * Parses an Excel (.xlsx/.xls) or CSV file (as an ArrayBuffer) into rows of
 * raw string cells, using the first sheet. SheetJS's `read()` auto-detects
 * CSV vs binary workbook formats, so one code path handles both.
 *
 * Reads in array-of-arrays mode (rather than letting SheetJS build header
 * keyed objects directly) for two reasons: some exports have a metadata row
 * above the real header, and some exports reuse the same header text for
 * two different columns (e.g. citizen ID mislabeled with the student-code
 * header) - building objects by header name alone would silently drop one
 * of the two columns since the later one overwrites the key.
 */
export function parseSpreadsheet(buffer: ArrayBuffer): { rawHeaders: string[]; rawRows: Record<string, string>[] } {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });

  if (rows.length === 0) return { rawHeaders: [], rawRows: [] };

  const headerRowIndex = findHeaderRowIndex(rows);
  const headerRow = rows[headerRowIndex] ?? [];

  // Disambiguate duplicate header text by column position: each occurrence
  // beyond the first gets a `__2`, `__3`, ... suffix stripped again at
  // alias-lookup time, so downstream mapping can inspect both columns'
  // values instead of one silently clobbering the other.
  const seenHeaderCounts = new Map<string, number>();
  const rawHeaders = headerRow.map((cell) => {
    const name = String(cell ?? "").trim();
    const count = (seenHeaderCounts.get(name) ?? 0) + 1;
    seenHeaderCounts.set(name, count);
    return count > 1 ? `${name}__${count}` : name;
  });

  const rawRows = rows.slice(headerRowIndex + 1).map((row) => {
    const out: Record<string, string> = {};
    rawHeaders.forEach((header, i) => {
      if (!header) return;
      out[header] = normalizeCell(row[i]);
    });
    return out;
  });

  return { rawHeaders, rawRows };
}

/** Strips the `__2`, `__3`, ... disambiguation suffix added for duplicate headers. */
function baseHeaderName(header: string): string {
  return header.replace(/__\d+$/, "");
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
      const field = COLUMN_ALIASES[baseHeaderName(header).trim()];
      if (!field || field === "ignore" || !value) continue;

      // A 13-digit value under a "student_code" header is actually a Thai
      // citizen ID mislabeled by the export tool (seen in some DMC-derived
      // reports that reuse the same header text for both columns).
      if (field === "student_code" && /^\d{13}$/.test(value)) {
        if (!mapped.citizen_id) mapped.citizen_id = value;
        continue;
      }

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

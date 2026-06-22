import type { ImportRow, RowValidationResult } from "./types";

const RELATIONSHIP_VALUES = new Set(["father", "mother", "guardian", "other"]);

/** Thai 13-digit citizen ID checksum (mod-11 algorithm used on Thai ID cards). */
export function isValidThaiCitizenId(id: string): boolean {
  const digits = id.replace(/\D/g, "");
  if (digits.length !== 13) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(digits[i]) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === Number(digits[12]);
}

export function isValidThaiPhone(phone: string): boolean {
  const digits = phone.replace(/[\s-]/g, "");
  return /^0[0-9]{8,9}$/.test(digits);
}

export function isValidDateString(value: string): boolean {
  if (!value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

/**
 * Validates a single normalized ImportRow. Required-field violations become
 * `errors` (block the row); everything else (missing-but-expected fields,
 * format issues, unknown classroom) becomes a `warning` (allow proceeding).
 * Cross-row checks (duplicate student_code within the same file) are passed
 * in via `seenCodes` so the caller can run this once per row in a loop.
 */
export function validateRow(
  row: ImportRow,
  context: { knownClassrooms: Set<string>; seenCodesInBatch: Map<string, number[]> }
): RowValidationResult {
  const errors: RowValidationResult["errors"] = [];
  const warnings: RowValidationResult["warnings"] = [];

  // Required fields (mirrors studentSchema's authoritative required set:
  // student_code, full_name).
  if (!row.student_code || row.student_code.trim().length === 0) {
    errors.push({ field: "student_code", message: "กรุณากรอกรหัสนักเรียน" });
  }
  if (!row.full_name || row.full_name.trim().length < 2) {
    errors.push({ field: "full_name", message: "กรุณากรอกชื่อ-นามสกุล" });
  }

  // Duplicate-within-same-file detection.
  if (row.student_code) {
    const occurrences = context.seenCodesInBatch.get(row.student_code) ?? [];
    if (occurrences.length > 1) {
      errors.push({
        field: "student_code",
        message: `รหัสนักเรียนซ้ำกันในไฟล์เดียวกัน (แถวที่ ${occurrences.join(", ")})`,
      });
    }
  }

  // Missing-but-commonly-expected fields -> warnings only.
  if (!row.gender) warnings.push({ field: "gender", message: "ไม่ได้ระบุเพศ" });
  if (!row.birth_date) warnings.push({ field: "birth_date", message: "ไม่ได้ระบุวันเกิด" });
  if (!row.grade) warnings.push({ field: "grade", message: "ไม่ได้ระบุระดับชั้น" });
  if (!row.classroom) warnings.push({ field: "classroom", message: "ไม่ได้ระบุห้องเรียน" });

  // Format checks (warnings - real-world data is messy, don't hard-block).
  if (row.citizen_id && !isValidThaiCitizenId(row.citizen_id)) {
    warnings.push({ field: "citizen_id", message: "เลขประจำตัวประชาชนไม่ถูกต้อง (checksum ไม่ผ่าน)" });
  }
  if (row.phone_number && !isValidThaiPhone(row.phone_number)) {
    warnings.push({ field: "phone_number", message: "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง" });
  }
  if (row.parent_phone && !isValidThaiPhone(row.parent_phone)) {
    warnings.push({ field: "parent_phone", message: "รูปแบบเบอร์โทรผู้ปกครองไม่ถูกต้อง" });
  }
  if (row.birth_date && !isValidDateString(row.birth_date)) {
    warnings.push({ field: "birth_date", message: "รูปแบบวันเกิดไม่ถูกต้อง" });
  }

  // Invalid classroom — warning, not a hard block (a brand-new classroom is legitimate).
  if (row.classroom && context.knownClassrooms.size > 0 && !context.knownClassrooms.has(row.classroom)) {
    warnings.push({ field: "classroom", message: `ห้องเรียน "${row.classroom}" ไม่ตรงกับห้องเรียนที่มีอยู่ในระบบ (อาจเป็นห้องใหม่)` });
  }

  // Invalid parent relationship enum.
  if (row.parent_relationship && !RELATIONSHIP_VALUES.has(row.parent_relationship)) {
    warnings.push({
      field: "parent_relationship",
      message: "ความสัมพันธ์ผู้ปกครองต้องเป็นหนึ่งใน father/mother/guardian/other",
    });
  }
  if (row.parent_full_name && !row.parent_relationship) {
    warnings.push({ field: "parent_relationship", message: "มีชื่อผู้ปกครองแต่ไม่ได้ระบุความสัมพันธ์" });
  }

  return { rowNumber: row.rowNumber, errors, warnings };
}

/** Builds the seenCodesInBatch map used by validateRow's in-file duplicate check. */
export function buildSeenCodesMap(rows: ImportRow[]): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (const row of rows) {
    if (!row.student_code) continue;
    const list = map.get(row.student_code) ?? [];
    list.push(row.rowNumber);
    map.set(row.student_code, list);
  }
  return map;
}

export function validateBatch(rows: ImportRow[], knownClassrooms: Set<string>): RowValidationResult[] {
  const seenCodesInBatch = buildSeenCodesMap(rows);
  return rows.map((row) => validateRow(row, { knownClassrooms, seenCodesInBatch }));
}

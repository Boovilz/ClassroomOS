/**
 * Shared row shape that every import source (Excel/CSV, Google Sheets, DMC
 * preset, generic API, QR) normalizes to before it hits the shared
 * validation -> duplicate-detection -> commit pipeline. Field names mirror
 * `studentSchema` (src/lib/validations/student.ts) plus a few plain string
 * columns the importer additionally understands (parent_*, health_*).
 */
export interface ImportRow {
  /** 1-based row number within the source file/batch, for error reporting. */
  rowNumber: number;
  student_code: string;
  full_name: string;
  nickname?: string;
  gender?: "male" | "female" | "other";
  birth_date?: string;
  citizen_id?: string;
  phone_number?: string;
  grade?: string;
  classroom?: string;
  risk_level?: "low" | "medium" | "high";

  // Parent (single inline parent, same as the manual form)
  parent_full_name?: string;
  parent_relationship?: "father" | "mother" | "guardian" | "other";
  parent_phone?: string;
  parent_line_id?: string;

  // Health (only written if present - see health_records insert pattern)
  height_cm?: string;
  weight_kg?: string;
  allergies?: string;
  chronic_conditions?: string;

  /** Raw source cells, kept for display in the review table. */
  raw: Record<string, string>;
}

export type ImportSource = "excel" | "csv" | "google_sheets" | "dmc" | "api" | "qr";

export type DuplicateStrategy = "skip" | "update" | "merge" | "create_new";

export interface ValidationIssue {
  field?: string;
  message: string;
}

export interface RowValidationResult {
  rowNumber: number;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface DuplicateMatch {
  studentId: string;
  matchedOn: "student_code" | "citizen_id" | "phone_number" | "full_name_birth_date";
  existing: Record<string, unknown>;
}

export interface ReviewRow {
  row: ImportRow;
  validation: RowValidationResult;
  duplicate: DuplicateMatch | null;
  strategy: DuplicateStrategy;
}

export interface CommitRowResult {
  rowNumber: number;
  studentId: string | null;
  action: "created" | "updated" | "merged" | "skipped" | "failed";
  previousValues: Record<string, unknown> | null;
  errorMessage: string | null;
}

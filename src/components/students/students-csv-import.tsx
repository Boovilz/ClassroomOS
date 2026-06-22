"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload } from "lucide-react";

// Expected CSV header columns (Thai labels are accepted too via a small
// alias map below). Only the fields that map onto `studentSchema` /
// the `students` table are read - extra columns are ignored.
const COLUMN_ALIASES: Record<string, string> = {
  student_code: "student_code",
  รหัสนักเรียน: "student_code",
  full_name: "full_name",
  "ชื่อ-นามสกุล": "full_name",
  nickname: "nickname",
  ชื่อเล่น: "nickname",
  gender: "gender",
  เพศ: "gender",
  grade: "grade",
  ระดับชั้น: "grade",
  classroom: "classroom",
  ห้องเรียน: "classroom",
  citizen_id: "citizen_id",
  เลขประจำตัวประชาชน: "citizen_id",
};

interface ParsedRow {
  line: number;
  values: Record<string, string>;
}

interface ImportResult {
  line: number;
  studentCode: string;
  success: boolean;
  error?: string;
}

function parseCsv(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text
    .replace(/^﻿/, "")
    .split(/\r\n|\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const splitLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map((v) => v.trim());
  };

  const rawHeaders = splitLine(lines[0]);
  const headers = rawHeaders.map((h) => COLUMN_ALIASES[h] ?? h);

  const rows: ParsedRow[] = lines.slice(1).map((line, idx) => {
    const values = splitLine(line);
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      record[h] = values[i] ?? "";
    });
    return { line: idx + 2, values: record };
  });

  return { headers, rows };
}

export function StudentsCsvImport({ schoolId }: { schoolId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);

  async function handleFile(file: File) {
    setImporting(true);
    setResults(null);
    const text = await file.text();
    const { rows } = parseCsv(text);

    if (rows.length === 0) {
      toast.error("ไม่พบข้อมูลในไฟล์ CSV");
      setImporting(false);
      return;
    }

    const supabase = createClient();
    const outcomes: ImportResult[] = [];

    for (const row of rows) {
      const studentCode = row.values.student_code?.trim();
      const fullName = row.values.full_name?.trim();

      if (!studentCode || !fullName) {
        outcomes.push({
          line: row.line,
          studentCode: studentCode || "(ไม่มี)",
          success: false,
          error: "ต้องมีรหัสนักเรียนและชื่อ-นามสกุล",
        });
        continue;
      }

      const genderRaw = row.values.gender?.trim().toLowerCase();
      const gender: "male" | "female" | "other" | undefined =
        genderRaw === "male" || genderRaw === "female" || genderRaw === "other" ? genderRaw : undefined;
      const payload = {
        school_id: schoolId,
        student_code: studentCode,
        full_name: fullName,
        nickname: row.values.nickname?.trim() || null,
        gender,
        grade: row.values.grade?.trim() || null,
        classroom: row.values.classroom?.trim() || null,
        citizen_id: row.values.citizen_id?.trim() || null,
      };

      const { data: inserted, error } = await supabase.from("students").insert(payload).select("id").single();
      if (error) {
        outcomes.push({ line: row.line, studentCode, success: false, error: error.message });
        continue;
      }

      void logAudit({
        schoolId,
        action: "create",
        entityTable: "students",
        entityId: inserted.id,
        metadata: { student_code: studentCode, full_name: fullName, bulk_import: true },
      });
      outcomes.push({ line: row.line, studentCode, success: true });
    }

    setResults(outcomes);
    setImporting(false);
    const successCount = outcomes.filter((o) => o.success).length;
    const failCount = outcomes.length - successCount;
    if (failCount === 0) {
      toast.success(`นำเข้าสำเร็จ ${successCount} รายการ`);
    } else {
      toast.warning(`นำเข้าสำเร็จ ${successCount} รายการ, ล้มเหลว ${failCount} รายการ`);
    }
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setResults(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          นำเข้า CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>นำเข้านักเรียนจาก CSV</DialogTitle>
          <DialogDescription>
            คอลัมน์ที่รองรับ: student_code, full_name, nickname, gender, grade, classroom, citizen_id (หรือชื่อภาษาไทยที่ตรงกัน)
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="block w-full text-sm"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          disabled={importing}
        />

        {results && (
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2 text-xs">
            {results.map((r, i) => (
              <div key={i} className={r.success ? "text-emerald-green" : "text-destructive"}>
                แถวที่ {r.line} ({r.studentCode}): {r.success ? "สำเร็จ" : `ล้มเหลว - ${r.error}`}
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            ปิด
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

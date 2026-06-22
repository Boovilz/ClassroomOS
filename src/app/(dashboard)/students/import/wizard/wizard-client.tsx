"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, ArrowRight, CheckCircle2, FileSpreadsheet } from "lucide-react";

import { parseSpreadsheet, mapRawRowsToImportRows } from "@/lib/import/parser";
import { validateBatch } from "@/lib/import/validation";
import { DMC_DISCLOSURE_TH, DMC_EXPECTED_COLUMNS } from "@/lib/import/dmc-preset";
import type { DuplicateMatch, DuplicateStrategy, ImportRow, ImportSource, RowValidationResult } from "@/lib/import/types";
import { commitImportBatch, findDuplicatesForReview, getKnownClassrooms } from "@/app/(dashboard)/students/import/wizard/actions";

type Scope = "single" | "classroom" | "grade" | "school";

const SOURCE_OPTIONS: { value: ImportSource; label: string }[] = [
  { value: "excel", label: "Excel / CSV" },
  { value: "dmc", label: "OBEC DMC (Demo Mode)" },
  { value: "google_sheets", label: "Google Sheets" },
  { value: "api", label: "API (สำหรับนักพัฒนา)" },
  { value: "qr", label: "สแกน QR (1 คน)" },
];

const STRATEGY_LABEL: Record<DuplicateStrategy, string> = {
  skip: "ข้าม",
  update: "อัปเดต (เขียนทับ)",
  merge: "ผสาน (เติมเฉพาะที่ว่าง)",
  create_new: "สร้างใหม่",
};

export function ImportWizard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [scope, setScope] = useState<Scope>("classroom");
  const [scopeValue, setScopeValue] = useState("");
  const [source, setSource] = useState<ImportSource>("excel");

  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [sheetsResult, setSheetsResult] = useState<{ ok: boolean; notConfigured?: boolean; message?: string } | null>(null);
  const [qrPayload, setQrPayload] = useState("");

  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [validations, setValidations] = useState<Map<number, RowValidationResult>>(new Map());
  const [duplicates, setDuplicates] = useState<Map<number, DuplicateMatch | null>>(new Map());
  const [batchStrategy, setBatchStrategy] = useState<DuplicateStrategy>("skip");
  const [perRowStrategy, setPerRowStrategy] = useState<Map<number, DuplicateStrategy>>(new Map());
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<{ importJobId: string; succeededCount: number; updatedCount: number; failedCount: number } | null>(null);

  const defaults = useMemo(() => {
    if (scope === "classroom" && scopeValue) return { classroom: scopeValue };
    if (scope === "grade" && scopeValue) return { grade: scopeValue };
    return undefined;
  }, [scope, scopeValue]);

  async function runAnalysis(importRows: ImportRow[]) {
    setLoading(true);
    try {
      const knownClassrooms = new Set(await getKnownClassrooms());
      const validationResults = validateBatch(importRows, knownClassrooms);
      const validationMap = new Map(validationResults.map((v) => [v.rowNumber, v]));
      setValidations(validationMap);

      const dupMap = await findDuplicatesForReview(importRows);
      const map = new Map<number, DuplicateMatch | null>();
      for (const row of importRows) {
        map.set(row.rowNumber, dupMap[row.rowNumber] ?? null);
      }
      setDuplicates(map);
      setRows(importRows);
      setStep(3);
    } catch (err) {
      toast.error("วิเคราะห์ข้อมูลไม่สำเร็จ", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setLoading(false);
    }
  }

  async function handleFile(file: File) {
    setFileName(file.name);
    const buffer = await file.arrayBuffer();
    const { rawRows } = parseSpreadsheet(buffer);
    if (rawRows.length === 0) {
      toast.error("ไม่พบข้อมูลในไฟล์");
      return;
    }
    const importRows = mapRawRowsToImportRows(rawRows, defaults);
    await runAnalysis(importRows);
  }

  async function handleQrPayload() {
    if (!qrPayload.trim()) return;
    let parsed: Partial<ImportRow>;
    try {
      parsed = JSON.parse(qrPayload);
    } catch {
      toast.error("QR payload ไม่ใช่ JSON ที่ถูกต้อง");
      return;
    }
    const row: ImportRow = {
      rowNumber: 1,
      student_code: parsed.student_code ?? "",
      full_name: parsed.full_name ?? "",
      nickname: parsed.nickname,
      gender: parsed.gender,
      birth_date: parsed.birth_date,
      citizen_id: parsed.citizen_id,
      phone_number: parsed.phone_number,
      grade: parsed.grade ?? defaults?.grade,
      classroom: parsed.classroom ?? defaults?.classroom,
      risk_level: parsed.risk_level,
      parent_full_name: parsed.parent_full_name,
      parent_relationship: parsed.parent_relationship,
      parent_phone: parsed.parent_phone,
      parent_line_id: parsed.parent_line_id,
      height_cm: parsed.height_cm,
      weight_kg: parsed.weight_kg,
      allergies: parsed.allergies,
      chronic_conditions: parsed.chronic_conditions,
      raw: {},
    };
    setFileName("QR scan");
    await runAnalysis([row]);
  }

  async function handleGoogleSheetsFetch() {
    if (!sheetUrl.trim()) return;
    setLoading(true);
    setSheetsResult(null);
    try {
      const res = await fetch("/api/students/import/google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetUrl, sheetName, defaults }),
      });
      const data = await res.json();
      if (!data.ok) {
        setSheetsResult({ ok: false, notConfigured: data.notConfigured, message: data.message });
        setLoading(false);
        return;
      }
      setFileName(`Google Sheets: ${sheetUrl}`);
      await runAnalysis(data.rows as ImportRow[]);
    } catch (err) {
      setSheetsResult({ ok: false, message: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" });
    } finally {
      setLoading(false);
    }
  }

  function rowStrategy(rowNumber: number): DuplicateStrategy {
    return perRowStrategy.get(rowNumber) ?? batchStrategy;
  }

  async function handleCommit() {
    setCommitting(true);
    try {
      const blockedRowNumbers = new Set(
        Array.from(validations.values())
          .filter((v) => v.errors.length > 0)
          .map((v) => v.rowNumber)
      );
      const committable = rows
        .filter((r) => !blockedRowNumbers.has(r.rowNumber))
        .map((row) => ({ row, strategy: rowStrategy(row.rowNumber) }));

      const res = await commitImportBatch({ source, fileName, rows: committable });
      if (!res.ok) {
        toast.error("นำเข้าไม่สำเร็จ", { description: res.message });
        return;
      }
      setResult({ importJobId: res.importJobId, succeededCount: res.succeededCount, updatedCount: res.updatedCount, failedCount: res.failedCount });
      setStep(5);
      toast.success("นำเข้าข้อมูลเสร็จสิ้น");
    } finally {
      setCommitting(false);
    }
  }

  const errorCount = Array.from(validations.values()).filter((v) => v.errors.length > 0).length;
  const warningCount = Array.from(validations.values()).filter((v) => v.warnings.length > 0).length;
  const duplicateCount = Array.from(duplicates.values()).filter((d) => d !== null).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {["1. ขอบเขต/แหล่งข้อมูล", "2. อัปโหลด/เชื่อมต่อ", "3. ตรวจสอบข้อมูล", "4. ยืนยัน", "5. สรุปผล"].map((label, idx) => (
          <span key={label} className={idx + 1 === step ? "font-semibold text-primary" : ""}>
            {label}
            {idx < 4 ? " → " : ""}
          </span>
        ))}
      </div>

      {step === 1 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>ขั้นตอนที่ 1: เลือกขอบเขตและแหล่งข้อมูล</CardTitle>
            <CardDescription>เลือกว่าจะนำเข้านักเรียนกี่คน และจากแหล่งข้อมูลใด</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">ขอบเขตการนำเข้า</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {([
                  ["single", "1 คน"],
                  ["classroom", "ทั้งห้องเรียน"],
                  ["grade", "ทั้งระดับชั้น"],
                  ["school", "ทั้งโรงเรียน"],
                ] as [Scope, string][]).map(([value, label]) => (
                  <Button key={value} variant={scope === value ? "default" : "outline"} onClick={() => setScope(value)}>
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {(scope === "classroom" || scope === "grade") && (
              <div>
                <label className="mb-1 block text-sm font-medium">{scope === "classroom" ? "ระบุห้องเรียน (เช่น 4/2)" : "ระบุระดับชั้น (เช่น ป.4)"}</label>
                <Input value={scopeValue} onChange={(e) => setScopeValue(e.target.value)} placeholder={scope === "classroom" ? "4/2" : "ป.4"} />
                <p className="mt-1 text-xs text-muted-foreground">ค่านี้จะถูกใส่อัตโนมัติให้ทุกแถวที่ไฟล์ไม่มีคอลัมน์นี้</p>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium">แหล่งข้อมูล</label>
              <Select value={source} onValueChange={(v) => setSource(v as ImportSource)}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => setStep(2)}>
              ถัดไป <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>ขั้นตอนที่ 2: อัปโหลด / เชื่อมต่อ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {source === "dmc" && (
              <div className="glass-card rounded-2xl border border-amber-300/50 bg-amber-50/50 p-4 text-sm dark:bg-amber-950/20">
                <p className="font-semibold text-amber-700 dark:text-amber-400">โหมดทดลอง / จำลองการทำงาน (Demo Mode)</p>
                <p className="mt-1 text-muted-foreground">{DMC_DISCLOSURE_TH}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  คอลัมน์ที่รองรับจาก DMC: {DMC_EXPECTED_COLUMNS.join(", ")}
                </p>
              </div>
            )}

            {(source === "excel" || source === "dmc") && (
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="block w-full text-sm"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">รองรับไฟล์ .xlsx, .xls, .csv</p>
              </div>
            )}

            {source === "google_sheets" && (
              <div className="space-y-2">
                <Input placeholder="วาง URL ของ Google Sheet" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} />
                <Input placeholder="ชื่อชีต/แท็บ (เว้นว่างได้)" value={sheetName} onChange={(e) => setSheetName(e.target.value)} />
                <Button onClick={handleGoogleSheetsFetch} disabled={loading || !sheetUrl.trim()}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> เชื่อมต่อและดึงข้อมูล
                </Button>
                {sheetsResult && !sheetsResult.ok && (
                  <p className="text-sm text-destructive">{sheetsResult.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  ก่อนใช้งาน ต้องแชร์ Google Sheet ของคุณให้กับอีเมลของ Service Account (ดูที่ .env.example)
                </p>
              </div>
            )}

            {source === "qr" && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  สแกน QR ของนักเรียน (จากระบบเช็คชื่อ QR — Module 3) ที่เข้ารหัสข้อมูลนักเรียนเป็น JSON แล้ววางข้อความที่ได้ด้านล่าง
                  หรือใช้กล้องสแกนที่หน้า{" "}
                  <Link href="/attendance/scanner" className="text-primary underline-offset-2 hover:underline">
                    สแกน QR เช็คชื่อ
                  </Link>{" "}
                  แล้วคัดลอกข้อความมาวาง
                </p>
                <textarea
                  className="min-h-24 w-full rounded-md border bg-background p-2 text-sm"
                  placeholder='{"student_code": "12345", "full_name": "สมชาย ใจดี"}'
                  value={qrPayload}
                  onChange={(e) => setQrPayload(e.target.value)}
                />
                <Button onClick={handleQrPayload} disabled={loading || !qrPayload.trim()}>
                  ประมวลผล QR
                </Button>
              </div>
            )}

            {source === "api" && (
              <div className="space-y-2 text-sm">
                <p>ใช้ปลายทาง REST API นี้สำหรับนำเข้าข้อมูลแบบโปรแกรม:</p>
                <code className="block rounded bg-muted p-2 text-xs">POST /api/students/import</code>
                <p className="text-muted-foreground">
                  ส่ง JSON body: <code>{"{ rows: [...], strategy: \"skip\"|\"update\"|\"merge\"|\"create_new\" }"}</code>
                </p>
              </div>
            )}

            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> ย้อนกลับ
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>ขั้นตอนที่ 3: ตรวจสอบข้อมูล</CardTitle>
            <CardDescription>
              ทั้งหมด {rows.length} แถว · ข้อผิดพลาด {errorCount} แถว · คำเตือน {warningCount} แถว · พบรายการซ้ำ {duplicateCount} แถว
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">กลยุทธ์เริ่มต้นสำหรับรายการซ้ำทั้งหมด:</span>
              <Select value={batchStrategy} onValueChange={(v) => setBatchStrategy(v as DuplicateStrategy)}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STRATEGY_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="max-h-[28rem] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>แถว</TableHead>
                    <TableHead>รหัส</TableHead>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>รายการซ้ำ</TableHead>
                    <TableHead>กลยุทธ์ (รายแถว)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const v = validations.get(row.rowNumber);
                    const dup = duplicates.get(row.rowNumber);
                    return (
                      <TableRow key={row.rowNumber}>
                        <TableCell>{row.rowNumber}</TableCell>
                        <TableCell>{row.student_code || "-"}</TableCell>
                        <TableCell>{row.full_name || "-"}</TableCell>
                        <TableCell>
                          {v && v.errors.length > 0 ? (
                            <Badge variant="destructive">{v.errors.map((e) => e.message).join("; ")}</Badge>
                          ) : v && v.warnings.length > 0 ? (
                            <Badge variant="secondary">{v.warnings.length} คำเตือน</Badge>
                          ) : (
                            <Badge variant="success">ผ่าน</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {dup ? <Badge variant="outline">ตรงกับ: {dup.matchedOn}</Badge> : <span className="text-muted-foreground">ใหม่</span>}
                        </TableCell>
                        <TableCell>
                          {dup ? (
                            <Select
                              value={rowStrategy(row.rowNumber)}
                              onValueChange={(value) =>
                                setPerRowStrategy((prev) => new Map(prev).set(row.rowNumber, value as DuplicateStrategy))
                              }
                            >
                              <SelectTrigger className="w-44">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(STRATEGY_LABEL).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> ย้อนกลับ
              </Button>
              <Button onClick={() => setStep(4)}>
                ถัดไป <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>ขั้นตอนที่ 4: ยืนยันการนำเข้า</CardTitle>
            <CardDescription>
              จะนำเข้า {rows.length - errorCount} แถว (ข้าม {errorCount} แถวที่มีข้อผิดพลาด)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              เมื่อยืนยันแล้ว ระบบจะสร้าง/อัปเดตข้อมูลนักเรียน ผู้ปกครอง บัญชีออมทรัพย์ และข้อมูลสุขภาพ (เมื่อมีข้อมูล) พร้อมบันทึกประวัติการนำเข้าไว้ใน
              แดชบอร์ดเพื่อให้สามารถยกเลิกได้ภายหลัง
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> ย้อนกลับ
              </Button>
              <Button onClick={handleCommit} disabled={committing}>
                {committing ? "กำลังนำเข้า..." : "ยืนยันและนำเข้า"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 5 && result && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-green" /> นำเข้าเสร็จสิ้น
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              สร้างใหม่ {result.succeededCount} รายการ · อัปเดต {result.updatedCount} รายการ · ล้มเหลว {result.failedCount} รายการ
            </p>
            <div className="flex gap-2">
              <Button asChild>
                <Link href={`/students/import/${result.importJobId}`}>ดูรายละเอียด</Link>
              </Button>
              <Button variant="outline" onClick={() => router.push("/students/import")}>
                ไปที่แดชบอร์ดการนำเข้า
              </Button>
              <Button variant="outline" onClick={() => router.push("/students")}>
                ไปที่หน้านักเรียน
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

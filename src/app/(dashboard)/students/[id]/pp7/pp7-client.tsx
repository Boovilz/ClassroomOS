"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { Pp7Print } from "@/components/academic/pp7-print";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";

interface StudentData {
  full_name: string;
  code: string;
  grade: string;
  classroom: string;
  birth_date?: string | null;
  national_id?: string | null;
}

interface SchoolData {
  name: string;
  address?: string | null;
  phone?: string | null;
}

interface Props {
  student: StudentData;
  school: SchoolData;
  defaultGpa?: number | null;
  defaultAttendanceRate?: number | null;
}

export function Pp7Client({ student, school, defaultGpa, defaultAttendanceRate }: Props) {
  const currentBeYear = String(new Date().getFullYear() + 543);

  const [documentNumber, setDocumentNumber] = useState("");
  const [academicYear, setAcademicYear] = useState(currentBeYear);
  const [semester, setSemester] = useState("1");
  const [certPurpose, setCertPurpose] = useState("");
  const [showGpa, setShowGpa] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const [showBehavior, setShowBehavior] = useState(false);
  const [behaviorScore, setBehaviorScore] = useState<string>("");
  const [certText, setCertText] = useState("");

  const issueDateFormatted = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  function exportPp7ToExcel() {
    const gpaVal = showGpa && defaultGpa != null ? defaultGpa : null;
    const attVal = showAttendance && defaultAttendanceRate != null ? defaultAttendanceRate : null;
    const behVal = showBehavior && behaviorScore !== "" ? Number(behaviorScore) : null;

    const data: (string | number | null)[][] = [
      ["ใบรับรองสถานภาพการศึกษา (ปพ.7)"],
      ["โรงเรียน", school.name],
      [],
      ["เลขที่", documentNumber || "-"],
      ["วันที่ออก", issueDateFormatted],
      [],
      ["ชื่อ-สกุล", student.full_name],
      ["รหัสนักเรียน", student.code],
      ["ระดับชั้น", student.grade],
      ["ห้องเรียน", student.classroom],
      ["ปีการศึกษา", academicYear],
      ["ภาคเรียน", semester],
      ...(gpaVal != null ? [["ผลการเรียนเฉลี่ย (GPA)", gpaVal]] : []),
      ...(attVal != null ? [["อัตราการเข้าเรียน", attVal + "%"]] : []),
      ...(behVal != null ? [["คะแนนความประพฤติ", behVal]] : []),
      [],
      ["วัตถุประสงค์", certPurpose || "รับรองความเป็นนักเรียน"],
      ...(certText ? [["ข้อความเพิ่มเติม", certText]] : []),
      [],
      ["", "", "", "ลายมือชื่อ _______________________"],
      ["", "", "", "ผู้อำนวยการ / ผู้บริหาร"],
      ["", "", "", "(" + school.name + ")"],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = [{ wch: 25 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ปพ.7");
    XLSX.writeFile(wb, "ปพ.7_" + student.code + ".xlsx");
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Config panel */}
      <div className="w-full lg:w-80 shrink-0 space-y-4 print:hidden">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ตั้งค่าเอกสาร</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="documentNumber">เลขที่หนังสือ</Label>
              <Input
                id="documentNumber"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="เช่น กศ.001/2568"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="academicYear">ปีการศึกษา</Label>
              <Input
                id="academicYear"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="เช่น 2568"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="semester">ภาคเรียน</Label>
              <Input
                id="semester"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                placeholder="1 หรือ 2"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="certPurpose">วัตถุประสงค์</Label>
              <Input
                id="certPurpose"
                value={certPurpose}
                onChange={(e) => setCertPurpose(e.target.value)}
                placeholder="รับรองความเป็นนักเรียน ..."
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">ข้อมูลเพิ่มเติม</p>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="showGpa"
                  checked={showGpa}
                  onCheckedChange={(v) => setShowGpa(Boolean(v))}
                  disabled={defaultGpa == null}
                />
                <Label htmlFor="showGpa" className={defaultGpa == null ? "text-muted-foreground" : ""}>
                  แสดงผลการเรียนเฉลี่ย (GPA)
                  {defaultGpa != null && <span className="ml-1 text-muted-foreground">= {defaultGpa.toFixed(2)}</span>}
                  {defaultGpa == null && <span className="ml-1 text-xs text-muted-foreground">(ไม่มีข้อมูล)</span>}
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="showAttendance"
                  checked={showAttendance}
                  onCheckedChange={(v) => setShowAttendance(Boolean(v))}
                  disabled={defaultAttendanceRate == null}
                />
                <Label htmlFor="showAttendance" className={defaultAttendanceRate == null ? "text-muted-foreground" : ""}>
                  แสดงอัตราเข้าเรียน
                  {defaultAttendanceRate != null && (
                    <span className="ml-1 text-muted-foreground">= {defaultAttendanceRate.toFixed(1)}%</span>
                  )}
                  {defaultAttendanceRate == null && <span className="ml-1 text-xs text-muted-foreground">(ไม่มีข้อมูล)</span>}
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="showBehavior"
                  checked={showBehavior}
                  onCheckedChange={(v) => setShowBehavior(Boolean(v))}
                />
                <Label htmlFor="showBehavior">แสดงคะแนนความประพฤติ</Label>
              </div>

              {showBehavior && (
                <Input
                  value={behaviorScore}
                  onChange={(e) => setBehaviorScore(e.target.value)}
                  placeholder="คะแนนความประพฤติ"
                  type="number"
                  min={0}
                  max={100}
                  className="mt-1"
                />
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="certText">ข้อความเพิ่มเติม</Label>
              <Textarea
                id="certText"
                value={certText}
                onChange={(e) => setCertText(e.target.value)}
                placeholder="ข้อความรับรองเพิ่มเติม (ถ้ามี)"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2">
          <Button className="w-full gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            พิมพ์ / บันทึก PDF
          </Button>
          <Button variant="outline" className="w-full gap-2" onClick={exportPp7ToExcel}>
            <Download className="h-4 w-4" />
            ดาวน์โหลด Excel
          </Button>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 min-w-0">
        <Pp7Print
          student={student}
          school={school}
          academicYear={academicYear}
          semester={semester}
          documentNumber={documentNumber}
          certPurpose={certPurpose}
          showGpa={showGpa}
          gpa={defaultGpa}
          showAttendance={showAttendance}
          attendanceRate={defaultAttendanceRate}
          showBehavior={showBehavior}
          behaviorScore={behaviorScore !== "" ? Number(behaviorScore) : null}
          certText={certText}
          hidePrintButton
        />
      </div>
    </div>
  );
}

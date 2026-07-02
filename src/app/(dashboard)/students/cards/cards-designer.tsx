"use client";

import { useState, useEffect } from "react";
import { Printer, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StudentCardPreview, CardConfig } from "@/components/students/student-card-preview";

const DEFAULT_CONFIG: CardConfig = {
  theme: "indigo",
  showPhoto: true,
  showClassroom: true,
  showGender: true,
  showBloodType: true,
  showBarcode: true,
  showBirthDate: true,
  showNationalId: false,
  showGuardianName: true,
  showSchoolAddress: true,
};

const THEME_OPTIONS: { value: CardConfig["theme"]; label: string; color: string }[] = [
  { value: "indigo", label: "คราม", color: "bg-indigo-700" },
  { value: "blue", label: "น้ำเงิน", color: "bg-blue-700" },
  { value: "emerald", label: "เขียว", color: "bg-emerald-700" },
  { value: "rose", label: "ชมพู", color: "bg-rose-700" },
  { value: "slate", label: "เทา", color: "bg-slate-700" },
];

interface StudentOption {
  id: string;
  full_name: string;
  student_code: string;
  grade: string | null;
  classroom: string | null;
  gender: string | null;
  blood_type: string | null;
  birth_date: string | null;
  citizen_id: string | null;
  profile_picture_url: string | null;
  parent_full_name: string | null;
}

interface CardsDesignerProps {
  school: {
    id: string;
    name: string;
    address?: string | null;
  };
}

export function CardsDesigner({ school }: CardsDesignerProps) {
  const [config, setConfig] = useState<CardConfig>(DEFAULT_CONFIG);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStudents() {
      try {
        const res = await fetch(
          `/api/students/search?q=ก&schoolId=${school.id}&limit=200`
        );
        if (!res.ok) return;
        const json = await res.json();
        const list: StudentOption[] = (json.students ?? []).map((s: StudentOption) => s);
        setStudents(list);
        if (list.length > 0) setSelectedId(list[0].id);
      } finally {
        setLoading(false);
      }
    }
    loadStudents();
  }, [school.id]);

  const selectedStudent = students.find((s) => s.id === selectedId) ?? null;

  function toggle(key: keyof CardConfig) {
    setConfig((prev) => ({ ...prev, [key]: !prev[key as keyof CardConfig] }));
  }

  function handlePrintSingle() {
    window.print();
  }

  function handlePrintAll() {
    // Open a new window with all students in the same classroom
    if (!selectedStudent) return;
    const classroom = selectedStudent.classroom;
    const sameClass = students.filter(
      (s) => s.classroom === classroom && s.grade === selectedStudent.grade
    );
    const cards = sameClass.map((s) =>
      `<div class="card-pair" style="page-break-inside:avoid;margin-bottom:24px;">${buildCardHtml(s)}</div>`
    );
    const html = `<!DOCTYPE html><html><head><title>พิมพ์บัตรนักเรียน</title>
<meta charset="utf-8"/>
<style>
  body{font-family:sans-serif;margin:0;padding:16px;background:#fff;}
  @media print{body{padding:0;} .card-pair{page-break-inside:avoid;}}
  .card-pair{display:flex;gap:16px;flex-wrap:wrap;}
  .card{width:338px;min-height:213px;border:2px solid #3730a3;border-radius:12px;overflow:hidden;background:#fff;display:flex;flex-direction:column;}
  .card-header{background:#3730a3;color:#fff;padding:8px 12px;font-size:12px;font-weight:600;}
  .card-body{padding:8px;flex:1;font-size:11px;color:#374151;}
  .card-footer{height:4px;background:#3730a3;}
</style>
</head><body>${cards.join("")}</body></html>`;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.print();
    }
  }

  function buildCardHtml(s: StudentOption): string {
    return `
      <div class="card">
        <div class="card-header">${school.name}</div>
        <div class="card-body">
          <b>${s.full_name}</b><br/>
          รหัส: ${s.student_code}<br/>
          ${s.grade ?? ""}${s.classroom ? `/${s.classroom}` : ""}
        </div>
        <div class="card-footer"></div>
      </div>
      <div class="card">
        <div class="card-header">ข้อมูลเพิ่มเติม</div>
        <div class="card-body">
          ${s.birth_date ? `วันเกิด: ${s.birth_date}<br/>` : ""}
          ลายมือชื่อ _______________________
        </div>
        <div class="card-footer"></div>
      </div>`;
  }

  const frontChecks: { key: keyof CardConfig; label: string }[] = [
    { key: "showPhoto", label: "แสดงรูปถ่าย" },
    { key: "showClassroom", label: "แสดงชั้นเรียน" },
    { key: "showGender", label: "แสดงเพศ" },
    { key: "showBloodType", label: "แสดงหมู่โลหิต" },
    { key: "showBarcode", label: "แสดงบาร์โค้ด" },
  ];

  const backChecks: { key: keyof CardConfig; label: string }[] = [
    { key: "showBirthDate", label: "แสดงวันเกิด" },
    { key: "showNationalId", label: "แสดงเลขบัตรประชาชน" },
    { key: "showGuardianName", label: "แสดงชื่อผู้ปกครอง" },
    { key: "showSchoolAddress", label: "แสดงที่อยู่โรงเรียน" },
  ];

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-area { display: block !important; }
        }
      `}</style>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Config panel */}
        <aside className="no-print w-full lg:w-72 flex-shrink-0 space-y-6">
          {/* Theme */}
          <div>
            <p className="text-sm font-semibold mb-2">ธีมสี</p>
            <div className="flex gap-2">
              {THEME_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  title={t.label}
                  onClick={() => setConfig((prev) => ({ ...prev, theme: t.value }))}
                  className={`h-8 w-8 rounded-full ${t.color} ring-offset-2 transition-all ${
                    config.theme === t.value ? "ring-2 ring-foreground scale-110" : "opacity-70 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Front side checks */}
          <div>
            <p className="text-sm font-semibold mb-2">หน้าบัตร</p>
            <div className="space-y-2">
              {frontChecks.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={key}
                    checked={config[key] as boolean}
                    onCheckedChange={() => toggle(key)}
                  />
                  <Label htmlFor={key} className="text-sm cursor-pointer">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Back side checks */}
          <div>
            <p className="text-sm font-semibold mb-2">หลังบัตร</p>
            <div className="space-y-2">
              {backChecks.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={key}
                    checked={config[key] as boolean}
                    onCheckedChange={() => toggle(key)}
                  />
                  <Label htmlFor={key} className="text-sm cursor-pointer">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Student selector */}
          <div>
            <p className="text-sm font-semibold mb-2">เลือกนักเรียน</p>
            {loading ? (
              <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
            ) : students.length === 0 ? (
              <p className="text-sm text-muted-foreground">ไม่พบข้อมูลนักเรียน</p>
            ) : (
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="เลือกนักเรียน" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name} ({s.student_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </aside>

        {/* Right: Preview */}
        <div className="flex-1 space-y-4">
          {selectedStudent ? (
            <>
              <div className="print-area overflow-x-auto">
                <StudentCardPreview
                  student={{
                    full_name: selectedStudent.full_name,
                    student_code: selectedStudent.student_code,
                    grade: selectedStudent.grade ?? "",
                    classroom: selectedStudent.classroom ?? "",
                    gender: selectedStudent.gender,
                    blood_type: selectedStudent.blood_type,
                    birth_date: selectedStudent.birth_date,
                    citizen_id: selectedStudent.citizen_id,
                    profile_picture_url: selectedStudent.profile_picture_url,
                    parent_full_name: selectedStudent.parent_full_name,
                  }}
                  school={school}
                  config={config}
                />
              </div>

              <div className="no-print flex gap-2 flex-wrap">
                <Button onClick={handlePrintSingle} className="gap-2">
                  <Printer className="h-4 w-4" />
                  พิมพ์บัตรนี้
                </Button>
                <Button variant="outline" onClick={handlePrintAll} className="gap-2">
                  <Users className="h-4 w-4" />
                  พิมพ์ทั้งห้อง
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-xl text-muted-foreground text-sm">
              {loading ? "กำลังโหลดข้อมูล..." : "กรุณาเลือกนักเรียนเพื่อดูตัวอย่างบัตร"}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

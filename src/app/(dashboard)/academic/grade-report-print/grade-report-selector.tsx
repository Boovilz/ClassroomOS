"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer } from "lucide-react";

export default function GradeReportSelector({
  grades,
  classrooms,
  defaultYear,
}: {
  grades: string[];
  classrooms: string[];
  defaultYear: number;
}) {
  const router = useRouter();
  const [grade, setGrade] = useState(grades[0] ?? "");
  const [classroom, setClassroom] = useState("");
  const [year, setYear] = useState(String(defaultYear));
  const [semester, setSemester] = useState("1");

  function handlePrint() {
    const params = new URLSearchParams({ grade, year, semester });
    if (classroom) params.set("classroom", classroom);
    router.push(`/academic/grade-report-print?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-md space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">พิมพ์ใบรายงานผลการเรียน</h1>
        <p className="text-sm text-muted-foreground mt-1">เลือกห้องเรียนและภาคเรียนที่ต้องการพิมพ์</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">เลือกเงื่อนไข</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>ระดับชั้น</Label>
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกระดับชั้น..." />
              </SelectTrigger>
              <SelectContent>
                {grades.length > 0 ? (
                  grades.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)
                ) : (
                  ["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6", "ป.1", "ป.2", "ป.3", "ป.4", "ป.5", "ป.6"].map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>ห้อง (ไม่บังคับ)</Label>
            <Select value={classroom} onValueChange={setClassroom}>
              <SelectTrigger>
                <SelectValue placeholder="ทุกห้อง" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">ทุกห้อง</SelectItem>
                {classrooms.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>ปีการศึกษา (พ.ศ.)</Label>
              <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} min={2560} max={2600} />
            </div>
            <div className="space-y-1.5">
              <Label>ภาคเรียน</Label>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">ภาคเรียนที่ 1</SelectItem>
                  <SelectItem value="2">ภาคเรียนที่ 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button className="w-full gap-2" onClick={handlePrint} disabled={!grade}>
            <Printer className="h-4 w-4" />
            ดูและพิมพ์รายงาน
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

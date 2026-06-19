import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { GradebookRow } from "@/lib/queries/academic";

const COMPONENT_LABELS: Record<string, string> = {
  attendance: "เข้าเรียน",
  homework: "การบ้าน",
  assignment: "งาน",
  quiz: "ทดสอบย่อย",
  midterm: "กลางภาค",
  final: "ปลายภาค",
  project: "โครงงาน",
  behavior: "พฤติกรรม",
};

function gradeVariant(grade: number): "success" | "secondary" | "destructive" | "outline" {
  if (grade >= 3) return "success";
  if (grade >= 2) return "secondary";
  if (grade >= 1) return "outline";
  return "destructive";
}

export function GradebookTable({ rows }: { rows: GradebookRow[] }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูลคะแนนสำหรับวิชานี้</p>;
  }

  const componentKeys = Object.keys(rows[0].componentAverages);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>รหัสนักเรียน</TableHead>
            <TableHead>ชื่อ-นามสกุล</TableHead>
            {componentKeys.map((key) => (
              <TableHead key={key} className="text-right">
                {COMPONENT_LABELS[key] ?? key}
              </TableHead>
            ))}
            <TableHead className="text-right">คะแนนถ่วงน้ำหนัก</TableHead>
            <TableHead className="text-right">เกรด</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.studentId}>
              <TableCell>{row.studentCode}</TableCell>
              <TableCell>{row.fullName}</TableCell>
              {componentKeys.map((key) => (
                <TableCell key={key} className="text-right">
                  {row.componentAverages[key]}
                </TableCell>
              ))}
              <TableCell className="text-right font-medium">{row.weightedScore}%</TableCell>
              <TableCell className="text-right">
                <Badge variant={gradeVariant(row.letterGrade)}>{row.letterGrade.toFixed(1)}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function HealthPage() {
  const supabase = await createClient();

  const { data: records } = await supabase
    .from("health_records")
    .select("id, height_cm, weight_kg, allergies, recorded_at, students(full_name, student_code, classroom)")
    .order("recorded_at", { ascending: false })
    .limit(50)
    .returns<
      {
        id: string;
        height_cm: number | null;
        weight_kg: number | null;
        allergies: string | null;
        recorded_at: string;
        students: { full_name: string; student_code: string; classroom: string | null } | null;
      }[]
    >();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">สุขภาพนักเรียน</h1>
        <p className="text-sm text-muted-foreground">บันทึกส่วนสูง น้ำหนัก และข้อมูลสุขภาพอื่น ๆ</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>บันทึกสุขภาพล่าสุด</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>รหัสนักเรียน</TableHead>
                <TableHead>ชื่อ-นามสกุล</TableHead>
                <TableHead>ห้องเรียน</TableHead>
                <TableHead>ส่วนสูง (ซม.)</TableHead>
                <TableHead>น้ำหนัก (กก.)</TableHead>
                <TableHead>แพ้</TableHead>
                <TableHead>บันทึกเมื่อ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records && records.length > 0 ? (
                records.map((r) => {
                  const student = Array.isArray(r.students) ? r.students[0] : r.students;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{student?.student_code}</TableCell>
                      <TableCell>{student?.full_name}</TableCell>
                      <TableCell>{student?.classroom ?? "-"}</TableCell>
                      <TableCell>{r.height_cm ?? "-"}</TableCell>
                      <TableCell>{r.weight_kg ?? "-"}</TableCell>
                      <TableCell>{r.allergies ?? "-"}</TableCell>
                      <TableCell>{new Date(r.recorded_at).toLocaleDateString("th-TH")}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    ยังไม่มีข้อมูลสุขภาพ
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

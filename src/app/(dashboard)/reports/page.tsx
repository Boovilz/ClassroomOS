import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAttendanceReport } from "@/lib/queries/attendance";

export default async function ReportsPage() {
  const supabase = await createClient();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const attendanceReport = await getAttendanceReport({ from: monthAgo, to: today });

  const [{ data: attendance }, { data: behavior }, { data: scores }, { data: transactions }] = await Promise.all([
    supabase.from("attendance").select("status, students(classroom, deleted_at)").gte("date", monthAgo).returns<
      { status: string; students: { classroom: string | null; deleted_at: string | null } | null }[]
    >(),
    supabase
      .from("behavior_records")
      .select("category, points")
      .gte("occurred_at", monthAgo)
      .returns<{ category: string; points: number }[]>(),
    supabase.from("scores").select("term, score, max_score").returns<
      { term: string | null; score: number; max_score: number }[]
    >(),
    supabase
      .from("finance_transactions")
      .select("type, amount, occurred_at")
      .gte("occurred_at", monthAgo)
      .returns<{ type: string; amount: number; occurred_at: string }[]>(),
  ]);

  const attendanceByClassroom = new Map<string, { present: number; total: number }>();
  for (const row of attendance ?? []) {
    if (row.students?.deleted_at) continue;
    const classroom = row.students?.classroom ?? "ไม่ระบุห้อง";
    const entry = attendanceByClassroom.get(classroom) ?? { present: 0, total: 0 };
    entry.total += 1;
    if (row.status === "present" || row.status === "late") entry.present += 1;
    attendanceByClassroom.set(classroom, entry);
  }

  const positiveBehavior = behavior?.filter((b) => b.category === "positive").length ?? 0;
  const negativeBehavior = behavior?.filter((b) => b.category === "negative").length ?? 0;
  const netPoints = behavior?.reduce((sum, b) => sum + b.points, 0) ?? 0;

  const byTerm = new Map<string, { total: number; count: number }>();
  for (const row of scores ?? []) {
    const term = row.term ?? "ไม่ระบุภาคเรียน";
    const normalized = row.max_score > 0 ? (row.score / row.max_score) * 100 : row.score;
    const entry = byTerm.get(term) ?? { total: 0, count: 0 };
    entry.total += normalized;
    entry.count += 1;
    byTerm.set(term, entry);
  }

  const income = transactions?.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0) ?? 0;
  const expense = transactions?.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">รายงาน</h1>
        <p className="text-sm text-muted-foreground">สรุปข้อมูลภาพรวม 30 วันล่าสุด</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>การเข้าเรียนตามห้อง</CardTitle>
          <CardDescription>อัตราการเข้าเรียน (มา/มาสาย) ต่อห้องเรียน</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ห้องเรียน</TableHead>
                <TableHead className="text-right">เข้าเรียน</TableHead>
                <TableHead className="text-right">ทั้งหมด</TableHead>
                <TableHead className="text-right">อัตรา</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendanceByClassroom.size > 0 ? (
                Array.from(attendanceByClassroom.entries()).map(([classroom, v]) => (
                  <TableRow key={classroom}>
                    <TableCell>{classroom}</TableCell>
                    <TableCell className="text-right">{v.present}</TableCell>
                    <TableCell className="text-right">{v.total}</TableCell>
                    <TableCell className="text-right">
                      {v.total > 0 ? Math.round((v.present / v.total) * 100) : 0}%
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    ยังไม่มีข้อมูลการเข้าเรียน
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>รายงานการเข้าเรียนรายบุคคล (30 วันล่าสุด)</CardTitle>
          <CardDescription>สรุปจำนวนวันมาเรียน/มาสาย/ขาด/ลา และอัตราการเข้าเรียนของนักเรียนแต่ละคน</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>รหัส</TableHead>
                <TableHead>ชื่อ-นามสกุล</TableHead>
                <TableHead>ห้องเรียน</TableHead>
                <TableHead className="text-right">มาเรียน</TableHead>
                <TableHead className="text-right">มาสาย</TableHead>
                <TableHead className="text-right">ขาด</TableHead>
                <TableHead className="text-right">ลา</TableHead>
                <TableHead className="text-right">อัตราเข้าเรียน</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendanceReport.length > 0 ? (
                attendanceReport.map((r) => (
                  <TableRow key={r.student_id}>
                    <TableCell>{r.student_code}</TableCell>
                    <TableCell>{r.full_name}</TableCell>
                    <TableCell>{r.classroom ?? "-"}</TableCell>
                    <TableCell className="text-right">{r.present}</TableCell>
                    <TableCell className="text-right">{r.late}</TableCell>
                    <TableCell className="text-right">{r.absent}</TableCell>
                    <TableCell className="text-right">{r.sick + r.personalLeave}</TableCell>
                    <TableCell className="text-right">{r.attendanceRatePercent}%</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    ยังไม่มีข้อมูลการเข้าเรียน
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">พฤติกรรม 30 วันล่าสุด</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>เชิงบวก: {positiveBehavior} ครั้ง</p>
            <p>เชิงลบ: {negativeBehavior} ครั้ง</p>
            <p className="font-medium">คะแนนสุทธิ: {netPoints}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">ผลการเรียนเฉลี่ยตามภาคเรียน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {byTerm.size > 0 ? (
              Array.from(byTerm.entries()).map(([term, v]) => (
                <p key={term}>
                  {term}: {Math.round(v.total / v.count)}%
                </p>
              ))
            ) : (
              <p className="text-muted-foreground">ยังไม่มีข้อมูล</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">การเงิน 30 วันล่าสุด</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>รับ: {income.toLocaleString()} บาท</p>
            <p>จ่าย: {expense.toLocaleString()} บาท</p>
            <p className="font-medium">คงเหลือสุทธิ: {(income - expense).toLocaleString()} บาท</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

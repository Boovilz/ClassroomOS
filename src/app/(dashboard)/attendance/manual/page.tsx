import { getRosterForDate } from "@/lib/queries/attendance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ManualAttendanceForm } from "@/components/attendance/manual-attendance-form";

interface ManualAttendancePageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function ManualAttendancePage({ searchParams }: ManualAttendancePageProps) {
  const params = await searchParams;
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : new Date().toISOString().slice(0, 10);

  const roster = await getRosterForDate(date);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">เช็คชื่อย้อนหลัง</h1>
        <p className="text-sm text-muted-foreground">เลือกวันที่และบันทึกสถานะการเข้าเรียนของนักเรียนที่ยังไม่ได้เช็คชื่อ หรือแก้ไขสถานะที่บันทึกไว้แล้ว</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>รายชื่อนักเรียน</CardTitle>
        </CardHeader>
        <CardContent>
          <ManualAttendanceForm date={date} roster={roster} />
        </CardContent>
      </Card>
    </div>
  );
}

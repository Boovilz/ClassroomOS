import { getRosterForDate } from "@/lib/queries/attendance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ManualAttendanceForm } from "@/components/attendance/manual-attendance-form";

interface ManualAttendancePageProps {
  searchParams: Promise<{ dates?: string }>;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function ManualAttendancePage({ searchParams }: ManualAttendancePageProps) {
  const params = await searchParams;
  const parsed = params.dates?.split(",").map((d) => d.trim()).filter((d) => DATE_RE.test(d)) ?? [];
  const dates = parsed.length > 0 ? Array.from(new Set(parsed)).sort() : [new Date().toISOString().slice(0, 10)];

  const roster = await getRosterForDate(dates[0]);

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
          <ManualAttendanceForm dates={dates} roster={roster} />
        </CardContent>
      </Card>
    </div>
  );
}

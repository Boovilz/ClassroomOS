import Link from "next/link";
import { getAttendanceReport, getTodayAttendanceSummary } from "@/lib/queries/attendance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MonthlySummaryTable } from "@/components/attendance/monthly-summary-table";
import { LiveAttendanceBoard } from "@/components/attendance/live-attendance-board";
import { RiskStudentsPanel } from "@/components/attendance/risk-students-panel";

interface AttendancePageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function AttendancePage({ searchParams }: AttendancePageProps) {
  const params = await searchParams;
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const month = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : currentMonth;

  const [year, monthNum] = month.split("-").map(Number);
  const monthFrom = `${month}-01`;
  const monthTo = new Date(year, monthNum, 0).toISOString().slice(0, 10);

  const [summary, monthlyReport] = await Promise.all([
    getTodayAttendanceSummary(),
    getAttendanceReport({ from: monthFrom, to: monthTo }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">การเข้าเรียน</h1>
          <p className="text-sm text-muted-foreground">
            วันนี้ {summary.date} · มาเรียน {summary.present} · มาสาย {summary.late} · ขาดเรียน {summary.absent} ·
            ยังไม่เช็คชื่อ {summary.pending}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/attendance/qr">สร้าง QR นักเรียน</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/attendance/scanner">สแกนเช็คชื่อ</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/attendance/kiosk">โหมดคีออส</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">นักเรียนทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{summary.totalStudents}</CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">มาเรียน + มาสาย</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{summary.present + summary.late}</CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">ขาดเรียน/ลา</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{summary.absent + summary.sick + summary.personalLeave}</CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">อัตราเข้าเรียน</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {summary.totalStudents > 0 ? Math.round(((summary.present + summary.late) / summary.totalStudents) * 100) : 0}%
          </CardContent>
        </Card>
      </div>

      <LiveAttendanceBoard
        initialPresent={summary.present}
        initialLate={summary.late}
        initialAbsent={summary.absent}
        initialPending={summary.pending}
        totalStudents={summary.totalStudents}
      />

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>สรุปการเข้าเรียนรายเดือน</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlySummaryTable data={monthlyReport} month={month} />
        </CardContent>
      </Card>

      <RiskStudentsPanel />
    </div>
  );
}

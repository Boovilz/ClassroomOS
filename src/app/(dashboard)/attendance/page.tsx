import Link from "next/link";
import { getAttendanceTable, getTodayAttendanceSummary } from "@/lib/queries/attendance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AttendanceTable } from "@/components/attendance/attendance-table";
import { LiveAttendanceBoard } from "@/components/attendance/live-attendance-board";
import { RiskStudentsPanel } from "@/components/attendance/risk-students-panel";

export default async function AttendancePage() {
  const [summary, records] = await Promise.all([
    getTodayAttendanceSummary(),
    getAttendanceTable({ dateFrom: new Date().toISOString().slice(0, 10) }),
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
          <CardTitle>รายชื่อวันนี้ ({summary.date})</CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceTable data={records} />
        </CardContent>
      </Card>

      <RiskStudentsPanel />
    </div>
  );
}

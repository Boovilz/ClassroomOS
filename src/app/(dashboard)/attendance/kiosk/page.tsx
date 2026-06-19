import { getTodayAttendanceSummary } from "@/lib/queries/attendance";
import { KioskCheckIn } from "./kiosk-check-in";
import { KioskClock } from "./kiosk-clock";

export default async function AttendanceKioskPage() {
  const summary = await getTodayAttendanceSummary();

  return (
    <div className="-m-4 flex min-h-[calc(100vh-4rem)] flex-col items-center justify-start gap-6 bg-gradient-to-b from-background to-muted/40 p-6 sm:-m-6 sm:p-10">
      <KioskClock />

      <div className="grid w-full max-w-3xl grid-cols-4 gap-3 text-center">
        <div className="rounded-2xl border border-border/60 bg-card/80 p-3">
          <p className="text-2xl font-bold text-emerald-green">{summary.present}</p>
          <p className="text-xs text-muted-foreground">มาเรียน</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-3">
          <p className="text-2xl font-bold">{summary.late}</p>
          <p className="text-xs text-muted-foreground">มาสาย</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-3">
          <p className="text-2xl font-bold text-destructive">{summary.absent}</p>
          <p className="text-xs text-muted-foreground">ขาดเรียน</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-3">
          <p className="text-2xl font-bold">{summary.pending}</p>
          <p className="text-xs text-muted-foreground">ยังไม่เช็คชื่อ</p>
        </div>
      </div>

      <KioskCheckIn />
    </div>
  );
}

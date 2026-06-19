import { CloudSun } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { DashboardHeaderInfo } from "@/lib/queries/dashboard";

export function DashboardHeader({ info }: { info: DashboardHeaderInfo }) {
  const today = new Date().toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="glass-card flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14 rounded-2xl">
          <AvatarImage src={info.logoUrl ?? undefined} alt={info.schoolName} />
          <AvatarFallback className="rounded-2xl bg-primary/10 text-primary">
            {info.schoolName.slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-lg font-bold">{info.schoolName}</h2>
          <p className="text-sm text-muted-foreground">
            ปีการศึกษา {info.academicYear} · ภาคเรียนที่ {info.semester}
            {info.classroom && ` · ${info.classroom}`}
          </p>
          <p className="text-sm text-muted-foreground">{info.teacherName}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-right">
        <div>
          <p className="text-sm font-medium">{today}</p>
          <p className="text-xs text-muted-foreground">วันนี้</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-secondary/10 px-3 py-2 text-secondary">
          <CloudSun className="h-6 w-6" />
          <div className="text-left">
            <p className="text-sm font-semibold">32°C</p>
            <p className="text-[11px] text-muted-foreground">มีแดด</p>
          </div>
        </div>
      </div>
    </div>
  );
}

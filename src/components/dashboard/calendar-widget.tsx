"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarEventDialog } from "@/components/dashboard/calendar-event-dialog";
import type { CalendarEvent } from "@/lib/queries/dashboard";

const EVENT_TYPE_LABEL: Record<CalendarEvent["event_type"], string> = {
  exam: "สอบ",
  activity: "กิจกรรม",
  parent_meeting: "ประชุมผู้ปกครอง",
  field_trip: "ทัศนศึกษา",
  holiday: "วันหยุด",
};

const EVENT_TYPE_VARIANT: Record<CalendarEvent["event_type"], "default" | "secondary" | "accent" | "destructive" | "success"> = {
  exam: "destructive",
  activity: "default",
  parent_meeting: "secondary",
  field_trip: "accent",
  holiday: "success",
};

export function CalendarWidget({ schoolId, events }: { schoolId: string; events: CalendarEvent[] }) {
  const upcoming = events.filter((e) => new Date(e.starts_at) >= new Date(new Date().toDateString()));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{upcoming.length} กิจกรรมที่กำลังจะมาถึง</p>
        <CalendarEventDialog
          schoolId={schoolId}
          trigger={
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              เพิ่มกิจกรรม
            </Button>
          }
        />
      </div>

      <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
        {upcoming.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มีกิจกรรม</p>}
        {upcoming.map((event) => (
          <CalendarEventDialog
            key={event.id}
            schoolId={schoolId}
            event={event}
            trigger={
              <button className="flex w-full items-center justify-between gap-2 rounded-xl border border-border p-3 text-left transition-colors hover:bg-muted">
                <div>
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.starts_at).toLocaleString("th-TH", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {event.classroom && ` · ${event.classroom}`}
                  </p>
                </div>
                <Badge variant={EVENT_TYPE_VARIANT[event.event_type]}>{EVENT_TYPE_LABEL[event.event_type]}</Badge>
              </button>
            }
          />
        ))}
      </div>
    </div>
  );
}

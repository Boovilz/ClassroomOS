"use client";

import { CalendarEvent, EVENT_COLORS, EVENT_ICONS, EVENT_TYPE_LABELS, formatThaiDate, formatTime, isSameDay } from "./calendar-types";
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

interface Props {
  events: CalendarEvent[];
  today: Date;
  onSelectEvent: (e: CalendarEvent) => void;
}

function groupByDate(events: CalendarEvent[]): [string, CalendarEvent[]][] {
  const map = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const day = e.starts_at.split("T")[0];
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(e);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

export function AgendaView({ events, today, onSelectEvent }: Props) {
  const groups = groupByDate(events);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
        <CalendarDays className="h-10 w-10 opacity-30" />
        <p className="text-sm">ไม่มีกิจกรรมในช่วงเวลานี้</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 overflow-y-auto">
      {groups.map(([day, evs]) => {
        const d = new Date(day + "T00:00:00");
        const isToday = isSameDay(d, today);
        const isPast  = d < today && !isToday;
        return (
          <div key={day} className="flex gap-4">
            {/* Date column */}
            <div className="w-20 shrink-0 text-right">
              <div className={cn(
                "inline-flex flex-col items-center rounded-xl px-2 py-1.5",
                isToday ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                <span className={cn("text-[10px] font-medium uppercase", isToday ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {d.toLocaleDateString("th-TH", { weekday: "short" })}
                </span>
                <span className={cn("text-xl font-bold leading-none", isPast && "opacity-40")}>
                  {d.getDate()}
                </span>
                <span className={cn("text-[10px]", isToday ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {d.toLocaleDateString("th-TH", { month: "short" })}
                </span>
              </div>
            </div>

            {/* Events column */}
            <div className="flex-1 space-y-2 pb-2 border-b border-border">
              {evs.map(ev => {
                const colors = EVENT_COLORS[ev.event_type];
                return (
                  <div
                    key={ev.id}
                    className={cn(
                      "rounded-xl border-l-4 px-4 py-3 cursor-pointer transition-all hover:shadow-sm",
                      colors.bg, colors.border,
                      isPast && "opacity-50"
                    )}
                    onClick={() => onSelectEvent(ev)}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-base shrink-0 mt-0.5">{EVENT_ICONS[ev.event_type]}</span>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-semibold truncate", colors.text)}>{ev.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            {ev.ends_at
                              ? `${formatTime(ev.starts_at)} – ${formatTime(ev.ends_at)}`
                              : formatTime(ev.starts_at)}
                          </span>
                          {ev.classroom && (
                            <span className="text-xs text-muted-foreground">📍 {ev.classroom}</span>
                          )}
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", colors.bg, colors.text)}>
                            {EVENT_TYPE_LABELS[ev.event_type]}
                          </span>
                        </div>
                        {ev.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ev.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

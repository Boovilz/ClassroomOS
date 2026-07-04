"use client";

import { cn } from "@/lib/utils";
import { CalendarEvent, EVENT_COLORS, EVENT_ICONS, isSameDay, formatTime, startOfWeek } from "./calendar-types";

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 – 20:00

interface Props {
  baseDate: Date;
  events: CalendarEvent[];
  today: Date;
  onSelectEvent: (e: CalendarEvent) => void;
  onSelectDate: (d: Date) => void;
}

function getWeekDays(base: Date): Date[] {
  const sw = startOfWeek(base);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sw);
    d.setDate(sw.getDate() + i);
    return d;
  });
}

function eventsForDay(events: CalendarEvent[], day: Date) {
  return events.filter(e => isSameDay(new Date(e.starts_at), day));
}

function parseHour(iso: string): number {
  const t = iso.includes("T") ? iso.split("T")[1] : "09:00";
  return parseInt(t.split(":")[0], 10);
}

const WEEKDAY_SHORT = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export function WeekView({ baseDate, events, today, onSelectEvent, onSelectDate }: Props) {
  const days = getWeekDays(baseDate);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="grid border-b border-border" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
        <div className="border-r border-border" />
        {days.map((d, i) => {
          const isToday = isSameDay(d, today);
          return (
            <div
              key={i}
              className="text-center py-2 cursor-pointer hover:bg-muted/30"
              onClick={() => onSelectDate(d)}
            >
              <div className="text-[10px] text-muted-foreground">{WEEKDAY_SHORT[d.getDay()]}</div>
              <div className={cn(
                "mx-auto w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium",
                isToday ? "bg-primary text-primary-foreground" : "text-foreground"
              )}>
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid relative" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
          {/* Hour labels */}
          <div>
            {HOURS.map(h => (
              <div key={h} className="h-16 flex items-start justify-end pr-2 pt-0.5">
                <span className="text-[10px] text-muted-foreground">{h}:00</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, di) => {
            const dayEvents = eventsForDay(events, day);
            return (
              <div key={di} className="border-l border-border relative">
                {HOURS.map(h => (
                  <div key={h} className="h-16 border-b border-border/50" />
                ))}
                {/* Event blocks */}
                {dayEvents.map(ev => {
                  const startHour = parseHour(ev.starts_at);
                  const endHour   = ev.ends_at ? parseHour(ev.ends_at) : startHour + 1;
                  const top    = Math.max(0, (startHour - 7)) * 64;
                  const height = Math.max(1, endHour - startHour) * 64 - 4;
                  const colors = EVENT_COLORS[ev.event_type];
                  return (
                    <div
                      key={ev.id}
                      className={cn(
                        "absolute left-0.5 right-0.5 rounded-lg px-1 py-0.5 cursor-pointer text-[10px] font-medium overflow-hidden",
                        colors.bg, colors.text, "hover:opacity-80 border-l-2", colors.border
                      )}
                      style={{ top, height }}
                      onClick={() => onSelectEvent(ev)}
                    >
                      <div className="truncate">{EVENT_ICONS[ev.event_type]} {ev.title}</div>
                      <div className="opacity-70">{formatTime(ev.starts_at)}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

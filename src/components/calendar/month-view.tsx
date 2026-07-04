"use client";

import { cn } from "@/lib/utils";
import {
  CalendarEvent, EVENT_COLORS, EVENT_ICONS,
  monthGrid, isSameDay, formatTime,
} from "./calendar-types";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

interface Props {
  year: number;
  month: number; // 0-indexed
  events: CalendarEvent[];
  today: Date;
  selectedDate: Date | null;
  onSelectDate: (d: Date) => void;
  onSelectEvent: (e: CalendarEvent) => void;
}

export function MonthView({ year, month, events, today, selectedDate, onSelectDate, onSelectEvent }: Props) {
  const days = monthGrid(year, month);

  const eventsOnDay = (d: Date) =>
    events.filter(e => isSameDay(new Date(e.starts_at), d));

  return (
    <div className="flex flex-col h-full select-none">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map(w => (
          <div key={w} className="text-center text-xs font-semibold text-muted-foreground py-2">
            {w}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 flex-1" style={{ gridAutoRows: "1fr" }}>
        {days.map((d, i) => {
          const isCurrentMonth = d.getMonth() === month;
          const isToday = isSameDay(d, today);
          const isSelected = selectedDate ? isSameDay(d, selectedDate) : false;
          const dayEvents = eventsOnDay(d);
          const MAX_SHOW = 3;

          return (
            <div
              key={i}
              className={cn(
                "border-b border-r border-border min-h-24 p-1 cursor-pointer transition-colors",
                !isCurrentMonth && "bg-muted/20",
                isToday && "bg-primary/5",
                isSelected && "ring-2 ring-inset ring-primary/50",
                "hover:bg-muted/30"
              )}
              onClick={() => onSelectDate(d)}
            >
              {/* Date number */}
              <div className="flex justify-end mb-0.5">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    isToday && "bg-primary text-primary-foreground font-bold",
                    !isToday && isCurrentMonth && "text-foreground",
                    !isToday && !isCurrentMonth && "text-muted-foreground",
                  )}
                >
                  {d.getDate()}
                </span>
              </div>

              {/* Events */}
              <div className="space-y-0.5">
                {dayEvents.slice(0, MAX_SHOW).map(ev => {
                  const colors = EVENT_COLORS[ev.event_type];
                  return (
                    <div
                      key={ev.id}
                      className={cn(
                        "flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium truncate cursor-pointer",
                        colors.bg, colors.text,
                        "hover:opacity-80 transition-opacity"
                      )}
                      onClick={e => { e.stopPropagation(); onSelectEvent(ev); }}
                    >
                      <span className="shrink-0">{EVENT_ICONS[ev.event_type]}</span>
                      <span className="truncate">{ev.title}</span>
                      {ev.starts_at.includes("T") && !ev.starts_at.endsWith("T00:00:00") && (
                        <span className="ml-auto shrink-0 opacity-70">{formatTime(ev.starts_at)}</span>
                      )}
                    </div>
                  );
                })}
                {dayEvents.length > MAX_SHOW && (
                  <div className="text-[10px] text-muted-foreground px-1">
                    +{dayEvents.length - MAX_SHOW} อีกรายการ
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

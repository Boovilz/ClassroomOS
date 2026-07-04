"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { monthGrid, isSameDay, CalendarEvent } from "./calendar-types";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const MONTH_NAMES = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

interface Props {
  year: number;
  month: number;
  today: Date;
  selected: Date | null;
  events: CalendarEvent[];
  onSelect: (d: Date) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function MiniCalendar({ year, month, today, selected, events, onSelect, onPrev, onNext }: Props) {
  const days = monthGrid(year, month);

  const hasEvent = (d: Date) => events.some(e => isSameDay(new Date(e.starts_at), d));

  return (
    <div className="bg-card rounded-2xl border border-border p-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={onPrev} className="p-1 rounded-lg hover:bg-muted">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">
          {MONTH_NAMES[month]} {year + 543}
        </span>
        <button onClick={onNext} className="p-1 rounded-lg hover:bg-muted">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(w => (
          <div key={w} className="text-center text-[10px] text-muted-foreground font-medium py-0.5">{w}</div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d, i) => {
          const isCurMonth = d.getMonth() === month;
          const isToday    = isSameDay(d, today);
          const isSel      = selected ? isSameDay(d, selected) : false;
          const hasDot     = hasEvent(d) && isCurMonth;

          return (
            <button
              key={i}
              onClick={() => onSelect(d)}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-full h-7 w-7 mx-auto text-xs transition-colors",
                !isCurMonth && "text-muted-foreground/40",
                isCurMonth && !isToday && !isSel && "hover:bg-muted text-foreground",
                isToday && !isSel && "text-primary font-semibold",
                isSel && "bg-primary text-primary-foreground font-semibold",
              )}
            >
              {d.getDate()}
              {hasDot && !isSel && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

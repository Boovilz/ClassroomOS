"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const MONTH_LABELS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Click-to-toggle multi-date picker — no external calendar lib in this project, so this is a small self-contained month grid. */
export function MultiDateCalendar({
  selected,
  onToggle,
  initialYear,
  initialMonth,
}: {
  selected: string[];
  onToggle: (date: string) => void;
  initialYear: number;
  initialMonth: number;
}) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const selectedSet = new Set(selected);

  function goToPrevMonth() {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  }

  const cells: (number | null)[] = [...Array(firstDayOfWeek).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="w-fit rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between">
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={goToPrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {MONTH_LABELS[month]} {year}
        </span>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={goToNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const iso = toIsoDate(year, month, day);
          const isSelected = selectedSet.has(iso);
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onToggle(iso)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors hover:bg-muted",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

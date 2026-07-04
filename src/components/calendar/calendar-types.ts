export type EventType = "exam" | "activity" | "parent_meeting" | "field_trip" | "holiday";
export type CalendarView = "month" | "week" | "agenda";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  classroom: string | null;
  starts_at: string;
  ends_at: string | null;
  created_by: string | null;
  created_at?: string;
}

export const EVENT_COLORS: Record<EventType, { bg: string; text: string; border: string; dot: string }> = {
  exam:           { bg: "bg-red-100 dark:bg-red-950/60",    text: "text-red-700 dark:text-red-300",    border: "border-red-400",    dot: "bg-red-500" },
  activity:       { bg: "bg-green-100 dark:bg-green-950/60", text: "text-green-700 dark:text-green-300", border: "border-green-400",  dot: "bg-green-500" },
  parent_meeting: { bg: "bg-purple-100 dark:bg-purple-950/60", text: "text-purple-700 dark:text-purple-300", border: "border-purple-400", dot: "bg-purple-500" },
  field_trip:     { bg: "bg-orange-100 dark:bg-orange-950/60", text: "text-orange-700 dark:text-orange-300", border: "border-orange-400", dot: "bg-orange-500" },
  holiday:        { bg: "bg-blue-100 dark:bg-blue-950/60",   text: "text-blue-700 dark:text-blue-300",   border: "border-blue-400",   dot: "bg-blue-500" },
};

export const EVENT_ICONS: Record<EventType, string> = {
  exam:           "📝",
  activity:       "🎉",
  parent_meeting: "👨‍👩‍👧",
  field_trip:     "🚌",
  holiday:        "🏖️",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  exam:           "สอบ",
  activity:       "กิจกรรม",
  parent_meeting: "ประชุมผู้ปกครอง",
  field_trip:     "ทัศนศึกษา / ค่าย",
  holiday:        "วันหยุด",
};

export const ALL_EVENT_TYPES: EventType[] = ["exam", "activity", "parent_meeting", "field_trip", "holiday"];

export function formatThaiDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleDateString("th-TH", opts ?? { year: "numeric", month: "long", day: "numeric" });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function addWeeks(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n * 7);
  return r;
}

export function startOfWeek(d: Date) {
  const r = new Date(d);
  const day = r.getDay(); // 0=Sun
  r.setDate(r.getDate() - day);
  return r;
}

export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const days: Date[] = [];
  // pad start (Sun=0)
  for (let i = 0; i < first.getDay(); i++) {
    days.push(new Date(year, month, 1 - (first.getDay() - i)));
  }
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  // pad end to complete rows of 7
  while (days.length % 7 !== 0) {
    const last2 = days[days.length - 1];
    days.push(new Date(last2.getFullYear(), last2.getMonth(), last2.getDate() + 1));
  }
  return days;
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Calendar, Filter, Coins, Activity, BookOpen, Heart, Home, PiggyBank, Utensils, Brain, ClipboardList, Award, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TimelineCard } from "./timeline-card";
import type { TimelineEvent } from "@/app/api/students/[id]/timeline/route";

interface Student {
  id: string;
  full_name: string;
  student_code: string;
  grade: string;
  classroom: string;
  photo_url: string | null;
}

interface Summary {
  presentDays: number;
  absentDays: number;
  avgScore: number | null;
  coins: number;
  behavior: number;
  bmi: string | null;
  savings: number | null;
  eqTotal: number | null;
  sdqRisk: string | null;
  sdqScore: number | null;
}

const MODULES = [
  { value: "all",         label: "ทั้งหมด",      icon: Activity },
  { value: "attendance",  label: "การเช็คชื่อ",  icon: Calendar },
  { value: "grade",       label: "คะแนน",        icon: BookOpen },
  { value: "behavior",    label: "พฤติกรรม",     icon: Activity },
  { value: "health",      label: "สุขภาพ",       icon: Heart },
  { value: "home_visit",  label: "เยี่ยมบ้าน",   icon: Home },
  { value: "savings",     label: "ออมทรัพย์",    icon: PiggyBank },
  { value: "lunch",       label: "อาหารกลางวัน", icon: Utensils },
  { value: "eq",          label: "EQ",            icon: Brain },
  { value: "sdq",         label: "SDQ",           icon: ClipboardList },
  { value: "certificate", label: "เกียรติบัตร",  icon: Award },
  { value: "document",    label: "เอกสาร",       icon: FileText },
];

const DATE_RANGES = [
  { value: "all",     label: "ทั้งหมด" },
  { value: "today",   label: "วันนี้" },
  { value: "7d",      label: "7 วัน" },
  { value: "30d",     label: "30 วัน" },
  { value: "term",    label: "ภาคเรียนนี้" },
  { value: "year",    label: "ปีการศึกษานี้" },
];

const COLOR_MAP: Record<string, string> = {
  green:   "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800",
  blue:    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  orange:  "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  red:     "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800",
  purple:  "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  yellow:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
  pink:    "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 border-pink-200 dark:border-pink-800",
  gray:    "bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300 border-gray-200 dark:border-gray-700",
  amber:   "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  sky:     "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800",
};

export { COLOR_MAP };

function getDateRange(range: string): { dateFrom: string | null; dateTo: string | null } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (range === "today") { const t = fmt(now); return { dateFrom: t, dateTo: t }; }
  if (range === "7d") { const f = new Date(now); f.setDate(f.getDate() - 7); return { dateFrom: fmt(f), dateTo: null }; }
  if (range === "30d") { const f = new Date(now); f.setDate(f.getDate() - 30); return { dateFrom: fmt(f), dateTo: null }; }
  if (range === "term") { const m = now.getMonth(); const termStart = m >= 4 && m <= 9 ? new Date(now.getFullYear(), 4, 1) : new Date(m >= 10 ? now.getFullYear() : now.getFullYear() - 1, 10, 1); return { dateFrom: fmt(termStart), dateTo: null }; }
  if (range === "year") { const beYear = now.getFullYear() + 543; const adYear = beYear - 543; return { dateFrom: `${adYear}-05-01`, dateTo: null }; }
  return { dateFrom: null, dateTo: null };
}

export function TimelineClient({ student, summary }: { student: Student; summary: Summary }) {
  const [activeModule, setActiveModule] = useState("all");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchEvents = useCallback(async (reset = true, cursor: string | null = null) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    const { dateFrom, dateTo } = getDateRange(dateRange);
    const params = new URLSearchParams({ module: activeModule });
    if (search) params.set("search", search);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (cursor) params.set("cursor", cursor);

    try {
      const res = await fetch(`/api/students/${student.id}/timeline?${params}`);
      const data = await res.json();
      if (reset) setEvents(data.events ?? []);
      else setEvents((prev) => [...prev, ...(data.events ?? [])]);
      setHasMore(data.hasMore ?? false);
      setNextCursor(data.nextCursor ?? null);
    } finally {
      if (reset) setLoading(false); else setLoadingMore(false);
    }
  }, [student.id, activeModule, search, dateRange]);

  // Initial + filter changes
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchEvents(true), 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [fetchEvents]);

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        fetchEvents(false, nextCursor);
      }
    }, { threshold: 0.1 });
    observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, nextCursor, fetchEvents]);

  const nutLabel: Record<string, string> = { normal: "ปกติ", underweight: "ผอม", overweight: "เกิน", obese: "อ้วน", severely_underweight: "ผอมมาก" };
  const bmiStatus = summary.bmi ? `BMI ${summary.bmi}` : "ไม่มีข้อมูล";

  return (
    <div className="space-y-6">
      {/* Student Header Card */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {student.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={student.photo_url} alt={student.full_name} className="h-20 w-20 rounded-2xl object-cover ring-2 ring-primary/20" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-3xl">👤</div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">{student.full_name}</h2>
            <div className="mt-1 flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">รหัส {student.student_code}</Badge>
              {student.grade && <Badge variant="outline" className="text-xs">ชั้น {student.grade}</Badge>}
              {student.classroom && <Badge variant="outline" className="text-xs">ห้อง {student.classroom}</Badge>}
            </div>
          </div>
        </div>

        {/* Summary stats grid */}
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
          {[
            { label: "มาเรียน",   value: `${summary.presentDays} วัน`,  color: "text-green-600" },
            { label: "ขาดเรียน", value: `${summary.absentDays} วัน`,   color: "text-red-500" },
            { label: "คะแนนเฉลี่ย", value: summary.avgScore != null ? `${summary.avgScore}%` : "-", color: "text-blue-600" },
            { label: "เหรียญ",   value: `${summary.coins.toLocaleString()}`, color: "text-amber-600" },
            { label: "พฤติกรรม", value: summary.behavior >= 0 ? `+${summary.behavior}` : `${summary.behavior}`, color: summary.behavior >= 0 ? "text-green-600" : "text-red-500" },
            { label: "BMI",      value: bmiStatus,       color: "text-rose-600" },
            { label: "ออมทรัพย์", value: summary.savings != null ? `฿${summary.savings.toLocaleString()}` : "-", color: "text-emerald-600" },
            { label: "EQ",       value: summary.eqTotal != null ? `${summary.eqTotal}/25` : "-", color: "text-pink-600" },
            { label: "SDQ",      value: summary.sdqRisk ?? "-", color: summary.sdqRisk === "ปกติ" ? "text-green-600" : "text-orange-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-muted/40 p-2 text-center">
              <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        {/* Module tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {MODULES.map((m) => (
            <button
              key={m.value}
              onClick={() => setActiveModule(m.value)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${activeModule === m.value ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/60 text-muted-foreground hover:bg-muted"}`}
            >
              <m.icon className="h-3 w-3" />
              {m.label}
            </button>
          ))}
        </div>

        {/* Search + date */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="ค้นหาในประวัติ..." className="pl-8 h-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="h-9 w-36 text-xs shrink-0">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map((d) => <SelectItem key={d.value} value={d.value} className="text-xs">{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative pl-4">
        {/* Vertical line */}
        <div className="absolute left-[1.1rem] top-0 bottom-0 w-0.5 bg-border/60" />

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="ml-6 h-24 animate-pulse rounded-2xl bg-muted/50" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="ml-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16 text-center text-muted-foreground">
            <p className="text-3xl mb-2">📭</p>
            <p className="font-medium">ไม่พบเหตุการณ์</p>
            <p className="text-sm mt-1">ลองเปลี่ยน Filter หรือช่วงเวลา</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event, idx) => {
              const showDateLabel = idx === 0 || !isSameDay(events[idx - 1].event_date, event.event_date);
              return (
                <div key={event.id}>
                  {showDateLabel && (
                    <div className="ml-6 mb-2 mt-4 first:mt-0 flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">{formatDateLabel(event.event_date)}</span>
                      <div className="flex-1 h-px bg-border/40" />
                    </div>
                  )}
                  <TimelineCard event={event} studentId={student.id} />
                </div>
              );
            })}
          </div>
        )}

        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} className="h-4" />

        {loadingMore && (
          <div className="ml-6 mt-3 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted/50" />
            ))}
          </div>
        )}

        {!hasMore && events.length > 0 && (
          <p className="ml-6 mt-6 text-center text-xs text-muted-foreground">— ไม่มีเหตุการณ์เพิ่มเติม —</p>
        )}
      </div>
    </div>
  );
}

function isSameDay(a: string, b: string) {
  return a.slice(0, 10) === b.slice(0, 10);
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr.slice(0, 10);
  const thDay = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัส","ศุกร์","เสาร์"][d.getDay()];
  const thMonth = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."][d.getMonth()];
  return `${thDay}ที่ ${d.getDate()} ${thMonth} ${d.getFullYear() + 543}`;
}

// Re-export for card use
export { Coins };

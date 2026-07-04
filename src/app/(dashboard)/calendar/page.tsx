"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Download,
  CalendarDays, LayoutList, Grid3x3, CalendarRange,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CalendarEvent, EventType, CalendarView,
  EVENT_COLORS, EVENT_ICONS, EVENT_TYPE_LABELS, ALL_EVENT_TYPES,
  addMonths, addWeeks, startOfWeek, isSameDay,
} from "@/components/calendar/calendar-types";
import { MonthView }   from "@/components/calendar/month-view";
import { WeekView }    from "@/components/calendar/week-view";
import { AgendaView }  from "@/components/calendar/agenda-view";
import { MiniCalendar } from "@/components/calendar/mini-calendar";
import { EventDialog }  from "@/components/calendar/event-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

const MONTH_NAMES = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถ���นายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

function exportICS(events: CalendarEvent[]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ClassroomOS//Calendar//TH",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const e of events) {
    const uid = `${e.id}@classroomos`;
    const dtstart = e.starts_at.replace(/[-:]/g, "").replace(/\.\d+/, "").replace("T", "T");
    const dtend   = e.ends_at  ? e.ends_at.replace(/[-:]/g, "").replace(/\.\d+/, "").replace("T", "T") : dtstart;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${e.title}`,
      e.description ? `DESCRIPTION:${e.description.replace(/\n/g, "\\n")}` : "",
      e.classroom   ? `LOCATION:${e.classroom}` : "",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.filter(Boolean).join("\r\n")], { type: "text/calendar" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "classroomos-calendar.ics";
  a.click();
}

export default function CalendarPage() {
  const today = new Date();
  const [view, setView] = useState<CalendarView>("month");
  const [curDate, setCurDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTypes, setActiveTypes] = useState<Set<EventType>>(new Set(ALL_EVENT_TYPES));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<string>("");

  // Date range to fetch
  const fetchRange = useCallback(() => {
    if (view === "month") {
      const year  = curDate.getFullYear();
      const month = curDate.getMonth();
      return {
        from: new Date(year, month, 1).toISOString().split("T")[0],
        to:   new Date(year, month + 1, 0).toISOString().split("T")[0],
      };
    }
    if (view === "week") {
      const sw = startOfWeek(curDate);
      const ew = new Date(sw);
      ew.setDate(sw.getDate() + 6);
      return { from: sw.toISOString().split("T")[0], to: ew.toISOString().split("T")[0] };
    }
    // agenda — 3 months
    const from = new Date(curDate);
    const to   = new Date(curDate);
    to.setMonth(to.getMonth() + 3);
    return { from: from.toISOString().split("T")[0], to: to.toISOString().split("T")[0] };
  }, [view, curDate]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const { from, to } = fetchRange();
    const res = await fetch(`/api/calendar?from=${from}&to=${to}`);
    if (res.ok) {
      const json = await res.json();
      setEvents(json.events ?? []);
    }
    setLoading(false);
  }, [fetchRange]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const filteredEvents = events.filter(e => activeTypes.has(e.event_type));

  const toggleType = (t: EventType) => {
    setActiveTypes(prev => {
      const next = new Set(prev);
      if (next.has(t)) { next.delete(t); } else { next.add(t); }
      return next;
    });
  };

  const handlePrev = () => {
    if (view === "month") setCurDate(d => addMonths(d, -1));
    else if (view === "week") setCurDate(d => addWeeks(d, -1));
    else setCurDate(d => { const n = new Date(d); n.setMonth(n.getMonth() - 3); return n; });
  };
  const handleNext = () => {
    if (view === "month") setCurDate(d => addMonths(d, 1));
    else if (view === "week") setCurDate(d => addWeeks(d, 1));
    else setCurDate(d => { const n = new Date(d); n.setMonth(n.getMonth() + 3); return n; });
  };
  const handleToday = () => {
    setCurDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  };

  const headerLabel = () => {
    if (view === "month") return `${MONTH_NAMES[curDate.getMonth()]} ${curDate.getFullYear() + 543}`;
    if (view === "week") {
      const sw = startOfWeek(curDate);
      const ew = new Date(sw); ew.setDate(sw.getDate() + 6);
      return `${sw.getDate()} – ${ew.getDate()} ${MONTH_NAMES[ew.getMonth()]} ${ew.getFullYear() + 543}`;
    }
    return `${MONTH_NAMES[curDate.getMonth()]} ${curDate.getFullYear() + 543} – ถัดไป`;
  };

  const openCreate = (date?: Date) => {
    setEditEvent(null);
    setDefaultDate(date ? date.toISOString().split("T")[0] : today.toISOString().split("T")[0]);
    setDialogOpen(true);
  };

  const openEdit = (ev: CalendarEvent) => {
    setDetailEvent(null);
    setEditEvent(ev);
    setDialogOpen(true);
  };

  const onSelectDate = (d: Date) => {
    setSelectedDate(d);
    if (view === "month") openCreate(d);
  };

  const onEventSaved = (ev: CalendarEvent) => {
    setEvents(prev => {
      const idx = prev.findIndex(e => e.id === ev.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = ev; return next; }
      return [...prev, ev].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    });
  };

  const onEventDeleted = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  // Today's events for sidebar
  const todayEvents = filteredEvents.filter(e => isSameDay(new Date(e.starts_at), today));

  // Selected day events
  const selectedDayEvents = selectedDate
    ? filteredEvents.filter(e => isSameDay(new Date(e.starts_at), selectedDate))
    : [];

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col gap-4 overflow-y-auto pb-4">
        <Button onClick={() => openCreate()} className="w-full gap-2">
          <Plus className="h-4 w-4" /> สร้างกิจกรรม
        </Button>

        {/* Mini calendar */}
        <MiniCalendar
          year={curDate.getFullYear()}
          month={curDate.getMonth()}
          today={today}
          selected={selectedDate}
          events={filteredEvents}
          onSelect={d => { setSelectedDate(d); if (view !== "month") setView("agenda"); }}
          onPrev={() => setCurDate(d => addMonths(d, -1))}
          onNext={() => setCurDate(d => addMonths(d, 1))}
        />

        {/* Filter by type */}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ประเภทกิจกรรม</p>
          {ALL_EVENT_TYPES.map(t => {
            const colors = EVENT_COLORS[t];
            const active = activeTypes.has(t);
            return (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={cn(
                  "w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors",
                  active ? cn(colors.bg, colors.text) : "text-muted-foreground hover:bg-muted"
                )}
              >
                <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", active ? colors.dot : "bg-muted-foreground/40")} />
                {EVENT_ICONS[t]} {EVENT_TYPE_LABELS[t]}
              </button>
            );
          })}
        </div>

        {/* Today events */}
        {todayEvents.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">วันนี้</p>
            {todayEvents.map(ev => {
              const colors = EVENT_COLORS[ev.event_type];
              return (
                <button
                  key={ev.id}
                  onClick={() => setDetailEvent(ev)}
                  className={cn("w-full text-left rounded-lg px-2 py-1.5 text-xs truncate transition-colors", colors.bg, colors.text, "hover:opacity-80")}
                >
                  {EVENT_ICONS[ev.event_type]} {ev.title}
                </button>
              );
            })}
          </div>
        )}
      </aside>

      {/* ── Main Area ──────────��──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 glass-card rounded-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-wrap">
          <Button variant="outline" size="sm" onClick={handleToday}>วันนี้</Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handlePrev}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={handleNext}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <h2 className="text-base font-semibold flex-1">{headerLabel()}</h2>

          {loading && <span className="text-xs text-muted-foreground animate-pulse">กำลังโหลด...</span>}

          {/* View switcher */}
          <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
            {([
              { v: "month" as const,  icon: <Grid3x3    className="h-3.5 w-3.5" />, label: "เดือน" },
              { v: "week"  as const,  icon: <CalendarRange className="h-3.5 w-3.5" />, label: "สัปดาห์" },
              { v: "agenda" as const, icon: <LayoutList className="h-3.5 w-3.5" />, label: "Agenda" },
            ]).map(({ v, icon, label }) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                  view === v ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {icon} <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <Button variant="ghost" size="icon" title="ส่งออก ICS" onClick={() => exportICS(filteredEvents)}>
            <Download className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => openCreate()} className="gap-1 hidden sm:flex">
            <Plus className="h-3.5 w-3.5" /> สร้าง
          </Button>
        </div>

        {/* Calendar body */}
        <div className="flex-1 overflow-hidden">
          {view === "month" && (
            <MonthView
              year={curDate.getFullYear()}
              month={curDate.getMonth()}
              events={filteredEvents}
              today={today}
              selectedDate={selectedDate}
              onSelectDate={onSelectDate}
              onSelectEvent={ev => setDetailEvent(ev)}
            />
          )}
          {view === "week" && (
            <WeekView
              baseDate={curDate}
              events={filteredEvents}
              today={today}
              onSelectEvent={ev => setDetailEvent(ev)}
              onSelectDate={d => { setSelectedDate(d); setCurDate(d); }}
            />
          )}
          {view === "agenda" && (
            <AgendaView
              events={filteredEvents}
              today={today}
              onSelectEvent={ev => setDetailEvent(ev)}
            />
          )}
        </div>
      </div>

      {/* Selected day panel (shown when date selected in month view) */}
      {selectedDate && selectedDayEvents.length > 0 && view === "month" && (
        <aside className="hidden xl:flex w-56 shrink-0 flex-col gap-2">
          <div className="glass-card rounded-2xl p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">
              {selectedDate.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "short" })}
            </p>
            {selectedDayEvents.map(ev => {
              const colors = EVENT_COLORS[ev.event_type];
              return (
                <button
                  key={ev.id}
                  onClick={() => setDetailEvent(ev)}
                  className={cn(
                    "w-full text-left rounded-xl px-3 py-2 text-xs space-y-0.5 transition-colors hover:opacity-80",
                    colors.bg
                  )}
                >
                  <div className={cn("font-semibold truncate", colors.text)}>
                    {EVENT_ICONS[ev.event_type]} {ev.title}
                  </div>
                  {ev.classroom && (
                    <div className="text-muted-foreground truncate">📍 {ev.classroom}</div>
                  )}
                </button>
              );
            })}
            <Separator />
            <button
              onClick={() => openCreate(selectedDate)}
              className="w-full text-xs text-primary hover:underline text-left"
            >
              + เพิ่มกิจกร���ม
            </button>
          </div>
        </aside>
      )}

      {/* Create / Edit dialog */}
      <EventDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        event={editEvent}
        defaultDate={defaultDate}
        onSaved={onEventSaved}
        onDeleted={onEventDeleted}
      />

      {/* Event Detail dialog */}
      <Dialog open={!!detailEvent} onOpenChange={v => !v && setDetailEvent(null)}>
        <DialogContent className="max-w-sm">
          {detailEvent && (() => {
            const colors = EVENT_COLORS[detailEvent.event_type];
            return (
              <>
                <DialogHeader>
                  <div className={cn("inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold w-fit mb-1", colors.bg, colors.text)}>
                    {EVENT_ICONS[detailEvent.event_type]} {EVENT_TYPE_LABELS[detailEvent.event_type]}
                  </div>
                  <DialogTitle className="text-lg">{detailEvent.title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <div className="flex gap-3">
                    <span className="text-muted-foreground w-16 shrink-0">เริ่ม</span>
                    <span>{new Date(detailEvent.starts_at).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}</span>
                  </div>
                  {detailEvent.ends_at && (
                    <div className="flex gap-3">
                      <span className="text-muted-foreground w-16 shrink-0">สิ้นสุด</span>
                      <span>{new Date(detailEvent.ends_at).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}</span>
                    </div>
                  )}
                  {detailEvent.classroom && (
                    <div className="flex gap-3">
                      <span className="text-muted-foreground w-16 shrink-0">สถานที่</span>
                      <span>{detailEvent.classroom}</span>
                    </div>
                  )}
                  {detailEvent.description && (
                    <div className="flex gap-3">
                      <span className="text-muted-foreground w-16 shrink-0">รายละเอียด</span>
                      <span className="whitespace-pre-wrap">{detailEvent.description}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => openEdit(detailEvent)}>แก้ไข</Button>
                  <Button className="flex-1" onClick={() => setDetailEvent(null)}>ปิด</Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

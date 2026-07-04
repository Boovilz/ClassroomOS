"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Bell, Search, CheckCheck, ExternalLink, Filter,
  AlertCircle, AlertTriangle, Info, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  priority: string;
  category: string;
  read_at: string | null;
  created_at: string;
  channel: string;
}

const PRIORITY_COLOR: Record<string, string> = {
  critical: "border-l-red-500 bg-red-50 dark:bg-red-950/40",
  high:     "border-l-orange-500 bg-orange-50 dark:bg-orange-950/40",
  medium:   "border-l-blue-400 bg-blue-50/50 dark:bg-blue-950/30",
  low:      "border-l-border bg-card",
};

const PRIORITY_ICON: Record<string, React.ReactNode> = {
  critical: <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />,
  high:     <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />,
  medium:   <Info className="h-4 w-4 text-blue-500 shrink-0" />,
  low:      <Info className="h-4 w-4 text-muted-foreground shrink-0" />,
};

const PRIORITY_LABEL: Record<string, string> = {
  critical: "วิกฤต", high: "สูง", medium: "ปกติ", low: "ต่ำ",
};

const CATEGORY_LABEL: Record<string, string> = {
  attendance: "การเช็คชื่อ",
  behavior:   "พฤติกรรม",
  academic:   "ผลการเรียน",
  health:     "สุขภาพ",
  finance:    "การเงิน",
  sdq:        "SDQ",
  system:     "ระบบ",
  general:    "ทั่วไป",
};

const MODULES = ["", "attendance", "behavior", "academic", "health", "finance", "sdq", "system"];

function groupByDate(notifications: Notification[]): [string, Notification[]][] {
  const map = new Map<string, Notification[]>();
  for (const n of notifications) {
    const d = new Date(n.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    let label: string;
    if (d.toDateString() === today.toDateString()) label = "วันนี้";
    else if (d.toDateString() === yesterday.toDateString()) label = "เมื่อวาน";
    else label = d.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(n);
  }
  return Array.from(map.entries());
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "เมื่อกี้";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  return `${Math.floor(h / 24)} วันที่แล้ว`;
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState("all");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [items, setItems] = useState<Notification[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(search), 300);
  }, [search]);

  const fetchPage = useCallback(async (reset: boolean, currentCursor?: string | null) => {
    setLoading(true);
    const params = new URLSearchParams({ filter, limit: "25" });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (category) params.set("module", category);
    if (priority) params.set("priority", priority);
    const c = reset ? null : (currentCursor ?? cursor);
    if (c) params.set("cursor", c);
    const res = await fetch(`/api/notifications?${params}`);
    if (!res.ok) { setLoading(false); return; }
    const json = await res.json();
    setItems(prev => reset ? json.notifications : [...prev, ...json.notifications]);
    setHasMore(json.hasMore);
    setCursor(json.nextCursor ?? null);
    setTotal(json.total ?? 0);
    setUnreadCount(json.unreadCount ?? 0);
    setLoading(false);
  }, [filter, debouncedSearch, category, priority, cursor]);

  useEffect(() => {
    setCursor(null);
    fetchPage(true, null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, debouncedSearch, category, priority]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loading) fetchPage(false);
    }, { threshold: 0.5 });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, loading, fetchPage]);

  const markRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "read" }),
    });
    setItems(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setItems(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnreadCount(0);
  };

  const groups = groupByDate(items);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">ศูนย์การแจ้งเตือน</h1>
            <p className="text-sm text-muted-foreground">
              {total > 0 ? `${total} รายการ` : "ไม่มีการแจ้งเตือน"}
              {unreadCount > 0 && ` · ยังไม่อ่าน ${unreadCount} รายการ`}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1.5">
            <CheckCheck className="h-4 w-4" />
            ทำเครื่องหมายอ่านทั้งหมด
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาการแจ้งเตือน..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-44">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="หมวดหมู่" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">ทุกหมวดหมู่</SelectItem>
              {MODULES.filter(Boolean).map(m => (
                <SelectItem key={m} value={m}>{CATEGORY_LABEL[m] ?? m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="ความสำคัญ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">ทุกระดับ</SelectItem>
              <SelectItem value="critical">วิกฤต</SelectItem>
              <SelectItem value="high">สูง</SelectItem>
              <SelectItem value="medium">ปกติ</SelectItem>
              <SelectItem value="low">ต่ำ</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-1.5">
          {[{ k: "all", l: "ทั้งหมด" }, { k: "unread", l: "ยังไม่อ่าน" }, { k: "read", l: "อ่านแล้ว" }].map(({ k, l }) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                filter === k
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {l}
              {k === "unread" && unreadCount > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white px-1">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Notification list */}
      <div className="space-y-6">
        {loading && items.length === 0 && (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Bell className="h-12 w-12 opacity-30" />
            <p className="text-base">ไม่มีการแจ้งเตือน</p>
            <p className="text-sm">ยังไม่มีการแจ้งเตือนตามเงื่อนไขที่เลือก</p>
          </div>
        )}

        {groups.map(([date, notifs]) => (
          <div key={date} className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground px-1">{date}</h3>
            {notifs.map(n => (
              <div
                key={n.id}
                className={cn(
                  "rounded-2xl border-l-4 p-4 cursor-pointer transition-all",
                  PRIORITY_COLOR[n.priority] ?? PRIORITY_COLOR.medium,
                  !n.read_at && "ring-1 ring-primary/20",
                  "hover:shadow-sm"
                )}
                onClick={() => { if (!n.read_at) markRead(n.id); }}
              >
                <div className="flex items-start gap-3">
                  {PRIORITY_ICON[n.priority] ?? PRIORITY_ICON.medium}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {!n.read_at && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                        )}
                        <p className={cn("text-sm", !n.read_at ? "font-semibold" : "font-medium text-muted-foreground")}>
                          {n.title}
                        </p>
                      </div>
                      {n.link && (
                        <Link
                          href={n.link}
                          onClick={e => e.stopPropagation()}
                          className="shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                        </Link>
                      )}
                    </div>
                    {n.body && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-3">{n.body}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        {CATEGORY_LABEL[n.category] ?? n.category}
                      </Badge>
                      <Badge
                        className={cn(
                          "text-[10px] px-1.5 py-0 h-4",
                          n.priority === "critical" && "bg-red-500 text-white",
                          n.priority === "high" && "bg-orange-500 text-white",
                          n.priority === "medium" && "bg-blue-500 text-white",
                          n.priority === "low" && "bg-muted-foreground text-white",
                        )}
                      >
                        {PRIORITY_LABEL[n.priority] ?? n.priority}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

        {hasMore && (
          <div ref={sentinelRef} className="flex justify-center py-4">
            {loading
              ? <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              : <Button variant="ghost" size="sm" className="gap-1"><ChevronDown className="h-4 w-4" /> โหลดเพิ่มเติม</Button>
            }
          </div>
        )}
      </div>
    </div>
  );
}

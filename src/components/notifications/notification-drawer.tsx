"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { X, Search, CheckCheck, Bell, ExternalLink } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  critical: "bg-red-100 border-red-400 dark:bg-red-950 dark:border-red-600",
  high:     "bg-orange-50 border-orange-300 dark:bg-orange-950 dark:border-orange-600",
  medium:   "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-700",
  low:      "bg-muted border-border",
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: "bg-red-500 text-white",
  high:     "bg-orange-500 text-white",
  medium:   "bg-blue-500 text-white",
  low:      "bg-muted-foreground text-white",
};

const PRIORITY_LABEL: Record<string, string> = {
  critical: "วิกฤต", high: "สูง", medium: "ปกติ", low: "ต่ำ",
};

const FILTERS = [
  { key: "all",    label: "ทั้งหมด" },
  { key: "unread", label: "ยังไม่อ่าน" },
  { key: "read",   label: "อ่านแล้ว" },
];

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

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUnreadChange?: (count: number) => void;
}

export function NotificationDrawer({ open, onOpenChange, onUnreadChange }: Props) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [items, setItems] = useState<Notification[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(search), 300);
  }, [search]);

  const fetchPage = useCallback(async (reset: boolean) => {
    setLoading(true);
    const params = new URLSearchParams({ filter, limit: "20" });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (!reset && cursor) params.set("cursor", cursor);
    const res = await fetch(`/api/notifications?${params}`);
    if (!res.ok) { setLoading(false); return; }
    const json = await res.json();
    setItems(prev => reset ? json.notifications : [...prev, ...json.notifications]);
    setHasMore(json.hasMore);
    setCursor(json.nextCursor ?? null);
    setUnreadCount(json.unreadCount ?? 0);
    onUnreadChange?.(json.unreadCount ?? 0);
    setLoading(false);
  }, [filter, debouncedSearch, cursor, onUnreadChange]);

  useEffect(() => {
    if (open) { setCursor(null); fetchPage(true); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filter, debouncedSearch]);

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
    const next = Math.max(0, unreadCount - 1);
    setUnreadCount(next);
    onUnreadChange?.(next);
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setItems(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnreadCount(0);
    onUnreadChange?.(0);
  };

  const groups = groupByDate(items);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:w-[480px] flex flex-col p-0 gap-0">
        <SheetHeader className="px-5 py-4 border-b flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <SheetTitle className="text-base">การแจ้งเตือน</SheetTitle>
            {unreadCount > 0 && (
              <Badge className="bg-destructive text-destructive-foreground text-xs px-1.5 py-0">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs gap-1">
                <CheckCheck className="h-3.5 w-3.5" /> อ่านทั้งหมด
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Filters */}
        <div className="px-5 py-3 border-b space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="ค้นหาการแจ้งเตือน..."
              className="pl-8 h-8 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                  filter === f.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && items.length === 0 && (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <Bell className="h-8 w-8 opacity-40" />
              <p className="text-sm">ไม่มีการแจ้งเตือน</p>
            </div>
          )}

          {groups.map(([date, notifs]) => (
            <div key={date}>
              <div className="px-5 py-2 text-xs font-semibold text-muted-foreground bg-muted/30 sticky top-0">
                {date}
              </div>
              {notifs.map(n => (
                <div
                  key={n.id}
                  className={cn(
                    "mx-3 my-1.5 rounded-xl border-l-4 p-3 cursor-pointer transition-opacity",
                    PRIORITY_COLOR[n.priority] ?? PRIORITY_COLOR.medium,
                    n.read_at ? "opacity-60" : "opacity-100"
                  )}
                  onClick={() => { if (!n.read_at) markRead(n.id); }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        {!n.read_at && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        )}
                        <span className="text-sm font-semibold truncate">{n.title}</span>
                      </div>
                      {n.body && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", PRIORITY_BADGE[n.priority] ?? PRIORITY_BADGE.medium)}>
                          {PRIORITY_LABEL[n.priority] ?? n.priority}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                          {n.category}
                        </span>
                      </div>
                    </div>
                    {n.link && (
                      <Link
                        href={n.link}
                        onClick={e => e.stopPropagation()}
                        className="shrink-0 rounded p-1 hover:bg-black/10 dark:hover:bg-white/10"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {hasMore && <div ref={sentinelRef} className="py-4 flex justify-center">
            {loading && <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />}
          </div>}
        </div>

        {/* Footer link */}
        <div className="border-t px-5 py-3">
          <Link
            href="/notifications"
            onClick={() => onOpenChange(false)}
            className="block text-center text-sm text-primary hover:underline"
          >
            ดูการแจ้งเตือนทั้งหมด →
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}

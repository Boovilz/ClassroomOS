"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, X, Clock, ArrowRight, Loader2, Delete,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  category: string;
  title: string;
  subtitle: string | null;
  detail: string | null;
  icon: string;
  color: string;
  href: string;
  score: number;
}

interface Suggestion {
  id: string;
  label: string;
  sub: string;
  href: string;
  type: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  students:    "นักเรียน",
  subjects:    "วิชา",
  behavior:    "พฤติกรรม",
  health:      "สุขภาพ",
  attendance:  "การเข้าเรียน",
  finance:     "การเงิน",
  home_visits: "เยี่ยมบ้าน",
  teachers:    "บุคลากร",
};

const CATEGORY_ORDER = ["students", "subjects", "teachers", "behavior", "attendance", "health", "finance", "home_visits"];

const QUICK_LINKS = [
  { label: "นักเรียนทั้งหมด", href: "/students", icon: "👥" },
  { label: "เช็คชื่อวันนี้",   href: "/attendance", icon: "✅" },
  { label: "แดชบอร์ด",        href: "/dashboard", icon: "📊" },
  { label: "ผลการเรียน",      href: "/academic", icon: "📝" },
];

const HISTORY_KEY = "classroomos_search_history";

function getHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function addHistory(q: string) {
  const prev = getHistory().filter((h) => h !== q);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([q, ...prev].slice(0, 10)));
}

function removeHistory(q: string) {
  const prev = getHistory().filter((h) => h !== q);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(prev));
}

function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-primary rounded-sm px-0.5 not-italic font-semibold">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [results, setResults] = useState<Record<string, SearchResult[]>>({});
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Refresh history on open
  useEffect(() => {
    if (open) {
      setHistory(getHistory());
      setQuery("");
      setDebouncedQ("");
      setResults({});
      setActiveIdx(-1);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounce query
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(query), 300);
  }, [query]);

  // Fetch suggestions while typing (fast, students only)
  useEffect(() => {
    if (!debouncedQ || debouncedQ.length < 1) { setSuggestions([]); return; }
    fetch(`/api/search/suggestions?q=${encodeURIComponent(debouncedQ)}`)
      .then(r => r.json())
      .then(j => setSuggestions(j.suggestions ?? []))
      .catch(() => {});
  }, [debouncedQ]);

  // Full search
  useEffect(() => {
    if (!debouncedQ || debouncedQ.length < 2) { setResults({}); setLoading(false); return; }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(debouncedQ)}`)
      .then(r => r.json())
      .then(j => { setResults(j.results ?? {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, [debouncedQ]);

  const navigate = useCallback((href: string, q?: string) => {
    if (q) addHistory(q);
    setHistory(getHistory());
    onClose();
    router.push(href);
  }, [onClose, router]);

  // Flatten all results for keyboard nav
  const flatResults: { href: string; q?: string }[] = [];
  if (!query) {
    QUICK_LINKS.forEach(l => flatResults.push({ href: l.href }));
  } else {
    CATEGORY_ORDER.forEach(cat => {
      (results[cat] ?? []).forEach(r => flatResults.push({ href: r.href, q: query }));
    });
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (activeIdx >= 0 && flatResults[activeIdx]) {
        navigate(flatResults[activeIdx].href, flatResults[activeIdx].q);
      } else if (query) {
        addHistory(query);
        setHistory(getHistory());
      }
    }
  };

  const hasResults = Object.keys(results).some(k => (results[k] ?? []).length > 0);
  const orderedCategories = CATEGORY_ORDER.filter(c => (results[c] ?? []).length > 0);
  let globalIdx = 0;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKey}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          {loading
            ? <Loader2 className="h-5 w-5 text-muted-foreground animate-spin shrink-0" />
            : <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          }
          <input
            ref={inputRef}
            type="text"
            placeholder="ค้นหานักเรียน, วิชา, เอกสาร, บันทึก..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIdx(-1); }}
            autoComplete="off"
          />
          {query && (
            <button onClick={() => setQuery("")} className="rounded-md p-0.5 hover:bg-muted">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {/* Empty state — no query */}
          {!query && (
            <div className="p-4 space-y-4">
              {/* Quick Links */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
                  ลิงก์ด่วน
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {QUICK_LINKS.map((l, i) => {
                    const active = i === activeIdx;
                    return (
                      <button
                        key={l.href}
                        onClick={() => navigate(l.href)}
                        className={cn(
                          "flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-left transition-colors",
                          active ? "bg-primary/10 text-primary" : "hover:bg-muted"
                        )}
                      >
                        <span>{l.icon}</span>
                        <span>{l.label}</span>
                        <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* History */}
              {history.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-1 mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      ค้นหาล่าสุด
                    </p>
                    <button
                      onClick={() => { localStorage.removeItem(HISTORY_KEY); setHistory([]); }}
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      ล้างทั้งหมด
                    </button>
                  </div>
                  {history.map((h) => (
                    <div key={h} className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-muted group">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <button
                        className="flex-1 text-sm text-left"
                        onClick={() => setQuery(h)}
                      >
                        {h}
                      </button>
                      <button
                        onClick={() => { removeHistory(h); setHistory(getHistory()); }}
                        className="opacity-0 group-hover:opacity-100 rounded p-0.5 hover:bg-muted-foreground/20"
                      >
                        <Delete className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Suggestions while typing (< 2 chars) */}
          {query && query.length === 1 && suggestions.length > 0 && (
            <div className="p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
                คำแนะนำ
              </p>
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => navigate(s.href, s.label)}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-left hover:bg-muted"
                >
                  <span>👤</span>
                  <span className="flex-1">{s.label}</span>
                  <span className="text-xs text-muted-foreground">{s.sub}</span>
                </button>
              ))}
            </div>
          )}

          {/* Full results */}
          {query && query.length >= 2 && (
            <div className="p-3 space-y-4">
              {loading && !hasResults && (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
                  ))}
                </div>
              )}

              {!loading && !hasResults && (
                <div className="text-center py-10 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto opacity-30 mb-2" />
                  <p className="text-sm">ไม่พบผลลัพธ์สำหรับ &quot;{query}&quot;</p>
                  <p className="text-xs mt-1">ลองเปลี่ยนคำค้นหาหรือตรวจสอบการสะกด</p>
                </div>
              )}

              {orderedCategories.map((cat) => {
                const items = results[cat] ?? [];
                return (
                  <div key={cat}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1.5">
                      {CATEGORY_LABEL[cat] ?? cat}
                    </p>
                    {items.map((item) => {
                      const myIdx = globalIdx++;
                      const active = myIdx === activeIdx;
                      return (
                        <button
                          key={item.id}
                          onClick={() => navigate(item.href, query)}
                          className={cn(
                            "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors group",
                            active ? "bg-primary/10" : "hover:bg-muted"
                          )}
                        >
                          <span className="text-lg shrink-0">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              <Highlight text={item.title} q={query} />
                            </p>
                            {(item.subtitle || item.detail) && (
                              <p className="text-xs text-muted-foreground truncate">
                                {item.subtitle}{item.subtitle && item.detail ? " · " : ""}{item.detail}
                              </p>
                            )}
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border px-1 py-0.5 font-mono">↑↓</kbd> เลือก
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border px-1 py-0.5 font-mono">↵</kbd> เปิด
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border px-1 py-0.5 font-mono">ESC</kbd> ปิด
          </span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ArrowRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  category: string;
  title: string;
  subtitle: string | null;
  detail: string | null;
  icon: string;
  href: string;
  score: number;
}

const CATEGORY_LABEL: Record<string, string> = {
  students:    "นักเรียน",
  subjects:    "วิชา",
  behavior:    "พฤติกรรม",
  health:      "สุขภาพ",
  attendance:  "��ารเข้าเรียน",
  finance:     "การเงิน",
  home_visits: "เยี่ยมบ้าน",
  teachers:    "บุคลากร",
};

const CATEGORY_ORDER = ["students", "subjects", "teachers", "behavior", "attendance", "health", "finance", "home_visits"];

function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-primary rounded-sm px-0.5 font-semibold not-italic">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initQ);
  const [debouncedQ, setDebouncedQ] = useState(initQ);
  const [results, setResults] = useState<Record<string, SearchResult[]>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(query), 300);
  }, [query]);

  const doSearch = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setResults({}); setTotal(0); return; }
    setLoading(true);
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=15`);
    if (res.ok) {
      const j = await res.json();
      setResults(j.results ?? {});
      setTotal(j.total ?? 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => { doSearch(debouncedQ); }, [debouncedQ, doSearch]);

  const navigate = (href: string) => router.push(href);

  const orderedCategories = CATEGORY_ORDER.filter(c => (results[c] ?? []).length > 0);
  const hasResults = orderedCategories.length > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">ค้นหาทั่วระบบ</h1>
        <p className="text-sm text-muted-foreground">ค้นหาข้อมูลจากทุกโมดูลของ ClassroomOS</p>
      </div>

      {/* Search box */}
      <div className="relative">
        {loading
          ? <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
          : <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        }
        <Input
          className="pl-11 h-12 text-base rounded-2xl"
          placeholder="พิมพ์ชื่อนักเรียน, วิชา, หรือข้อมูลอื่น ๆ..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {/* Result count */}
      {debouncedQ && debouncedQ.length >= 2 && !loading && (
        <p className="text-sm text-muted-foreground">
          {hasResults ? `พบ ${total} รายการสำหรับ "${debouncedQ}"` : `ไม่พบผลลัพธ์สำหรับ "${debouncedQ}"`}
        </p>
      )}

      {/* No results */}
      {debouncedQ && debouncedQ.length >= 2 && !loading && !hasResults && (
        <div className="text-center py-16 text-muted-foreground space-y-2">
          <Search className="h-10 w-10 mx-auto opacity-30" />
          <p>ไม่พบข้อมูลที่ตรง��ัน</p>
          <p className="text-sm">ลองเปลี่ยนคำค้นหาหรือตรวจสอบการสะกด</p>
        </div>
      )}

      {/* Empty state */}
      {(!debouncedQ || debouncedQ.length < 2) && (
        <div className="text-center py-16 text-muted-foreground space-y-2">
          <Search className="h-10 w-10 mx-auto opacity-30" />
          <p>พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อเริ่มค้นหา</p>
          <p className="text-xs">หรือกด <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-xs">Ctrl+K</kbd> เพื่อเปิด Quick Search</p>
        </div>
      )}

      {/* Results */}
      <div className="space-y-6">
        {orderedCategories.map(cat => (
          <div key={cat} className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground px-1">
              {CATEGORY_LABEL[cat] ?? cat}
              <span className="ml-2 text-xs font-normal">({(results[cat] ?? []).length})</span>
            </h3>
            {(results[cat] ?? []).map(item => (
              <button
                key={item.id}
                onClick={() => navigate(item.href)}
                className="w-full flex items-center gap-4 glass-card rounded-2xl px-5 py-4 text-left hover:shadow-md transition-all group"
              >
                <span className="text-2xl shrink-0">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    <Highlight text={item.title} q={debouncedQ} />
                  </p>
                  {(item.subtitle || item.detail) && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {item.subtitle}{item.subtitle && item.detail ? " · " : ""}{item.detail}
                    </p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

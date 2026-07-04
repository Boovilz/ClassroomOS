"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { SearchModal } from "./search-modal";

export function SearchTrigger() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors w-full max-w-md"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">ค้นหานักเรียน, เอกสาร, รายงาน...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border/60 bg-background px-1.5 py-0.5 text-[10px] font-mono">
          ⌘K
        </kbd>
      </button>
      <SearchModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

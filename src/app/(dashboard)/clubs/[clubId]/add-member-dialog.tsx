"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UserPlus, Search, Loader2 } from "lucide-react";

interface StudentResult {
  id: string;
  full_name: string;
  student_code: string;
  classroom: string | null;
}

export function AddMemberDialog({ clubId, schoolId }: { clubId: string; schoolId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);

  async function handleSearch() {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/students/search?q=${encodeURIComponent(query.trim())}&schoolId=${encodeURIComponent(schoolId)}`
      );
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.message ?? "ค้นหาไม่สำเร็จ");
      setResults(body.students ?? []);
    } catch (err) {
      toast.error("ค้นหานักเรียนไม่สำเร็จ", { description: (err as Error).message });
    } finally {
      setIsSearching(false);
    }
  }

  async function handleAdd(studentId: string) {
    setAddingId(studentId);
    try {
      const res = await fetch(`/api/clubs/${clubId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.message ?? "เพิ่มสมาชิกไม่สำเร็จ");
      toast.success("เพิ่มสมาชิกสำเร็จ");
      setResults((prev) => prev.filter((s) => s.id !== studentId));
      router.refresh();
    } catch (err) {
      toast.error("เพิ่มสมาชิกไม่สำเร็จ", { description: (err as Error).message });
    } finally {
      setAddingId(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSearch();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserPlus className="h-4 w-4" />
          เพิ่มสมาชิก
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>เพิ่มสมาชิกชุมนุม</DialogTitle>
          <DialogDescription>ค้นหานักเรียนด้วยชื่อหรือรหัสนักเรียน แล้วกดเพิ่ม</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="ค้นหาชื่อ หรือ รหัสนักเรียน..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button onClick={handleSearch} disabled={isSearching || !query.trim()} size="icon">
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          {results.length > 0 && (
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-1">
              {results.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between rounded-sm px-3 py-2 hover:bg-accent"
                >
                  <div>
                    <p className="text-sm font-medium">{student.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {student.student_code}
                      {student.classroom ? ` · ${student.classroom}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={addingId === student.id}
                    onClick={() => handleAdd(student.id)}
                  >
                    {addingId === student.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "เพิ่ม"}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {results.length === 0 && query && !isSearching && (
            <p className="text-center text-sm text-muted-foreground">ไม่พบนักเรียนที่ค้นหา</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

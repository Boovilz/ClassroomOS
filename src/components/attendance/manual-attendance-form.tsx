"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RosterRow } from "@/lib/queries/attendance";
import type { AttendanceStatus } from "@/lib/supabase/types";

const statusLabel: Record<AttendanceStatus, string> = {
  present: "มาเรียน",
  late: "มาสาย",
  sick: "ลาป่วย",
  personal_leave: "ลากิจ",
  absent: "ขาดเรียน",
};

export function ManualAttendanceForm({ dates, roster }: { dates: string[]; roster: RosterRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [filter, setFilter] = useState("");
  const [pendingDate, setPendingDate] = useState("");
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus | "">>(
    Object.fromEntries(roster.map((r) => [r.student_id, dates.length === 1 ? r.status ?? "" : ""]))
  );
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!filter.trim()) return roster;
    const q = filter.trim().toLowerCase();
    return roster.filter((r) => r.full_name.toLowerCase().includes(q) || r.student_code.toLowerCase().includes(q));
  }, [roster, filter]);

  function pushDates(next: string[]) {
    router.push(`${pathname}?dates=${next.join(",")}`);
  }

  function addDate() {
    if (!pendingDate || dates.includes(pendingDate)) return;
    pushDates([...dates, pendingDate].sort());
    setPendingDate("");
  }

  function removeDate(d: string) {
    const next = dates.filter((x) => x !== d);
    if (next.length === 0) return;
    pushDates(next);
  }

  function setStatus(studentId: string, status: AttendanceStatus | "") {
    setStatuses((prev) => ({ ...prev, [studentId]: status }));
  }

  function markAllVisible(status: AttendanceStatus) {
    setStatuses((prev) => {
      const next = { ...prev };
      for (const r of filtered) next[r.student_id] = status;
      return next;
    });
  }

  async function handleSave() {
    const entries = Object.entries(statuses)
      .filter(([, status]) => status !== "")
      .map(([studentId, status]) => ({ studentId, status: status as AttendanceStatus }));

    if (entries.length === 0) {
      toast.error("ยังไม่ได้เลือกสถานะของนักเรียนสักคน");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/attendance/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dates, entries }),
    });
    const data = await res.json();
    setSaving(false);

    if (!data.success) {
      toast.error("บันทึกไม่สำเร็จ", { description: data.message });
      return;
    }
    toast.success(data.message);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">วันที่:</span>
        {dates.map((d) => (
          <Badge key={d} variant="secondary" className="gap-1">
            {d}
            {dates.length > 1 && (
              <button type="button" onClick={() => removeDate(d)} aria-label={`ลบวันที่ ${d}`}>
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
        <Input type="date" value={pendingDate} onChange={(e) => setPendingDate(e.target.value)} className="w-44" />
        <Button size="sm" variant="outline" onClick={addDate} disabled={!pendingDate}>
          เพิ่มวันที่
        </Button>
      </div>

      {dates.length > 1 && (
        <p className="text-xs text-muted-foreground">เลือกหลายวันแล้ว — สถานะที่ตั้งให้นักเรียนแต่ละคนจะถูกบันทึกซ้ำในทุกวันที่เลือกไว้</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input placeholder="ค้นหาชื่อหรือรหัสนักเรียน..." value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs" />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">ทำเครื่องหมายทั้งหมด (ที่แสดงอยู่):</span>
        {(Object.keys(statusLabel) as AttendanceStatus[]).map((status) => (
          <Button key={status} size="sm" variant="outline" onClick={() => markAllVisible(status)}>
            {statusLabel[status]}
          </Button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium">รหัสนักเรียน</th>
              <th className="px-3 py-2 text-left font-medium">ชื่อ-นามสกุล</th>
              <th className="px-3 py-2 text-left font-medium">ห้องเรียน</th>
              <th className="px-3 py-2 text-left font-medium">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((r) => (
                <tr key={r.student_id} className="border-b last:border-0">
                  <td className="px-3 py-2">{r.student_code}</td>
                  <td className="px-3 py-2">{r.full_name}</td>
                  <td className="px-3 py-2">{r.classroom ?? "-"}</td>
                  <td className="px-3 py-2">
                    <Select value={statuses[r.student_id] || "__none__"} onValueChange={(v) => setStatus(r.student_id, v === "__none__" ? "" : (v as AttendanceStatus))}>
                      <SelectTrigger className="h-8 w-36">
                        <SelectValue placeholder="ยังไม่เช็คชื่อ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">ยังไม่เช็คชื่อ</SelectItem>
                        {(Object.keys(statusLabel) as AttendanceStatus[]).map((status) => (
                          <SelectItem key={status} value={status}>
                            {statusLabel[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="h-24 text-center text-muted-foreground">
                  ไม่พบนักเรียน
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "กำลังบันทึก..." : "บันทึกการเช็คชื่อ"}
        </Button>
      </div>
    </div>
  );
}

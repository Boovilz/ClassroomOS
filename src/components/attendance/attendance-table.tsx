"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AttendanceTableRow } from "@/lib/queries/attendance";
import type { AttendanceStatus } from "@/lib/supabase/types";

const statusLabel: Record<string, string> = {
  present: "มาเรียน",
  late: "มาสาย",
  sick: "ลาป่วย",
  personal_leave: "ลากิจ",
  absent: "ขาดเรียน",
};

const statusVariant: Record<string, "secondary" | "destructive" | "outline" | "success"> = {
  present: "success",
  late: "outline",
  sick: "outline",
  personal_leave: "outline",
  absent: "destructive",
};

export function AttendanceTable({ data }: { data: AttendanceTableRow[] }) {
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<AttendanceTableRow | null>(null);
  const [editStatus, setEditStatus] = useState<AttendanceStatus>("present");
  const [editNote, setEditNote] = useState("");
  const router = useRouter();

  const filtered = useMemo(() => {
    if (!filter.trim()) return data;
    const q = filter.trim().toLowerCase();
    return data.filter((r) => r.full_name.toLowerCase().includes(q) || r.student_code.toLowerCase().includes(q));
  }, [data, filter]);

  function openEdit(row: AttendanceTableRow) {
    setEditing(row);
    setEditStatus(row.status);
    setEditNote(row.override_note ?? "");
  }

  async function saveEdit() {
    if (!editing) return;
    const res = await fetch("/api/attendance/override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing.id, status: editStatus, note: editNote }),
    });
    const data = await res.json();
    if (!data.success) {
      toast.error("บันทึกไม่สำเร็จ", { description: data.message });
      return;
    }
    toast.success("บันทึกการแก้ไขสำเร็จ");
    setEditing(null);
    router.refresh();
  }

  async function bulkUpdate(status: AttendanceStatus) {
    if (selected.size === 0) return;
    const res = await fetch("/api/attendance/override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), status }),
    });
    const data = await res.json();
    if (!data.success) {
      toast.error("แก้ไขไม่สำเร็จ", { description: data.message });
      return;
    }
    toast.success(data.message);
    setSelected(new Set());
    router.refresh();
  }

  async function handleDelete(row: AttendanceTableRow) {
    if (!window.confirm(`ยืนยันการลบรายการเช็คชื่อของ "${row.full_name}" วันที่ ${row.date}?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("attendance").delete().eq("id", row.id);
    if (error) {
      toast.error("ลบไม่สำเร็จ", { description: error.message });
      return;
    }
    toast.success("ลบรายการแล้ว");
    router.refresh();
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input placeholder="ค้นหาชื่อหรือรหัสนักเรียน..." value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs" />
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">เลือก {selected.size} รายการ</span>
            <Button size="sm" variant="outline" onClick={() => bulkUpdate("present")}>
              ทำเครื่องหมายว่ามาเรียน
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkUpdate("absent")}>
              ทำเครื่องหมายว่าขาดเรียน
            </Button>
          </div>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>รหัสนักเรียน</TableHead>
            <TableHead>ชื่อ-นามสกุล</TableHead>
            <TableHead>ห้องเรียน</TableHead>
            <TableHead>วันที่</TableHead>
            <TableHead>เวลาเช็คอิน</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead>วิธี</TableHead>
            <TableHead className="text-right">การจัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length > 0 ? (
            filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} />
                </TableCell>
                <TableCell>{r.student_code}</TableCell>
                <TableCell>{r.full_name}</TableCell>
                <TableCell>{r.classroom ?? "-"}</TableCell>
                <TableCell>{r.date}</TableCell>
                <TableCell>{r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString("th-TH") : "-"}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[r.status] ?? "outline"}>{statusLabel[r.status] ?? r.status}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.method}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(r)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(r)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                ไม่พบข้อมูลการเช็คชื่อ
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขการเช็คชื่อ (ครูตรวจสอบ)</DialogTitle>
            <DialogDescription>{editing?.full_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={editStatus} onValueChange={(v) => setEditStatus(v as AttendanceStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabel).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea placeholder="หมายเหตุการแก้ไข" value={editNote} onChange={(e) => setEditNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={saveEdit}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

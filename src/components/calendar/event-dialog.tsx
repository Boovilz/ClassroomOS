"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import {
  CalendarEvent, EventType, ALL_EVENT_TYPES, EVENT_TYPE_LABELS, EVENT_ICONS,
} from "./calendar-types";

interface Props {
  open: boolean;
  onClose: () => void;
  event?: CalendarEvent | null;
  defaultDate?: string;
  onSaved: (event: CalendarEvent) => void;
  onDeleted?: (id: string) => void;
}

export function EventDialog({ open, onClose, event, defaultDate, onSaved, onDeleted }: Props) {
  const isEdit = !!event;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<EventType>("activity");
  const [classroom, setClassroom] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      if (event) {
        setTitle(event.title);
        setDescription(event.description ?? "");
        setEventType(event.event_type);
        setClassroom(event.classroom ?? "");
        setStartsAt(event.starts_at.slice(0, 16));
        setEndsAt(event.ends_at ? event.ends_at.slice(0, 16) : "");
      } else {
        setTitle("");
        setDescription("");
        setEventType("activity");
        setClassroom("");
        setStartsAt(defaultDate ? `${defaultDate}T09:00` : "");
        setEndsAt(defaultDate ? `${defaultDate}T10:00` : "");
      }
    }
  }, [open, event, defaultDate]);

  const handleSave = async () => {
    if (!title.trim() || !startsAt || !eventType) return;
    setSaving(true);
    try {
      const payload = { title: title.trim(), description: description || null, event_type: eventType, classroom: classroom || null, starts_at: new Date(startsAt).toISOString(), ends_at: endsAt ? new Date(endsAt).toISOString() : null };
      const res = isEdit
        ? await fetch(`/api/calendar/${event!.id}`, { method: "PUT",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch("/api/calendar",               { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Save failed");
      const json = await res.json();
      onSaved(json.event);
      onClose();
    } catch {
      // error handled silently
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    setDeleting(true);
    await fetch(`/api/calendar/${event.id}`, { method: "DELETE" });
    onDeleted?.(event.id);
    setDeleting(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "แก้ไขกิจกรรม" : "สร้างกิจกรรมใหม่"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>ชื่อกิจกรรม <span className="text-destructive">*</span></Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="เช่น สอบปลายภาค วิชาคณิตศาสตร์" />
          </div>

          <div className="space-y-1.5">
            <Label>ประเภทกิจกรรม <span className="text-destructive">*</span></Label>
            <Select value={eventType} onValueChange={v => setEventType(v as EventType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_EVENT_TYPES.map(t => (
                  <SelectItem key={t} value={t}>
                    {EVENT_ICONS[t]} {EVENT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>เริ่ม <span className="text-destructive">*</span></Label>
              <Input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>สิ้นสุด</Label>
              <Input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>สถานที่ / ห้อง</Label>
            <Input value={classroom} onChange={e => setClassroom(e.target.value)} placeholder="เช่น ห้อง 301, โรงยิม" />
          </div>

          <div className="space-y-1.5">
            <Label>รายละเอียด</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="รายละเอียดเพิ่มเติม..." rows={3} />
          </div>
        </div>

        <DialogFooter className="flex-row items-center gap-2">
          {isEdit && (
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting} className="mr-auto">
              <Trash2 className="h-4 w-4 mr-1" />
              {deleting ? "กำลังลบ..." : "ลบ"}
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim() || !startsAt}>
            {saving ? "กำลังบันทึก..." : isEdit ? "บันทึก" : "สร้าง"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

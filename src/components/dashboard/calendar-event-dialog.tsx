"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CalendarEvent } from "@/lib/queries/dashboard";

const EVENT_TYPE_LABEL: Record<CalendarEvent["event_type"], string> = {
  exam: "สอบ",
  activity: "กิจกรรมโรงเรียน",
  parent_meeting: "ประชุมผู้ปกครอง",
  field_trip: "ทัศนศึกษา",
  holiday: "วันหยุด",
};

function toLocalInput(value: string) {
  return new Date(value).toISOString().slice(0, 16);
}

export function CalendarEventDialog({
  schoolId,
  event,
  trigger,
}: {
  schoolId: string;
  event?: CalendarEvent;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [eventType, setEventType] = useState<CalendarEvent["event_type"]>(event?.event_type ?? "activity");
  const [startsAt, setStartsAt] = useState(event ? toLocalInput(event.starts_at) : "");
  const [classroom, setClassroom] = useState(event?.classroom ?? "");

  async function handleSave() {
    if (!title.trim() || !startsAt) {
      toast.error("กรุณากรอกชื่อกิจกรรมและวันที่");
      return;
    }
    setIsSubmitting(true);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();

    const payload = {
      school_id: schoolId,
      created_by: auth.user?.id,
      title: title.trim(),
      description: description.trim() || null,
      event_type: eventType,
      classroom: classroom.trim() || null,
      starts_at: new Date(startsAt).toISOString(),
    };

    const { error } = event
      ? await supabase.from("calendar_events").update(payload).eq("id", event.id)
      : await supabase.from("calendar_events").insert(payload);

    setIsSubmitting(false);
    if (error) {
      toast.error("บันทึกไม่สำเร็จ", { description: error.message });
      return;
    }

    toast.success(event ? "แก้ไขกิจกรรมสำเร็จ" : "สร้างกิจกรรมสำเร็จ");
    setOpen(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!event) return;
    setIsSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from("calendar_events").delete().eq("id", event.id);
    setIsSubmitting(false);
    if (error) {
      toast.error("ลบไม่สำเร็จ", { description: error.message });
      return;
    }
    toast.success("ลบกิจกรรมสำเร็จ");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event ? "แก้ไขกิจกรรม" : "สร้างกิจกรรมใหม่"}</DialogTitle>
          <DialogDescription>กำหนดการสอบ กิจกรรมโรงเรียน ประชุมผู้ปกครอง ทัศนศึกษา หรือวันหยุด</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="ชื่อกิจกรรม" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Select value={eventType} onValueChange={(v) => setEventType(v as CalendarEvent["event_type"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(EVENT_TYPE_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          <Input placeholder="ห้องเรียน (ถ้ามี)" value={classroom} onChange={(e) => setClassroom(e.target.value)} />
          <Textarea placeholder="รายละเอียด" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <DialogFooter className="gap-2">
          {event && (
            <Button variant="outline" className="text-destructive" onClick={handleDelete} disabled={isSubmitting}>
              ลบกิจกรรม
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarPlus } from "lucide-react";

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  event_category: "parent_meeting" | "school_activity" | "event" | "workshop";
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  classroom: string | null;
}

const categoryLabel: Record<string, string> = {
  parent_meeting: "ประชุมผู้ปกครอง",
  school_activity: "กิจกรรมโรงเรียน",
  event: "งานกิจกรรม",
  workshop: "เวิร์กชอป",
};

export function EventsPanel({ schoolId, events }: { schoolId: string; events: EventRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<EventRow["event_category"]>("school_activity");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");

  async function handleCreate() {
    if (!title.trim() || !startsAt) {
      toast.error("กรุณากรอกชื่อกิจกรรมและวันเวลา");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, title, description, eventCategory: category, location, startsAt: new Date(startsAt).toISOString() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast.success("สร้างกิจกรรมสำเร็จ");
      setOpen(false);
      setTitle("");
      setDescription("");
      setLocation("");
      setStartsAt("");
      router.refresh();
    } catch (err) {
      toast.error("สร้างกิจกรรมไม่สำเร็จ", { description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">ปฏิทินกิจกรรม / ประชุมผู้ปกครอง</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <CalendarPlus className="h-4 w-4" />
              สร้างกิจกรรม
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>สร้างกิจกรรม / ประชุมผู้ปกครองใหม่</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="ชื่อกิจกรรม" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea placeholder="รายละเอียด" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              <Select value={category} onValueChange={(v) => setCategory(v as EventRow["event_category"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabel).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder="สถานที่" value={location} onChange={(e) => setLocation(e.target.value)} />
              <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? "กำลังสร้าง..." : "สร้างกิจกรรม"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {events.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">ยังไม่มีกิจกรรม</CardContent>
          </Card>
        ) : (
          events.map((ev) => (
            <Card key={ev.id} className="glass-card">
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                <div>
                  <CardTitle className="text-base">{ev.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {new Date(ev.starts_at).toLocaleString("th-TH")} {ev.location ? `· ${ev.location}` : ""}
                  </p>
                </div>
                <Badge variant="secondary">{categoryLabel[ev.event_category]}</Badge>
              </CardHeader>
              {ev.description && (
                <CardContent>
                  <p className="text-sm">{ev.description}</p>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

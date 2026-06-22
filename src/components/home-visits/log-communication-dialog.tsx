"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { MessageSquarePlus } from "lucide-react";

const typeLabel: Record<string, string> = {
  meeting: "ประชุม",
  phone_call: "โทรศัพท์",
  line_message: "LINE",
  home_visit_discussion: "พูดคุยขณะเยี่ยมบ้าน",
  agreement: "ข้อตกลง",
};

export function LogCommunicationDialog({ schoolId, studentId }: { schoolId: string; studentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [communicationType, setCommunicationType] = useState("phone_call");
  const [summary, setSummary] = useState("");
  const [agreements, setAgreements] = useState("");
  const [followUpAction, setFollowUpAction] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  async function handleSubmit() {
    if (!summary.trim()) {
      toast.error("กรุณาระบุสรุปการสื่อสาร");
      return;
    }
    setIsSubmitting(true);
    const res = await fetch("/api/communications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schoolId,
        studentId,
        communicationType,
        summary: summary.trim(),
        agreements: agreements.trim() || undefined,
        followUpAction: followUpAction.trim() || undefined,
        followUpDate: followUpDate || undefined,
      }),
    });
    const json = await res.json();
    setIsSubmitting(false);
    if (!json.success) {
      toast.error("บันทึกไม่สำเร็จ", { description: json.message });
      return;
    }
    toast.success("บันทึกการสื่อสารสำเร็จ");
    setOpen(false);
    setSummary("");
    setAgreements("");
    setFollowUpAction("");
    setFollowUpDate("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MessageSquarePlus className="h-4 w-4" />
          บันทึกการสื่อสาร
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>บันทึกการสื่อสารกับผู้ปกครอง</DialogTitle>
          <DialogDescription>เช่น การประชุม การโทรศัพท์ ข้อตกลง การติดตามผล</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={communicationType} onValueChange={setCommunicationType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(typeLabel).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea placeholder="สรุปการสื่อสาร" value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} />
          <Textarea placeholder="ข้อตกลง (ถ้ามี)" value={agreements} onChange={(e) => setAgreements(e.target.value)} rows={2} />
          <Input placeholder="การติดตามต่อ" value={followUpAction} onChange={(e) => setFollowUpAction(e.target.value)} />
          <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

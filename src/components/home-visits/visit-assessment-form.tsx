"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface VisitAssessmentFormProps {
  visitId: string;
  initial: {
    status: string;
    outcome: string | null;
    duration_minutes: number | null;
    follow_up_required: boolean;
    latitude: number | null;
    longitude: number | null;
    economic_status: string | null;
    educational_support: string | null;
    family_support: string | null;
    health_status_note: string | null;
    behavior_concerns: string | null;
    attendance_concerns: string | null;
    academic_concerns: string | null;
  };
}

export function VisitAssessmentForm({ visitId, initial }: VisitAssessmentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(initial.status);
  const [outcome, setOutcome] = useState(initial.outcome ?? "");
  const [duration, setDuration] = useState(initial.duration_minutes?.toString() ?? "");
  const [followUp, setFollowUp] = useState(initial.follow_up_required);
  const [latitude, setLatitude] = useState(initial.latitude?.toString() ?? "");
  const [longitude, setLongitude] = useState(initial.longitude?.toString() ?? "");
  const [economicStatus, setEconomicStatus] = useState(initial.economic_status ?? "");
  const [educationalSupport, setEducationalSupport] = useState(initial.educational_support ?? "");
  const [familySupport, setFamilySupport] = useState(initial.family_support ?? "");
  const [healthStatusNote, setHealthStatusNote] = useState(initial.health_status_note ?? "");
  const [behaviorConcerns, setBehaviorConcerns] = useState(initial.behavior_concerns ?? "");
  const [attendanceConcerns, setAttendanceConcerns] = useState(initial.attendance_concerns ?? "");
  const [academicConcerns, setAcademicConcerns] = useState(initial.academic_concerns ?? "");

  async function handleSave() {
    setIsSubmitting(true);
    const res = await fetch(`/api/home-visits/${visitId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        outcome: outcome.trim() || null,
        duration_minutes: duration ? Number(duration) : null,
        follow_up_required: followUp,
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
        economic_status: economicStatus.trim() || null,
        educational_support: educationalSupport.trim() || null,
        family_support: familySupport.trim() || null,
        health_status_note: healthStatusNote.trim() || null,
        behavior_concerns: behaviorConcerns.trim() || null,
        attendance_concerns: attendanceConcerns.trim() || null,
        academic_concerns: academicConcerns.trim() || null,
      }),
    });
    const json = await res.json();
    setIsSubmitting(false);
    if (!json.success) {
      toast.error("บันทึกไม่สำเร็จ", { description: json.message });
      return;
    }
    toast.success("บันทึกข้อมูลการเยี่ยมบ้านสำเร็จ");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>สถานะการเยี่ยม</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">นัดหมายแล้ว</SelectItem>
              <SelectItem value="completed">เยี่ยมแล้ว</SelectItem>
              <SelectItem value="cancelled">ยกเลิก</SelectItem>
              <SelectItem value="rescheduled">เลื่อนนัด</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>ระยะเวลา (นาที)</Label>
          <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
        <div className="flex items-end pb-1.5">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-input" checked={followUp} onChange={(e) => setFollowUp(e.target.checked)} />
            ต้องติดตามต่อ
          </label>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>ผลการเยี่ยมบ้าน</Label>
        <Textarea value={outcome} onChange={(e) => setOutcome(e.target.value)} rows={2} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>ละติจูด (Latitude)</Label>
          <Input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="13.7563" />
        </div>
        <div className="space-y-1.5">
          <Label>ลองจิจูด (Longitude)</Label>
          <Input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="100.5018" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>สถานะเศรษฐกิจ</Label>
          <Textarea value={economicStatus} onChange={(e) => setEconomicStatus(e.target.value)} rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label>การสนับสนุนด้านการศึกษา</Label>
          <Textarea value={educationalSupport} onChange={(e) => setEducationalSupport(e.target.value)} rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label>การสนับสนุนจากครอบครัว</Label>
          <Textarea value={familySupport} onChange={(e) => setFamilySupport(e.target.value)} rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label>ข้อสังเกตด้านสุขภาพ</Label>
          <Textarea value={healthStatusNote} onChange={(e) => setHealthStatusNote(e.target.value)} rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label>ข้อสังเกตด้านพฤติกรรม</Label>
          <Textarea value={behaviorConcerns} onChange={(e) => setBehaviorConcerns(e.target.value)} rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label>ข้อสังเกตด้านการมาเรียน</Label>
          <Textarea value={attendanceConcerns} onChange={(e) => setAttendanceConcerns(e.target.value)} rows={2} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>ข้อสังเกตด้านผลการเรียน</Label>
          <Textarea value={academicConcerns} onChange={(e) => setAcademicConcerns(e.target.value)} rows={2} />
        </div>
      </div>

      <Button onClick={handleSave} disabled={isSubmitting}>
        {isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูลการประเมิน"}
      </Button>
    </div>
  );
}

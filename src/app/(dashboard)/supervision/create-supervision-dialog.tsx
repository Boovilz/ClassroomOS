"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  schoolId: string;
  supervisorId: string;
}

const scoreOptions = [1, 2, 3, 4, 5];

export function CreateSupervisionDialog({ schoolId, supervisorId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [teacherName, setTeacherName] = useState("");
  const [supervisedAt, setSupervisedAt] = useState("");
  const [subject, setSubject] = useState("");
  const [classroom, setClassroom] = useState("");
  const [topic, setTopic] = useState("");
  const [studentCount, setStudentCount] = useState("");
  const [lessonPlanScore, setLessonPlanScore] = useState("");
  const [teachingMethodScore, setTeachingMethodScore] = useState("");
  const [mediaScore, setMediaScore] = useState("");
  const [assessmentScore, setAssessmentScore] = useState("");
  const [classroomManagementScore, setClassroomManagementScore] = useState("");
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  function resetForm() {
    setTeacherName("");
    setSupervisedAt("");
    setSubject("");
    setClassroom("");
    setTopic("");
    setStudentCount("");
    setLessonPlanScore("");
    setTeachingMethodScore("");
    setMediaScore("");
    setAssessmentScore("");
    setClassroomManagementScore("");
    setStrengths("");
    setImprovements("");
    setSuggestions("");
    setFollowUpDate("");
  }

  async function handleSubmit() {
    if (!supervisedAt) {
      toast.error("กรุณาเลือกวันที่นิเทศ");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/supervision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_id: schoolId,
          supervisor_id: supervisorId,
          // teacher_name is stored as free text; teacher_id would be a UUID from a teacher picker
          teacher_name: teacherName.trim() || undefined,
          supervised_at: supervisedAt,
          subject: subject.trim() || undefined,
          classroom: classroom.trim() || undefined,
          topic: topic.trim() || undefined,
          student_count: studentCount ? parseInt(studentCount, 10) : undefined,
          lesson_plan_score: lessonPlanScore ? parseInt(lessonPlanScore, 10) : undefined,
          teaching_method_score: teachingMethodScore ? parseInt(teachingMethodScore, 10) : undefined,
          media_score: mediaScore ? parseInt(mediaScore, 10) : undefined,
          assessment_score: assessmentScore ? parseInt(assessmentScore, 10) : undefined,
          classroom_management_score: classroomManagementScore
            ? parseInt(classroomManagementScore, 10)
            : undefined,
          strengths: strengths.trim() || undefined,
          improvements: improvements.trim() || undefined,
          suggestions: suggestions.trim() || undefined,
          follow_up_date: followUpDate || undefined,
          status: "draft",
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.message ?? "บันทึกไม่สำเร็จ");
      toast.success("บันทึกการนิเทศสำเร็จ");
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      toast.error("บันทึกการนิเทศไม่สำเร็จ", { description: (err as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          บันทึกการนิเทศใหม่
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>บันทึกการนิเทศการสอน</DialogTitle>
          <DialogDescription>กรอกข้อมูลการนิเทศการสอนของครู</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Basic info */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>ครูผู้สอน</Label>
              <Input
                placeholder="ชื่อครูผู้สอน"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                วันที่นิเทศ <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={supervisedAt}
                onChange={(e) => setSupervisedAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>วิชาที่สอน</Label>
              <Input
                placeholder="เช่น คณิตศาสตร์"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>ระดับชั้น/ห้อง</Label>
              <Input
                placeholder="เช่น ม.2/1"
                value={classroom}
                onChange={(e) => setClassroom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>หัวข้อที่สอน</Label>
              <Input
                placeholder="หัวข้อหรือเนื้อหาที่สอน"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>จำนวนนักเรียน</Label>
              <Input
                type="number"
                min={0}
                placeholder="จำนวน"
                value={studentCount}
                onChange={(e) => setStudentCount(e.target.value)}
              />
            </div>
          </div>

          {/* Scores */}
          <div>
            <p className="mb-3 text-sm font-semibold">การประเมิน (1 = น้อยที่สุด, 5 = ดีเยี่ยม)</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(
                [
                  { label: "แผนการสอน", value: lessonPlanScore, setter: setLessonPlanScore },
                  {
                    label: "วิธีการสอน",
                    value: teachingMethodScore,
                    setter: setTeachingMethodScore,
                  },
                  { label: "สื่อการสอน", value: mediaScore, setter: setMediaScore },
                  { label: "การวัดประเมินผล", value: assessmentScore, setter: setAssessmentScore },
                  {
                    label: "การบริหารจัดการชั้นเรียน",
                    value: classroomManagementScore,
                    setter: setClassroomManagementScore,
                  },
                ] as { label: string; value: string; setter: (v: string) => void }[]
              ).map(({ label, value, setter }) => (
                <div key={label} className="space-y-1.5">
                  <Label>{label}</Label>
                  <Select value={value} onValueChange={setter}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกคะแนน" />
                    </SelectTrigger>
                    <SelectContent>
                      {scoreOptions.map((s) => (
                        <SelectItem key={s} value={String(s)}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* Text fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>จุดเด่น / ข้อดี</Label>
              <Textarea
                placeholder="บันทึกจุดเด่นของการสอน"
                rows={3}
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>จุดที่ควรปรับปรุง</Label>
              <Textarea
                placeholder="บันทึกจุดที่ควรปรับปรุง"
                rows={3}
                value={improvements}
                onChange={(e) => setImprovements(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>ข้อเสนอแนะ</Label>
              <Textarea
                placeholder="ข้อเสนอแนะเพิ่มเติม"
                rows={3}
                value={suggestions}
                onChange={(e) => setSuggestions(e.target.value)}
              />
            </div>
          </div>

          {/* Follow-up */}
          <div className="space-y-1.5">
            <Label>วันนิเทศติดตาม</Label>
            <Input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            ยกเลิก
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

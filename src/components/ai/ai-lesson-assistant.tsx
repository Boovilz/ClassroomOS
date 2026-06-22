"use client";

import { useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ACTIVITY_OPTIONS = [
  { value: "lesson_plan", label: "แผนการสอน" },
  { value: "worksheet", label: "ใบงาน" },
  { value: "rubric", label: "เกณฑ์การประเมิน (รูบริก)" },
  { value: "quiz", label: "แบบทดสอบ" },
  { value: "project", label: "โครงงาน" },
  { value: "coding_activity", label: "กิจกรรมการเขียนโค้ด" },
  { value: "stem_activity", label: "กิจกรรม STEM" },
  { value: "active_learning", label: "กิจกรรม Active Learning" },
];

export function AiLessonAssistant() {
  const [gradeLevel, setGradeLevel] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [activityType, setActivityType] = useState("lesson_plan");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  async function handleGenerate() {
    if (!gradeLevel || !subject || !topic) return;
    setLoading(true);
    setOutput(null);
    try {
      const res = await fetch("/api/ai/generate/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gradeLevel, subject, topic, activityType }),
      });
      const data = await res.json();
      if (data.success) {
        setOutput(data.result.text);
        setNotConfigured(!!data.result.notConfigured);
      } else {
        setOutput(data.message ?? "เกิดข้อผิดพลาด");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ผู้ช่วยออกแบบการสอน (AI Lesson Assistant)</CardTitle>
          <CardDescription>สร้างแผนการสอน ใบงาน รูบริก แบบทดสอบ และกิจกรรมการเรียนรู้ด้วย Claude</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>ระดับชั้น</Label>
            <Input value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} placeholder="เช่น ป.5, ม.2" />
          </div>
          <div>
            <Label>วิชา</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="เช่น วิทยาศาสตร์, คณิตศาสตร์" />
          </div>
          <div>
            <Label>หัวข้อ/มาตรฐานการเรียนรู้</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="เช่น วงจรไฟฟ้าเบื้องต้น" />
          </div>
          <div>
            <Label>ประเภทผลลัพธ์</Label>
            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={loading || !gradeLevel || !subject || !topic} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
            สร้างด้วย AI
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ผลลัพธ์</CardTitle>
          <CardDescription>คัดลอกหรือพิมพ์เพื่อนำไปใช้สอนได้ทันที</CardDescription>
        </CardHeader>
        <CardContent>
          {notConfigured && <p className="text-sm text-amber-600 mb-2">AI ยังไม่พร้อมใช้งาน - โปรดตั้งค่า ANTHROPIC_API_KEY</p>}
          <pre className="whitespace-pre-wrap text-sm font-sans rounded-lg border border-border/60 p-3 min-h-[200px] max-h-[420px] overflow-y-auto">
            {output ?? "ผลลัพธ์จะแสดงที่นี่หลังจากกดสร้างด้วย AI"}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

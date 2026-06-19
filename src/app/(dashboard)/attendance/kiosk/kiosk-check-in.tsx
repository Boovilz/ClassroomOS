"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QrScanner } from "@/components/attendance/qr-scanner";

export function KioskCheckIn() {
  const [studentCode, setStudentCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCheckedIn, setLastCheckedIn] = useState<string | null>(null);

  async function handleCheckIn() {
    if (!studentCode.trim()) return;
    setIsSubmitting(true);
    const supabase = createClient();

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, school_id, full_name")
      .eq("student_code", studentCode.trim())
      .single();

    if (studentError || !student) {
      toast.error("ไม่พบรหัสนักเรียนนี้");
      setIsSubmitting(false);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();

    const { error: attendanceError } = await supabase.from("attendance").upsert(
      {
        school_id: student.school_id,
        student_id: student.id,
        date: today,
        status: "present",
        check_in_time: now,
      },
      { onConflict: "student_id,date" }
    );

    if (attendanceError) {
      toast.error("เช็คชื่อไม่สำเร็จ", { description: attendanceError.message });
      setIsSubmitting(false);
      return;
    }

    await supabase.from("attendance_logs").insert({
      school_id: student.school_id,
      student_id: student.id,
      source: "qr_kiosk",
      scanned_at: now,
    });

    setLastCheckedIn(student.full_name);
    setStudentCode("");
    toast.success(`เช็คชื่อสำเร็จ: ${student.full_name}`);
    setIsSubmitting(false);
  }

  return (
    <Card className="glass-card mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>เช็คชื่อด้วยตนเอง</CardTitle>
        <CardDescription>สแกน QR ของคุณ หรือกรอกรหัสนักเรียนแล้วกดเช็คชื่อ</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <QrScanner mode="morning_assembly" />
        <Input
          placeholder="รหัสนักเรียน"
          value={studentCode}
          onChange={(e) => setStudentCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCheckIn()}
          className="text-center text-lg"
          autoFocus
        />
        <Button onClick={handleCheckIn} disabled={isSubmitting} className="w-full">
          {isSubmitting ? "กำลังเช็คชื่อ..." : "เช็คชื่อ"}
        </Button>
        {lastCheckedIn && (
          <p className="text-center text-sm text-secondary">เช็คชื่อล่าสุด: {lastCheckedIn}</p>
        )}
      </CardContent>
    </Card>
  );
}

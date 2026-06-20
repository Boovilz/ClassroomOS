"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckinSuccessScreen, type CheckinResultDisplay } from "@/components/attendance/checkin-success-screen";
import { Camera, Hash, Users } from "lucide-react";

const SCANNER_ELEMENT_ID = "lunch-qr-scanner-viewport";

interface StudentLite {
  id: string;
  full_name: string;
  student_code: string;
  avatar_url: string | null;
}

/**
 * QR Food Distribution scanner — mirrors the attendance QR scanner
 * (src/components/attendance/qr-scanner.tsx) using the same html5-qrcode
 * library and confirmation overlay, with manual student-ID and dropdown
 * fallback selection per the module spec.
 */
export function MealDistributionScanner({ schoolId, students }: { schoolId: string; students: StudentLite[] }) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [activeResult, setActiveResult] = useState<CheckinResultDisplay | null>(null);
  const [todayCount, setTodayCount] = useState(0);

  const submit = useCallback(
    async (body: { token?: string; studentId?: string; distributionMethod: "qr" | "student_id" | "manual" }) => {
      try {
        const res = await fetch("/api/lunch/distribute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schoolId, ...body }),
        });
        const data = await res.json();
        setActiveResult({
          success: data.success,
          message: data.message,
          studentName: data.student?.full_name,
          studentCode: data.student?.student_code,
          avatarUrl: data.student?.avatar_url,
        });
        if (data.success) setTodayCount((c) => c + 1);
        if (data.allergyWarnings?.length > 0) {
          for (const w of data.allergyWarnings) {
            toast.warning(`แพ้/ข้อจำกัด: ${w.allergen} (ระดับ ${w.severity})`);
          }
        }
      } catch {
        toast.error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
      }
    },
    [schoolId]
  );

  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => setCameras(devices.map((d) => ({ id: d.id, label: d.label || "กล้อง" }))))
      .catch(() => setCameras([]));
    return () => {
      scannerRef.current?.stop().catch(() => undefined);
    };
  }, []);

  const startScanning = useCallback(async () => {
    if (cameras.length === 0) return;
    const scanner = scannerRef.current ?? new Html5Qrcode(SCANNER_ELEMENT_ID);
    scannerRef.current = scanner;
    try {
      await scanner.start(
        cameras[0].id,
        { fps: 10, qrbox: 240 },
        (decodedText) => submit({ token: decodedText, distributionMethod: "qr" }),
        undefined
      );
      setIsRunning(true);
    } catch {
      toast.error("ไม่สามารถเปิดกล้องได้ กรุณาใช้การกรอกรหัสด้วยตนเอง");
    }
  }, [cameras, submit]);

  async function stopScanning() {
    try {
      await scannerRef.current?.stop();
    } catch {
      // already stopped
    }
    setIsRunning(false);
  }

  function handleManualSubmit() {
    if (!manualCode.trim()) return;
    submit({ studentId: manualCode.trim(), distributionMethod: "student_id" });
    setManualCode("");
  }

  function handleManualSelect() {
    if (!selectedStudentId) return;
    submit({ studentId: selectedStudentId, distributionMethod: "manual" });
    setSelectedStudentId("");
  }

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">แจกอาหารวันนี้แล้ว {todayCount} คน</CardTitle>
        </CardHeader>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>สแกน QR แจกอาหาร</CardTitle>
          <CardDescription>เปิดกล้องเพื่อสแกน QR ของนักเรียน ระบบจะตรวจสิทธิ์และแจ้งเตือนการแพ้อาหารโดยอัตโนมัติ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div id={SCANNER_ELEMENT_ID} className="aspect-video w-full overflow-hidden rounded-xl bg-black/80" />
          <div className="flex flex-wrap gap-2">
            {!isRunning ? (
              <Button onClick={startScanning} disabled={cameras.length === 0}>
                <Camera className="mr-2 h-4 w-4" /> เปิดกล้อง
              </Button>
            ) : (
              <Button variant="outline" onClick={stopScanning}>
                ปิดกล้อง
              </Button>
            )}
          </div>
          {cameras.length === 0 && <p className="text-xs text-muted-foreground">ไม่พบกล้อง — กรุณาใช้รหัสนักเรียนหรือเลือกจากรายชื่อด้านล่าง</p>}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Hash className="h-4 w-4" /> กรอกรหัสนักเรียน
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input placeholder="รหัสนักเรียน" value={manualCode} onChange={(e) => setManualCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()} />
          <Button onClick={handleManualSubmit}>ส่ง</Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> เลือกนักเรียนด้วยตนเอง
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกนักเรียน" />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.student_code} - {s.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleManualSelect}>บันทึก</Button>
        </CardContent>
      </Card>

      {activeResult && <CheckinSuccessScreen result={activeResult} onDismiss={() => setActiveResult(null)} autoDismissMs={2500} />}
    </div>
  );
}

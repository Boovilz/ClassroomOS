"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckinSuccessScreen, type CheckinResultDisplay } from "@/components/attendance/checkin-success-screen";
import { Camera, FlashlightOff, Flashlight, RotateCcw } from "lucide-react";
import type { AttendanceMode } from "@/lib/supabase/types";

const SCANNER_ELEMENT_ID = "qr-scanner-viewport";
const QUEUE_KEY = "attendance_offline_scan_queue";

interface QueuedScan {
  token: string;
  mode: AttendanceMode;
  scannedAt: string;
}

function readQueue(): QueuedScan[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedScan[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Live camera QR scanner using html5-qrcode. Falls back to a manual code
 * entry input when the camera is unavailable/denied. Queues scans in
 * localStorage when offline and flushes them on `online` events — a simple
 * alternative to a full service-worker PWA per the module's reduced scope.
 */
export function QrScanner({ mode = "classroom" }: { mode?: AttendanceMode }) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [cameraIndex, setCameraIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [scanHistory, setScanHistory] = useState<{ token: string; at: string; ok: boolean }[]>([]);
  const [activeResult, setActiveResult] = useState<CheckinResultDisplay | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [queueSize, setQueueSize] = useState(0);

  const submitToken = useCallback(async (token: string) => {
    if (!navigator.onLine) {
      const queue = readQueue();
      queue.push({ token, mode, scannedAt: new Date().toISOString() });
      writeQueue(queue);
      setQueueSize(queue.length);
      toast.info("ออฟไลน์: บันทึกการสแกนไว้รอซิงค์");
      setScanHistory((h) => [{ token, at: new Date().toISOString(), ok: false }, ...h].slice(0, 20));
      return;
    }

    try {
      const res = await fetch("/api/attendance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, mode, deviceInfo: navigator.userAgent }),
      });
      const data = await res.json();
      setActiveResult({
        success: data.success,
        message: data.message,
        studentName: data.student?.full_name,
        studentCode: data.student?.student_code,
        avatarUrl: data.student?.avatar_url,
        status: data.status,
        checkInTime: data.checkInTime,
      });
      setScanHistory((h) => [{ token, at: new Date().toISOString(), ok: data.success }, ...h].slice(0, 20));
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  }, [mode]);

  const flushQueue = useCallback(async () => {
    const queue = readQueue();
    if (queue.length === 0) return;
    toast.info(`กำลังซิงค์ ${queue.length} รายการที่ค้างไว้...`);
    const remaining: QueuedScan[] = [];
    for (const item of queue) {
      try {
        const res = await fetch("/api/attendance/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: item.token, mode: item.mode, deviceInfo: "offline-sync" }),
        });
        if (!res.ok) remaining.push(item);
      } catch {
        remaining.push(item);
      }
    }
    writeQueue(remaining);
    setQueueSize(remaining.length);
    if (remaining.length === 0) toast.success("ซิงค์ข้อมูลออฟไลน์สำเร็จ");
  }, []);

  useEffect(() => {
    setQueueSize(readQueue().length);
    setIsOnline(navigator.onLine);

    function handleOnline() {
      setIsOnline(true);
      flushQueue();
    }
    function handleOffline() {
      setIsOnline(false);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [flushQueue]);

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
    const camera = cameras[cameraIndex % cameras.length];
    const scanner = scannerRef.current ?? new Html5Qrcode(SCANNER_ELEMENT_ID);
    scannerRef.current = scanner;

    try {
      await scanner.start(
        camera.id,
        { fps: 10, qrbox: 240 },
        (decodedText) => {
          submitToken(decodedText);
        },
        undefined
      );
      setIsRunning(true);
    } catch {
      toast.error("ไม่สามารถเปิดกล้องได้ กรุณาใช้การกรอกรหัสด้วยตนเอง");
    }
  }, [cameras, cameraIndex, submitToken]);

  async function stopScanning() {
    try {
      await scannerRef.current?.stop();
    } catch {
      // already stopped
    }
    setIsRunning(false);
  }

  async function switchCamera() {
    await stopScanning();
    setCameraIndex((i) => (i + 1) % Math.max(cameras.length, 1));
    setTimeout(startScanning, 200);
  }

  async function toggleTorch() {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      await scanner.applyVideoConstraints({
        advanced: [{ torch: !torchOn } as unknown as MediaTrackConstraintSet],
      });
      setTorchOn((t) => !t);
    } catch {
      toast.error("อุปกรณ์นี้ไม่รองรับไฟฉาย");
    }
  }

  function handleManualSubmit() {
    if (!manualCode.trim()) return;
    submitToken(manualCode.trim());
    setManualCode("");
  }

  return (
    <div className="space-y-4">
      {!isOnline && (
        <div className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800">
          ออฟไลน์ — การสแกนจะถูกบันทึกไว้และซิงค์อัตโนมัติเมื่อเชื่อมต่ออินเทอร์เน็ตอีกครั้ง
          {queueSize > 0 ? ` (รอซิงค์ ${queueSize} รายการ)` : ""}
        </div>
      )}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>สแกน QR เช็คชื่อ</CardTitle>
          <CardDescription>เปิดกล้องเพื่อสแกน QR ของนักเรียน หรือกรอกโค้ดด้วยตนเอง</CardDescription>
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
            {cameras.length > 1 && (
              <Button variant="outline" onClick={switchCamera} disabled={!isRunning}>
                <RotateCcw className="mr-2 h-4 w-4" /> สลับกล้อง
              </Button>
            )}
            <Button variant="outline" onClick={toggleTorch} disabled={!isRunning}>
              {torchOn ? <Flashlight className="mr-2 h-4 w-4" /> : <FlashlightOff className="mr-2 h-4 w-4" />}
              ไฟฉาย
            </Button>
          </div>

          {cameras.length === 0 && (
            <p className="text-xs text-muted-foreground">ไม่พบกล้อง หรือไม่ได้รับอนุญาตให้ใช้กล้อง — กรุณากรอกโค้ด QR ด้วยตนเองด้านล่าง</p>
          )}

          <div className="flex gap-2">
            <Input
              placeholder="กรอกโค้ด QR ด้วยตนเอง"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
            />
            <Button onClick={handleManualSubmit}>ส่ง</Button>
          </div>
        </CardContent>
      </Card>

      {scanHistory.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">ประวัติการสแกนล่าสุด</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {scanHistory.map((h, i) => (
                <li key={i} className="flex justify-between">
                  <span className={h.ok ? "text-emerald-green" : "text-destructive"}>{h.ok ? "สำเร็จ" : "ไม่สำเร็จ/รอซิงค์"}</span>
                  <span className="text-muted-foreground">{new Date(h.at).toLocaleTimeString("th-TH")}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {activeResult && <CheckinSuccessScreen result={activeResult} onDismiss={() => setActiveResult(null)} />}
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckinResultDisplay {
  success: boolean;
  message: string;
  studentName?: string;
  studentCode?: string;
  avatarUrl?: string | null;
  status?: string;
  checkInTime?: string;
}

const statusLabel: Record<string, string> = {
  present: "มาเรียน",
  late: "มาสาย",
};

/** Generates a short, pleasant two-tone beep with the Web Audio API — no audio asset needed. */
function playBeep(success: boolean) {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = success ? 880 : 220;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
    if (success) {
      const osc2 = ctx.createOscillator();
      osc2.connect(gain);
      osc2.type = "sine";
      osc2.frequency.value = 1320;
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.45);
    }
  } catch {
    // Web Audio not available — silently skip the sound.
  }
}

/**
 * Full-screen success/failure overlay shown after a kiosk/scanner check-in.
 * Auto-dismisses after `autoDismissMs` so the kiosk returns to scanning.
 */
export function CheckinSuccessScreen({
  result,
  onDismiss,
  autoDismissMs = 3000,
}: {
  result: CheckinResultDisplay;
  onDismiss: () => void;
  autoDismissMs?: number;
}) {
  useEffect(() => {
    playBeep(result.success);
    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 p-8 text-center transition-colors",
        result.success ? "bg-emerald-green/95 text-white" : "bg-destructive/95 text-white"
      )}
      onClick={onDismiss}
    >
      {result.success ? <CheckCircle2 className="h-24 w-24" /> : <XCircle className="h-24 w-24" />}

      {result.avatarUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={result.avatarUrl} alt={result.studentName ?? ""} className="h-24 w-24 rounded-full border-4 border-white object-cover" />
      )}

      <h2 className="text-3xl font-bold">{result.success ? "ยินดีต้อนรับ" : "เกิดข้อผิดพลาด"}</h2>

      {result.studentName && (
        <p className="text-xl">
          {result.studentName} {result.studentCode ? `(${result.studentCode})` : ""}
        </p>
      )}

      <p className="text-lg">
        {result.success ? "มาเรียนเรียบร้อยแล้ว" : result.message}
        {result.status ? ` · ${statusLabel[result.status] ?? result.status}` : ""}
      </p>

      {result.checkInTime && (
        <p className="text-sm opacity-80">เวลา {new Date(result.checkInTime).toLocaleTimeString("th-TH")}</p>
      )}

      <p className="mt-4 text-xs opacity-70">แตะที่หน้าจอเพื่อปิด</p>
    </div>
  );
}

"use client";

import { Camera } from "lucide-react";

/**
 * QR / barcode camera scanner — PLACEHOLDER ONLY.
 *
 * TODO: This component does NOT access the camera or decode QR codes.
 * To make this functional, wire up `@zxing/browser` (or a similar library):
 *   1. `npm install @zxing/browser @zxing/library`
 *   2. Use `BrowserQRCodeReader` (or `BrowserMultiFormatReader`) to request
 *      camera access via `navigator.mediaDevices.getUserMedia` and decode
 *      frames from a <video> element.
 *   3. On successful decode, look up the scanned student_code / qr_tokens
 *      row (see `qr_tokens` table) and call the same attendance check-in
 *      logic used in `kiosk-check-in.tsx`.
 *
 * This placeholder intentionally renders a static, clearly-labeled UI so
 * nobody mistakes it for a working scanner.
 */
export function CameraPlaceholder() {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border/60 bg-muted/40 p-6 text-center">
      <Camera className="h-10 w-10 text-muted-foreground" />
      <p className="text-sm font-medium text-muted-foreground">
        ส่วนกล้องสแกน QR ยังไม่เปิดใช้งาน (Placeholder)
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">
        TODO: เชื่อมต่อไลบรารี @zxing/browser เพื่อเปิดกล้องและอ่านค่า QR Code จริง
        ขณะนี้กรุณาใช้การกรอกรหัสนักเรียนด้านล่างแทน
      </p>
    </div>
  );
}

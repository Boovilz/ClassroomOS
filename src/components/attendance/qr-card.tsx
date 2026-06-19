"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

export interface QrCardData {
  studentId: string;
  fullName: string;
  studentCode: string;
  classroom: string | null;
  avatarUrl: string | null;
  qrValue: string;
}

/**
 * A single printable QR identification card: photo + name + student code +
 * classroom + a freshly rendered QR image. Designed to sit in a print-grid
 * (see src/app/(dashboard)/attendance/qr/page.tsx) — `print:` utility
 * classes keep spacing/borders sane when sent to a printer.
 */
export function QrCard({ data }: { data: QrCardData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(data.qrValue, { width: 220, margin: 1 }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [data.qrValue]);

  function handleDownloadPng() {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `qr-${data.studentCode}.png`;
    link.click();
  }

  return (
    <div className="glass-card flex flex-col items-center gap-2 rounded-2xl border border-border/60 p-4 text-center print:break-inside-avoid print:border-black/30">
      <canvas ref={canvasRef} className="hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={data.avatarUrl ?? "/avatar-placeholder.png"}
        alt={data.fullName}
        className="h-16 w-16 rounded-full border border-border/60 object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).style.visibility = "hidden";
        }}
      />
      <p className="text-sm font-semibold">{data.fullName}</p>
      <p className="text-xs text-muted-foreground">
        {data.studentCode} {data.classroom ? `· ${data.classroom}` : ""}
      </p>
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt={`QR ${data.studentCode}`} className="h-40 w-40" />
      ) : (
        <div className="h-40 w-40 animate-pulse rounded bg-muted" />
      )}
      <button
        type="button"
        onClick={handleDownloadPng}
        className="text-xs text-primary underline-offset-2 hover:underline print:hidden"
      >
        ดาวน์โหลด PNG
      </button>
    </div>
  );
}

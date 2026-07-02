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
  schoolName?: string;
  academicYear?: string;
}

export function QrCard({ data }: { data: QrCardData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(data.qrValue, { width: 200, margin: 1 }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => { cancelled = true; };
  }, [data.qrValue]);

  function handleDownloadPng() {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `qr-${data.studentCode}.png`;
    link.click();
  }

  return (
    <div className="flex flex-col items-center rounded-xl border-2 border-gray-300 bg-white p-3 text-center print:break-inside-avoid" style={{ width: 200 }}>
      <canvas ref={canvasRef} className="hidden" />

      {/* Student icon */}
      <div className="mb-1 text-3xl">👤</div>

      {/* Name */}
      <p className="text-[11px] font-semibold leading-tight mb-0.5">{data.fullName}</p>
      <p className="text-[10px] text-gray-500 mb-2">{data.studentCode}</p>

      {/* QR Code */}
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt={`QR ${data.studentCode}`} className="h-32 w-32 mb-1" />
      ) : (
        <div className="h-32 w-32 animate-pulse rounded bg-gray-100 mb-1" />
      )}

      <div className="text-[9px] font-mono text-gray-500 mb-1 tracking-widest">BARCODE</div>

      {/* Barcode placeholder — just text representation */}
      <div className="text-[9px] font-mono border border-gray-300 px-2 py-0.5 tracking-widest mb-2">
        {data.studentCode}
      </div>

      {/* School + Year */}
      <p className="text-[9px] text-gray-500 leading-tight">
        {data.schoolName ? `${data.schoolName} · ` : ""}{data.academicYear ?? (new Date().getFullYear() + 543)}
      </p>

      <button
        type="button"
        onClick={handleDownloadPng}
        className="mt-1 text-[9px] text-blue-500 underline-offset-2 hover:underline print:hidden"
      >
        ดาวน์โหลด PNG
      </button>
    </div>
  );
}

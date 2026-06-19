"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Badge } from "@/components/ui/badge";

export function PromptPayQrCard({
  title,
  description,
  amount,
  targetAmount,
  payload,
  status,
}: {
  title: string;
  description?: string | null;
  amount?: number | null;
  targetAmount?: number | null;
  payload: string;
  status: "active" | "paid" | "expired" | "cancelled";
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(payload, { width: 220, margin: 1 }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [payload]);

  const statusLabel: Record<string, string> = {
    active: "พร้อมรับชำระ",
    paid: "ชำระแล้ว",
    expired: "หมดอายุ",
    cancelled: "ยกเลิก",
  };
  const statusVariant: Record<string, "success" | "secondary" | "destructive" | "accent"> = {
    active: "secondary",
    paid: "success",
    expired: "destructive",
    cancelled: "destructive",
  };

  return (
    <div className="glass-card flex flex-col items-center gap-3 rounded-2xl border border-border/60 p-5 text-center print:break-inside-avoid">
      <div className="flex w-full items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>
      </div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt={`QR ${title}`} className="h-44 w-44" />
      ) : (
        <div className="h-44 w-44 animate-pulse rounded bg-muted" />
      )}
      <p className="text-xs text-muted-foreground">สแกนด้วยแอปธนาคารเพื่อชำระผ่าน PromptPay</p>
      {amount ? <p className="text-lg font-bold text-primary">{amount.toLocaleString()} บาท</p> : null}
      {targetAmount ? (
        <p className="text-xs text-muted-foreground">เป้าหมาย {targetAmount.toLocaleString()} บาท</p>
      ) : null}
    </div>
  );
}

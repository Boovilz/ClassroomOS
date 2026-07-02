"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";

export interface AssignmentQrProps {
  assignment: {
    id: string;
    title: string;
    due_date: string | null;
    max_score: number;
  };
}

export function AssignmentQr({ assignment }: AssignmentQrProps) {
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/submit/${assignment.id}`
      : `/submit/${assignment.id}`;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;

  const handlePrint = () => window.print();

  return (
    <div className="flex flex-col items-center gap-4 p-2 print:p-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrUrl}
        alt={`QR Code for ${assignment.title}`}
        width={200}
        height={200}
        className="rounded border"
      />
      <div className="text-center">
        <p className="font-semibold text-base">{assignment.title}</p>
        {assignment.due_date && (
          <p className="text-sm text-muted-foreground">กำหนดส่ง: {assignment.due_date}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1 break-all">{url}</p>
      </div>
      <Button variant="outline" onClick={handlePrint} className="print:hidden">
        พิมพ์
      </Button>
    </div>
  );
}

export function AssignmentQrDialog({ assignment }: AssignmentQrProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <QrCode className="mr-1 h-4 w-4" />
          QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>QR Code ส่งงาน</DialogTitle>
        </DialogHeader>
        <AssignmentQr assignment={assignment} />
      </DialogContent>
    </Dialog>
  );
}

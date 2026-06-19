"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export interface ReceiptViewData {
  receiptNo: string;
  receiptType: "deposit" | "withdrawal" | "expense" | "donation";
  studentName?: string | null;
  studentCode?: string | null;
  amount: number;
  issuedAt: string;
  verificationCode: string;
  schoolName?: string;
  description?: string | null;
}

const typeLabel: Record<ReceiptViewData["receiptType"], string> = {
  deposit: "ใบเสร็จรับเงินฝาก",
  withdrawal: "ใบเสร็จถอนเงิน",
  expense: "ใบเสร็จค่าใช้จ่าย",
  donation: "ใบเสร็จรับเงินบริจาค",
};

export function ReceiptView({ data }: { data: ReceiptViewData }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end print:hidden">
        <Button size="sm" variant="outline" className="gap-2" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          พิมพ์ใบเสร็จ
        </Button>
      </div>

      <div id="receipt-print-area" className="mx-auto max-w-md rounded-2xl border border-border/60 p-6 print:border-black/40">
        <div className="mb-4 text-center">
          <p className="text-base font-bold">{data.schoolName ?? "Teacher Classroom OS"}</p>
          <p className="text-sm text-muted-foreground">{typeLabel[data.receiptType]}</p>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">เลขที่ใบเสร็จ</span>
            <span className="font-medium">{data.receiptNo}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">วันที่</span>
            <span className="font-medium">{new Date(data.issuedAt).toLocaleString("th-TH")}</span>
          </div>
          {data.studentName && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">นักเรียน</span>
              <span className="font-medium">
                {data.studentName} {data.studentCode ? `(${data.studentCode})` : ""}
              </span>
            </div>
          )}
          {data.description && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">รายละเอียด</span>
              <span className="font-medium">{data.description}</span>
            </div>
          )}
          <div className="my-3 border-t border-dashed border-border/60" />
          <div className="flex justify-between text-lg">
            <span className="font-semibold">จำนวนเงิน</span>
            <span className="font-bold text-primary">{data.amount.toLocaleString()} บาท</span>
          </div>
          <div className="my-3 border-t border-dashed border-border/60" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>รหัสตรวจสอบ</span>
            <span>{data.verificationCode}</span>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">เอกสารนี้ออกโดยระบบอัตโนมัติ ใช้รหัสตรวจสอบเพื่อยืนยันความถูกต้อง</p>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-print-area,
          #receipt-print-area * {
            visibility: visible;
          }
          #receipt-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

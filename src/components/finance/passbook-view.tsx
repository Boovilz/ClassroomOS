"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export interface PassbookTransactionRow {
  id: string;
  transaction_no: string | null;
  occurred_at: string;
  txn_subtype: string | null;
  amount: number;
  balance_after: number | null;
  description: string | null;
  recorder_name?: string | null;
}

export function PassbookView({
  studentName,
  studentCode,
  accountNumber,
  classroom,
  balance,
  transactions,
  schoolName,
  academicYear,
}: {
  studentName: string;
  studentCode: string;
  accountNumber: string | null;
  classroom: string | null;
  balance: number;
  transactions: PassbookTransactionRow[];
  schoolName?: string;
  academicYear?: string;
}) {
  const printDate = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end print:hidden">
        <Button size="sm" variant="outline" className="gap-2" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          พิมพ์สมุดบัญชี
        </Button>
      </div>

      <div id="passbook-print-area" className="space-y-0">
        {/* Cover page */}
        <div className="mx-auto max-w-sm rounded-2xl border-2 border-border bg-card p-8 text-center print:rounded-none print:border-black print:max-w-none print:p-10">
          <p className="text-base font-bold">สมุดคู่ฝาก</p>
          <p className="text-sm">ธนาคารชั้นเรียน</p>
          {schoolName && <p className="mt-1 text-sm">{schoolName}</p>}

          <div className="my-8 text-5xl">🏦</div>

          <div className="space-y-2 text-sm text-left border rounded-xl p-4">
            <div className="flex gap-2">
              <span className="w-28 font-medium shrink-0">รหัสนักเรียน</span>
              <span>{studentCode}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-28 font-medium shrink-0">ชื่อ-สกุล</span>
              <span>{studentName}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-28 font-medium shrink-0">ชั้น/ห้อง</span>
              <span>{classroom ?? "-"}</span>
            </div>
            {academicYear && (
              <div className="flex gap-2">
                <span className="w-28 font-medium shrink-0">ปีการศึกษา</span>
                <span>{academicYear}</span>
              </div>
            )}
            <div className="flex gap-2">
              <span className="w-28 font-medium shrink-0">ยอดคงเหลือ</span>
              <span className="font-bold text-primary">{balance.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท</span>
            </div>
            <div className="flex gap-2">
              <span className="w-28 font-medium shrink-0">วันที่พิมพ์</span>
              <span>{printDate}</span>
            </div>
          </div>
        </div>

        {/* Statement page */}
        <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-border bg-card p-6 print:rounded-none print:border-black print:mt-0 print:max-w-none print:page-break-before-always">
          <p className="mb-4 text-center font-bold">รายการเดินบัญชี — {studentName}</p>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border bg-muted/40">
                <th className="border px-2 py-1 text-center w-10">ลำดับ</th>
                <th className="border px-2 py-1 text-center">วัน/เดือน/ปี เวลา</th>
                <th className="border px-2 py-1 text-left">รายการ</th>
                <th className="border px-2 py-1 text-right">จำนวนเงิน (฿)</th>
                <th className="border px-2 py-1 text-right">ยอดคงเหลือ (฿)</th>
                <th className="border px-2 py-1 text-center">ผู้บันทึก</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length > 0 ? (
                transactions.map((t, i) => (
                  <tr key={t.id} className="border">
                    <td className="border px-2 py-1 text-center">{i + 1}</td>
                    <td className="border px-2 py-1 text-center">
                      {new Date(t.occurred_at).toLocaleString("th-TH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="border px-2 py-1">
                      {t.txn_subtype === "deposit" ? "ฝากเงิน" : t.txn_subtype === "withdrawal" ? "ถอนเงิน" : t.description ?? "-"}
                      {t.transaction_no ? <span className="text-muted-foreground ml-1 text-xs">#{t.transaction_no}</span> : null}
                    </td>
                    <td className="border px-2 py-1 text-right">
                      {t.txn_subtype === "withdrawal" ? "-" : ""}
                      {t.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="border px-2 py-1 text-right">
                      {t.balance_after?.toLocaleString("th-TH", { minimumFractionDigits: 2 }) ?? "-"}
                    </td>
                    <td className="border px-2 py-1 text-center text-xs">{t.recorder_name ?? ""}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="border px-4 py-6 text-center text-muted-foreground">
                    ยังไม่มีประวัติการทำรายการ (ยอดเงิน {balance.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {transactions.length > 0 && (
            <p className="mt-2 text-center text-xs text-muted-foreground">--- สิ้นสุดรายการเดินบัญชี ---</p>
          )}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #passbook-print-area, #passbook-print-area * { visibility: visible; }
          #passbook-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:page-break-before-always { page-break-before: always; }
        }
      `}</style>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer } from "lucide-react";

export interface PassbookTransactionRow {
  id: string;
  transaction_no: string | null;
  occurred_at: string;
  txn_subtype: string | null;
  amount: number;
  balance_after: number | null;
  description: string | null;
}

export function PassbookView({
  studentName,
  studentCode,
  accountNumber,
  classroom,
  balance,
  transactions,
}: {
  studentName: string;
  studentCode: string;
  accountNumber: string | null;
  classroom: string | null;
  balance: number;
  transactions: PassbookTransactionRow[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end print:hidden">
        <Button size="sm" variant="outline" className="gap-2" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          พิมพ์สมุดบัญชี
        </Button>
      </div>

      <div id="passbook-print-area" className="rounded-2xl border border-border/60 p-6 print:border-black/40">
        <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <p className="text-lg font-bold">สมุดบัญชีออมทรัพย์นักเรียน</p>
            <p className="text-xs text-muted-foreground">Teacher Classroom OS</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{studentName}</p>
            <p className="text-muted-foreground">
              {studentCode} {classroom ? `· ${classroom}` : ""}
            </p>
            <p className="text-muted-foreground">เลขที่บัญชี: {accountNumber ?? "-"}</p>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between rounded-xl bg-primary/10 p-4">
          <span className="text-sm text-muted-foreground">ยอดคงเหลือปัจจุบัน</span>
          <span className="text-2xl font-bold text-primary">{balance.toLocaleString()} บาท</span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>วันที่</TableHead>
              <TableHead>เลขที่รายการ</TableHead>
              <TableHead>ประเภท</TableHead>
              <TableHead className="text-right">จำนวน</TableHead>
              <TableHead className="text-right">ยอดคงเหลือ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length > 0 ? (
              transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{new Date(t.occurred_at).toLocaleDateString("th-TH")}</TableCell>
                  <TableCell className="text-xs">{t.transaction_no ?? "-"}</TableCell>
                  <TableCell>{t.txn_subtype === "deposit" ? "ฝากเงิน" : t.txn_subtype === "withdrawal" ? "ถอนเงิน" : t.description ?? "-"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {t.txn_subtype === "deposit" ? "+" : "-"}
                    {t.amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">{t.balance_after?.toLocaleString() ?? "-"}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                  ยังไม่มีรายการเคลื่อนไหว
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #passbook-print-area,
          #passbook-print-area * {
            visibility: visible;
          }
          #passbook-print-area {
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

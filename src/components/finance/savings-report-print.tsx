"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface Transaction {
  id: string;
  txn_subtype: string | null;
  amount: number;
  balance_after: number | null;
  created_at: string;
  notes?: string | null;
  description?: string | null;
}

interface Account {
  id: string;
  account_number: string | null;
  account_type: string;
  balance: number;
  transactions: Transaction[];
}

interface Props {
  student: {
    full_name: string;
    code: string;
    classroom: string;
  };
  accounts: Account[];
  schoolName: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function txnLabel(subtype: string): string {
  if (subtype === "deposit") return "ฝาก";
  if (subtype === "withdrawal") return "ถอน";
  return subtype;
}

export function SavingsReportPrint({ student, accounts, schoolName }: Props) {
  const printDate = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end print:hidden">
        <Button variant="outline" onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          พิมพ์ / บันทึก PDF
        </Button>
      </div>

      <div className="print-page mx-auto max-w-3xl rounded-2xl border border-border/60 bg-card p-8 print:rounded-none print:border-0">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold">{schoolName}</h1>
          <h2 className="text-lg font-semibold">รายงานบัญชีออมทรัพย์นักเรียน</h2>
          <p className="text-sm text-muted-foreground">วันที่พิมพ์: {printDate}</p>
        </div>

        {/* Student info */}
        <div className="mb-6 grid grid-cols-3 gap-2 rounded-xl border border-border/60 p-4 text-sm">
          <div>
            <p className="text-muted-foreground">ชื่อ-นามสกุล</p>
            <p className="font-medium">{student.full_name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">รหัสนักเรียน</p>
            <p className="font-medium">{student.code}</p>
          </div>
          <div>
            <p className="text-muted-foreground">ห้องเรียน</p>
            <p className="font-medium">{student.classroom}</p>
          </div>
        </div>

        {/* Accounts */}
        {accounts.map((account) => (
          <div key={account.id} className="mb-8">
            <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2">
              <div>
                <p className="font-semibold">
                  บัญชีเลขที่ {account.account_number}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">({account.account_type})</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">ยอดคงเหลือปัจจุบัน</p>
                <p className="text-lg font-bold">{formatAmount(account.balance)} บาท</p>
              </div>
            </div>

            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="py-2 pl-2 text-left">วันที่</th>
                  <th className="py-2 text-left">รายการ</th>
                  <th className="py-2 text-right">จำนวน (บาท)</th>
                  <th className="py-2 pr-2 text-right">ยอดคงเหลือ (บาท)</th>
                </tr>
              </thead>
              <tbody>
                {account.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-muted-foreground">
                      ยังไม่มีรายการ
                    </td>
                  </tr>
                ) : (
                  account.transactions.map((txn) => (
                    <tr key={txn.id} className="border-b border-border/20 hover:bg-muted/10">
                      <td className="py-2 pl-2">{formatDate(txn.created_at)}</td>
                      <td className="py-2">
                        {txnLabel(txn.txn_subtype ?? "")}
                        {(txn.description || txn.notes) && (
                          <span className="ml-1 text-xs text-muted-foreground">({txn.description ?? txn.notes})</span>
                        )}
                      </td>
                      <td
                        className={`py-2 text-right font-medium ${
                          txn.txn_subtype === "deposit" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {txn.txn_subtype === "withdrawal" ? "-" : "+"}
                        {formatAmount(Math.abs(txn.amount))}
                      </td>
                      <td className="py-2 pr-2 text-right">{formatAmount(txn.balance_after ?? 0)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ))}

        <p className="mt-4 text-center text-xs text-muted-foreground">
          เอกสารนี้ออกโดยระบบ ClassroomOS — รายงานบัญชีออมทรัพย์นักเรียน
        </p>
      </div>
    </div>
  );
}

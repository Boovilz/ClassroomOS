"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export interface PendingWithdrawalRow {
  id: string;
  amount: number;
  description: string | null;
  occurred_at: string;
  account_id: string;
  finance_accounts: {
    name: string;
    account_number: string | null;
    students: { full_name: string; student_code: string } | null;
  } | null;
}

export function PendingWithdrawalsPanel({
  rows,
  schoolId,
  approverId,
}: {
  rows: PendingWithdrawalRow[];
  schoolId: string;
  approverId?: string;
}) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  async function approve(row: PendingWithdrawalRow) {
    setProcessingId(row.id);
    const supabase = createClient();
    const { data: account } = await supabase.from("finance_accounts").select("balance").eq("id", row.account_id).single();
    if (!account) {
      toast.error("ไม่พบบัญชี");
      setProcessingId(null);
      return;
    }
    const balanceAfter = account.balance - row.amount;

    await supabase
      .from("finance_transactions")
      .update({ status: "completed", approved_by: approverId ?? null, approved_at: new Date().toISOString(), balance_after: balanceAfter })
      .eq("id", row.id);
    await supabase.from("finance_accounts").update({ balance: balanceAfter }).eq("id", row.account_id);
    await supabase.from("finance_receipts").insert({
      school_id: schoolId,
      receipt_no: `RC-WDR-${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 9000 + 1000)}`,
      receipt_type: "withdrawal",
      finance_transaction_id: row.id,
      amount: row.amount,
      verification_code: Math.random().toString(36).slice(2, 10).toUpperCase(),
      issued_by: approverId ?? null,
    });

    void logAudit({
      schoolId,
      actorId: approverId,
      action: "update",
      entityTable: "finance_transactions",
      entityId: row.id,
      metadata: { event: "withdrawal_approved", amount: row.amount, account_id: row.account_id },
    });

    toast.success("อนุมัติการถอนเงินแล้ว");
    setProcessingId(null);
    router.refresh();
  }

  async function reject(row: PendingWithdrawalRow) {
    const reason = rejectReason[row.id]?.trim();
    if (!reason) {
      toast.error("กรุณาระบุเหตุผลในการปฏิเสธ");
      return;
    }
    setProcessingId(row.id);
    const supabase = createClient();
    await supabase
      .from("finance_transactions")
      .update({ status: "rejected", approved_by: approverId ?? null, approved_at: new Date().toISOString(), rejection_reason: reason })
      .eq("id", row.id);
    void logAudit({
      schoolId,
      actorId: approverId,
      action: "update",
      entityTable: "finance_transactions",
      entityId: row.id,
      metadata: { event: "withdrawal_rejected", amount: row.amount, account_id: row.account_id, reason },
    });

    toast.success("ปฏิเสธคำขอถอนเงินแล้ว");
    setProcessingId(null);
    router.refresh();
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">ไม่มีคำขอถอนเงินที่รออนุมัติ</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.id} className="rounded-xl border border-border/60 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {row.finance_accounts?.students?.full_name ?? "-"} ({row.finance_accounts?.students?.student_code ?? "-"})
              </p>
              <p className="text-xs text-muted-foreground">{row.description ?? "-"}</p>
            </div>
            <Badge variant="accent">{row.amount.toLocaleString()} บาท</Badge>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Input
              placeholder="เหตุผลปฏิเสธ (ถ้าจะปฏิเสธ)"
              className="h-8 max-w-xs text-xs"
              value={rejectReason[row.id] ?? ""}
              onChange={(e) => setRejectReason((prev) => ({ ...prev, [row.id]: e.target.value }))}
            />
            <Button size="sm" disabled={processingId === row.id} onClick={() => approve(row)}>
              อนุมัติ
            </Button>
            <Button size="sm" variant="destructive" disabled={processingId === row.id} onClick={() => reject(row)}>
              ปฏิเสธ
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

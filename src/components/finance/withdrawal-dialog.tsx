"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Banknote } from "lucide-react";

interface AccountOption {
  id: string;
  account_number: string | null;
  balance: number;
  students: { full_name: string; student_code: string } | null;
}

const APPROVAL_THRESHOLD = 500;

export function WithdrawalDialog({ schoolId, accounts, userId }: { schoolId: string; accounts: AccountOption[]; userId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const selectedAccount = accounts.find((a) => a.id === accountId);

  async function handleSubmit() {
    const numAmount = Number(amount);
    if (!selectedAccount || !numAmount || numAmount <= 0) {
      toast.error("กรุณาเลือกบัญชีและระบุจำนวนเงินให้ถูกต้อง");
      return;
    }
    if (!reason.trim()) {
      toast.error("กรุณาระบุเหตุผลในการถอนเงิน");
      return;
    }
    if (numAmount > selectedAccount.balance) {
      toast.error("ยอดเงินในบัญชีไม่เพียงพอ");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();
    const needsApproval = numAmount >= APPROVAL_THRESHOLD;
    const transactionNo = `WDR-${Date.now().toString().slice(-10)}${Math.floor(Math.random() * 9000 + 1000)}`;

    const { data: txn, error } = await supabase
      .from("finance_transactions")
      .insert({
        school_id: schoolId,
        account_id: selectedAccount.id,
        type: "expense",
        category: "ถอนเงิน",
        amount: numAmount,
        description: `${reason.trim()}${notes.trim() ? ` - ${notes.trim()}` : ""}`,
        recorded_by: userId ?? null,
        transaction_no: transactionNo,
        balance_after: needsApproval ? selectedAccount.balance : selectedAccount.balance - numAmount,
        status: needsApproval ? "pending" : "completed",
        txn_subtype: "withdrawal",
      })
      .select()
      .single();

    if (error || !txn) {
      toast.error("บันทึกคำขอถอนเงินไม่สำเร็จ", { description: error?.message });
      setIsSubmitting(false);
      return;
    }

    if (!needsApproval) {
      await supabase
        .from("finance_accounts")
        .update({ balance: selectedAccount.balance - numAmount })
        .eq("id", selectedAccount.id);
      await supabase.from("finance_receipts").insert({
        school_id: schoolId,
        receipt_no: `RC-WDR-${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 9000 + 1000)}`,
        receipt_type: "withdrawal",
        finance_transaction_id: txn.id,
        amount: numAmount,
        verification_code: Math.random().toString(36).slice(2, 10).toUpperCase(),
        issued_by: userId ?? null,
      });
      toast.success(`ถอนเงินสำเร็จ ${numAmount.toLocaleString()} บาท`);
    } else {
      toast.success("ส่งคำขอถอนเงินแล้ว รออนุมัติจากครู/ผู้ปกครอง");
    }

    setOpen(false);
    setAccountId("");
    setAmount("");
    setReason("");
    setNotes("");
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Banknote className="h-4 w-4" />
          ถอนเงิน
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>บันทึกการถอนเงิน</DialogTitle>
          <DialogDescription>
            การถอนตั้งแต่ {APPROVAL_THRESHOLD.toLocaleString()} บาทขึ้นไปต้องรอการอนุมัติจากครู
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกบัญชีนักเรียน" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.students?.student_code} - {a.students?.full_name} (คงเหลือ {a.balance.toLocaleString()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input type="number" placeholder="จำนวนเงิน (บาท)" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input placeholder="เหตุผลในการถอนเงิน" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Textarea placeholder="หมายเหตุ (ถ้ามี)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "กำลังบันทึก..." : "ยืนยันถอนเงิน"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
import { PiggyBank } from "lucide-react";

interface AccountOption {
  id: string;
  account_number: string | null;
  balance: number;
  students: { full_name: string; student_code: string } | null;
}

const QUICK_AMOUNTS = [20, 50, 100, 200, 500];

export function DepositDialog({ schoolId, accounts, userId }: { schoolId: string; accounts: AccountOption[]; userId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSubmit() {
    const account = accounts.find((a) => a.id === accountId);
    const numAmount = Number(amount);
    if (!account || !numAmount || numAmount <= 0) {
      toast.error("กรุณาเลือกบัญชีและระบุจำนวนเงินให้ถูกต้อง");
      return;
    }
    setIsSubmitting(true);
    const supabase = createClient();

    const balanceAfter = account.balance + numAmount;
    const transactionNo = `DEP-${Date.now().toString().slice(-10)}${Math.floor(Math.random() * 9000 + 1000)}`;

    const { data: txn, error } = await supabase
      .from("finance_transactions")
      .insert({
        school_id: schoolId,
        account_id: account.id,
        type: "income",
        category: "ฝากเงิน",
        amount: numAmount,
        description: notes.trim() || null,
        recorded_by: userId ?? null,
        transaction_no: transactionNo,
        balance_after: balanceAfter,
        status: "completed",
        txn_subtype: "deposit",
      })
      .select()
      .single();

    if (error || !txn) {
      toast.error("ฝากเงินไม่สำเร็จ", { description: error?.message });
      setIsSubmitting(false);
      return;
    }

    await supabase.from("finance_accounts").update({ balance: balanceAfter }).eq("id", account.id);
    await supabase.from("finance_receipts").insert({
      school_id: schoolId,
      receipt_no: `RC-DEP-${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 9000 + 1000)}`,
      receipt_type: "deposit",
      finance_transaction_id: txn.id,
      amount: numAmount,
      verification_code: Math.random().toString(36).slice(2, 10).toUpperCase(),
      issued_by: userId ?? null,
    });

    toast.success(`ฝากเงินสำเร็จ ${numAmount.toLocaleString()} บาท ยอดคงเหลือ ${balanceAfter.toLocaleString()} บาท`);
    setOpen(false);
    setAccountId("");
    setAmount("");
    setNotes("");
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <PiggyBank className="h-4 w-4" />
          ฝากเงิน
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>บันทึกการฝากเงิน</DialogTitle>
          <DialogDescription>เลือกบัญชีนักเรียน ระบุจำนวนเงิน ระบบจะออกใบเสร็จให้อัตโนมัติ</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="ค้นหา/เลือกนักเรียน" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.students?.student_code} - {a.students?.full_name} (คงเหลือ {a.balance.toLocaleString()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((qa) => (
              <Button key={qa} type="button" variant="outline" size="sm" onClick={() => setAmount(String(qa))}>
                +{qa}
              </Button>
            ))}
          </div>

          <Input type="number" placeholder="จำนวนเงิน (บาท)" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Textarea placeholder="หมายเหตุ (ถ้ามี)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "กำลังบันทึก..." : "ยืนยันฝากเงิน"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

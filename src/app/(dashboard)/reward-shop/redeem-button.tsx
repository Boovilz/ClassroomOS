"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShoppingCart, Coins } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StudentOption {
  id: string;
  full_name: string;
  coins: number;
}

export function RedeemButton({
  itemId,
  itemName,
  costCoins,
  schoolId,
  students,
}: {
  itemId: string;
  itemName: string;
  costCoins: number;
  schoolId: string;
  students: StudentOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedStudent = students.find((s) => s.id === studentId);
  const canAfford = selectedStudent ? selectedStudent.coins >= costCoins : false;

  async function handleRedeem() {
    const student = students.find((s) => s.id === studentId);
    if (!student) { toast.error("กรุณาเลือกนักเรียน"); return; }
    if (student.coins < costCoins) { toast.error(`เหรียญไม่เพียงพอ (มี ${student.coins} เหรียญ)`); return; }

    setIsSubmitting(true);
    const supabase = createClient();

    const { data: txn, error } = await supabase
      .from("coin_transactions")
      .insert({ school_id: schoolId, student_id: studentId, amount: -costCoins, reason: `แลก: ${itemName}`, reward_item_id: itemId })
      .select()
      .single();

    if (error) { toast.error("แลกไม่สำเร็จ", { description: error.message }); setIsSubmitting(false); return; }

    await supabase.from("students").update({ coins: student.coins - costCoins }).eq("id", studentId);
    await supabase.from("reward_redemptions").insert({ school_id: schoolId, student_id: studentId, reward_item_id: itemId, coin_transaction_id: txn?.id ?? null });

    toast.success(`แลก ${itemName} สำเร็จ 🎉`);
    setIsSubmitting(false);
    setOpen(false);
    setStudentId("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full gap-2" size="sm">
          <ShoppingCart className="h-4 w-4" />
          แลกของรางวัล
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>แลก: {itemName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 dark:bg-amber-950/30">
            <Coins className="h-5 w-5 text-amber-500" />
            <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
              ราคา {costCoins.toLocaleString()} เหรียญ
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">เลือกนักเรียน</label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกนักเรียน..." />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center justify-between gap-4">
                      <span>{s.full_name}</span>
                      <span className={`text-xs font-medium ${s.coins >= costCoins ? "text-green-600" : "text-red-500"}`}>
                        🪙 {s.coins}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedStudent && (
            <div className="rounded-lg bg-muted/40 p-3 text-sm">
              <div className="flex justify-between">
                <span>เหรียญปัจจุบัน</span>
                <span className="font-semibold">{selectedStudent.coins.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>หักค่าแลก</span>
                <span className="text-red-500">-{costCoins.toLocaleString()}</span>
              </div>
              <div className={`mt-1 flex justify-between border-t pt-1 font-semibold ${canAfford ? "text-green-600" : "text-red-500"}`}>
                <span>คงเหลือหลังแลก</span>
                <span>{(selectedStudent.coins - costCoins).toLocaleString()}</span>
              </div>
            </div>
          )}

          <Button
            className="w-full gap-2"
            onClick={handleRedeem}
            disabled={isSubmitting || !studentId || !canAfford}
          >
            <ShoppingCart className="h-4 w-4" />
            {isSubmitting ? "กำลังแลก..." : !canAfford && studentId ? "เหรียญไม่พอ" : "ยืนยันการแลก"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

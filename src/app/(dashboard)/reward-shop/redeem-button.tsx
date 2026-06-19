"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StudentOption {
  id: string;
  full_name: string;
  coins: number;
}

export function RedeemButton({
  itemId,
  costCoins,
  schoolId,
  students,
}: {
  itemId: string;
  costCoins: number;
  schoolId: string;
  students: StudentOption[];
}) {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRedeem() {
    const student = students.find((s) => s.id === studentId);
    if (!student) {
      toast.error("กรุณาเลือกนักเรียน");
      return;
    }
    if (student.coins < costCoins) {
      toast.error("เหรียญไม่เพียงพอ");
      return;
    }
    setIsSubmitting(true);
    const supabase = createClient();

    const { data: txn, error } = await supabase
      .from("coin_transactions")
      .insert({
        school_id: schoolId,
        student_id: studentId,
        amount: -costCoins,
        reason: "แลกของรางวัล",
        reward_item_id: itemId,
      })
      .select()
      .single();

    if (error) {
      toast.error("แลกของรางวัลไม่สำเร็จ", { description: error.message });
      setIsSubmitting(false);
      return;
    }

    await supabase
      .from("students")
      .update({ coins: student.coins - costCoins })
      .eq("id", studentId);

    await supabase.from("reward_redemptions").insert({
      school_id: schoolId,
      student_id: studentId,
      reward_item_id: itemId,
      coin_transaction_id: txn?.id ?? null,
    });

    toast.success("แลกของรางวัลสำเร็จ");
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Select value={studentId} onValueChange={setStudentId}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="เลือกนักเรียน" />
        </SelectTrigger>
        <SelectContent>
          {students.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={handleRedeem} disabled={isSubmitting} size="sm">
        แลก
      </Button>
    </div>
  );
}

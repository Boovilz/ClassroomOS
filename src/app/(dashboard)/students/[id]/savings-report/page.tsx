import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SavingsReportPrint } from "@/components/finance/savings-report-print";
import { Button } from "@/components/ui/button";

export default async function SavingsReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch student info
  const { data: student } = await supabase
    .from("students")
    .select("full_name, student_code, classroom, school_id")
    .eq("id", id)
    .single();

  if (!student) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">ไม่พบข้อมูลนักเรียน</p>
        <Button variant="ghost" size="sm" asChild className="mt-4">
          <Link href={`/students/${id}`}>← กลับ</Link>
        </Button>
      </div>
    );
  }

  // Fetch school name
  const { data: school } = await supabase
    .from("schools")
    .select("name")
    .eq("id", student.school_id)
    .single();

  // Fetch savings accounts with transactions
  const { data: accounts } = await supabase
    .from("finance_accounts")
    .select("id, account_number, account_type, balance")
    .eq("student_id", id)
    .eq("account_type", "savings");

  const accountsWithTransactions = await Promise.all(
    (accounts ?? []).map(async (account) => {
      const { data: transactions } = await supabase
        .from("finance_transactions")
        .select("id, txn_subtype, amount, balance_after, created_at, description")
        .eq("account_id", account.id)
        .order("created_at", { ascending: false });

      return {
        ...account,
        transactions: transactions ?? [],
      };
    })
  );

  if (accountsWithTransactions.length === 0) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">ไม่มีบัญชีออมทรัพย์</p>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/students/${id}`}>← กลับ</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/students/${id}`}>← กลับ</Link>
        </Button>
      </div>
      <SavingsReportPrint
        student={{
          full_name: student.full_name ?? "-",
          code: student.student_code ?? "-",
          classroom: student.classroom ?? "-",
        }}
        accounts={accountsWithTransactions}
        schoolName={school?.name ?? "-"}
      />
    </div>
  );
}

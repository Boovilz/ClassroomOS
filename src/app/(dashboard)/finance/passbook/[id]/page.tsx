import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSavingsAccountByStudent, getTransactionHistory } from "@/lib/queries/finance";
import { PassbookView } from "@/components/finance/passbook-view";

export default async function PassbookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const account = await getSavingsAccountByStudent(id);
  if (!account) notFound();

  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id").eq("id", auth.user.id).single()
    : { data: null };
  const { data: school } = profile?.school_id
    ? await supabase.from("schools").select("name").eq("id", profile.school_id).single()
    : { data: null };

  const transactions = await getTransactionHistory({ studentId: id, limit: 200 });
  const beYear = String(new Date().getFullYear() + 543);

  return (
    <PassbookView
      studentName={account.students?.full_name ?? "-"}
      studentCode={account.students?.student_code ?? "-"}
      accountNumber={account.account_number}
      classroom={account.students?.classroom ?? null}
      balance={account.balance}
      schoolName={school?.name ?? undefined}
      academicYear={beYear}
      transactions={transactions.map((t) => ({
        id: t.id,
        transaction_no: t.transaction_no,
        occurred_at: t.occurred_at,
        txn_subtype: t.txn_subtype,
        amount: t.amount,
        balance_after: t.balance_after,
        description: t.description,
      }))}
    />
  );
}

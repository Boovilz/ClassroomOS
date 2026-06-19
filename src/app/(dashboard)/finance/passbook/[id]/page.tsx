import { notFound } from "next/navigation";
import { getSavingsAccountByStudent, getTransactionHistory } from "@/lib/queries/finance";
import { PassbookView } from "@/components/finance/passbook-view";

export default async function PassbookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await getSavingsAccountByStudent(id);
  if (!account) notFound();

  const transactions = await getTransactionHistory({ studentId: id, limit: 100 });

  return (
    <PassbookView
      studentName={account.students?.full_name ?? "-"}
      studentCode={account.students?.student_code ?? "-"}
      accountNumber={account.account_number}
      classroom={account.students?.classroom ?? null}
      balance={account.balance}
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

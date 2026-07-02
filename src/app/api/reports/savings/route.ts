import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json({ error: "studentId is required" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch student info
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, full_name, code, classroom")
      .eq("id", studentId)
      .single();

    if (studentError) {
      if (studentError.code === "PGRST116") {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
      }
      throw studentError;
    }

    // Fetch savings accounts
    const { data: accounts, error: accountsError } = await supabase
      .from("finance_accounts")
      .select("id, account_number, account_type, balance")
      .eq("student_id", studentId)
      .eq("account_type", "savings");

    if (accountsError) throw accountsError;

    // Fetch transactions for each account
    const accountsWithTransactions = await Promise.all(
      (accounts ?? []).map(async (account) => {
        const { data: transactions, error: txError } = await supabase
          .from("finance_transactions")
          .select("*")
          .eq("account_id", account.id)
          .order("created_at", { ascending: false });

        if (txError) throw txError;

        return {
          ...account,
          transactions: transactions ?? [],
        };
      })
    );

    return NextResponse.json({
      student,
      accounts: accountsWithTransactions,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Helpers
// ============================================================================

function generateAccountNumber(): string {
  const ts = Date.now().toString().slice(-8);
  const rand = Math.floor(Math.random() * 900 + 100);
  return `SAV-${ts}${rand}`;
}

function generateTransactionNo(prefix: string): string {
  const ts = Date.now().toString().slice(-10);
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${ts}${rand}`;
}

function generateReceiptNo(prefix: string): string {
  const ts = Date.now().toString().slice(-8);
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `RC-${prefix}-${ts}${rand}`;
}

function generateVerificationCode(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export async function logFinanceAudit(params: {
  schoolId: string;
  actorId?: string;
  action: "create" | "update" | "delete" | "approve" | "reject";
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  await supabase.from("finance_audit_logs").insert({
    school_id: params.schoolId,
    actor_id: params.actorId ?? null,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    details: params.details ?? null,
  });
}

// ============================================================================
// Finance dashboard stats
// ============================================================================

export interface FinanceDashboardStats {
  totalSavings: number;
  todayDeposits: number;
  todayWithdrawals: number;
  classroomFundBalance: number;
  activeAccounts: number;
  inactiveAccounts: number;
  monthlyTransactionCount: number;
  pendingWithdrawals: number;
}

export async function getFinanceDashboard(): Promise<FinanceDashboardStats> {
  const supabase = await createClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const since60Days = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: savingsAccounts }, { data: fundAccounts }, { data: monthTxns }, { data: pending }] =
    await Promise.all([
      supabase.from("finance_accounts").select("balance, status, updated_at").eq("account_type", "savings"),
      supabase
        .from("finance_accounts")
        .select("balance")
        .in("account_type", ["classroom_fund", "school_fund", "lunch_fund"]),
      supabase
        .from("finance_transactions")
        .select("type, amount, occurred_at, txn_subtype, status")
        .gte("occurred_at", startOfMonth.toISOString().slice(0, 10)),
      supabase.from("finance_transactions").select("id").eq("status", "pending").eq("txn_subtype", "withdrawal"),
    ]);

  const totalSavings = (savingsAccounts ?? []).reduce((sum, a) => sum + (a.balance ?? 0), 0);
  const classroomFundBalance = (fundAccounts ?? []).reduce((sum, a) => sum + (a.balance ?? 0), 0);
  const activeAccounts = (savingsAccounts ?? []).filter((a) => a.status === "active").length;
  const inactiveAccounts = (savingsAccounts ?? []).filter((a) => {
    if (!a.updated_at) return true;
    return new Date(a.updated_at) < new Date(since60Days);
  }).length;

  let todayDeposits = 0;
  let todayWithdrawals = 0;
  for (const t of monthTxns ?? []) {
    const occurred = new Date(t.occurred_at);
    if (occurred >= startOfDay && t.status === "completed") {
      if (t.txn_subtype === "deposit") todayDeposits += t.amount;
      if (t.txn_subtype === "withdrawal") todayWithdrawals += t.amount;
    }
  }

  return {
    totalSavings,
    todayDeposits,
    todayWithdrawals,
    classroomFundBalance,
    activeAccounts,
    inactiveAccounts,
    monthlyTransactionCount: (monthTxns ?? []).length,
    pendingWithdrawals: (pending ?? []).length,
  };
}

export interface TopSaverRow {
  student_id: string;
  full_name: string;
  student_code: string;
  classroom: string | null;
  avatar_url: string | null;
  balance: number;
}

export async function getTopSavers(limit = 10): Promise<TopSaverRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("finance_accounts")
    .select("balance, student_id, students(full_name, student_code, classroom, avatar_url, deleted_at)")
    .eq("account_type", "savings")
    .not("student_id", "is", null)
    .order("balance", { ascending: false })
    .limit(limit)
    .returns<
      {
        balance: number;
        student_id: string | null;
        students: {
          full_name: string;
          student_code: string;
          classroom: string | null;
          avatar_url: string | null;
          deleted_at: string | null;
        } | null;
      }[]
    >();

  return (data ?? [])
    .filter((row) => row.student_id && row.students && !row.students.deleted_at)
    .map((row) => ({
      student_id: row.student_id as string,
      full_name: row.students!.full_name,
      student_code: row.students!.student_code,
      classroom: row.students!.classroom,
      avatar_url: row.students!.avatar_url,
      balance: row.balance,
    }));
}

export async function getInactiveAccounts(days = 60) {
  const supabase = await createClient();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("finance_accounts")
    .select("id, balance, updated_at, account_number, students(full_name, student_code, classroom, deleted_at)")
    .eq("account_type", "savings")
    .lt("updated_at", cutoff)
    .order("updated_at", { ascending: true });
  return (data ?? []).filter((row) => !row.students || !row.students.deleted_at);
}

export interface MonthlyTrendPoint {
  month: string;
  deposits: number;
  withdrawals: number;
}

export async function getMonthlyTrends(months = 6): Promise<MonthlyTrendPoint[]> {
  const supabase = await createClient();
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);
  const { data } = await supabase
    .from("finance_transactions")
    .select("occurred_at, amount, txn_subtype, status")
    .gte("occurred_at", since.toISOString().slice(0, 10))
    .in("txn_subtype", ["deposit", "withdrawal"])
    .eq("status", "completed");

  const buckets = new Map<string, { deposits: number; withdrawals: number }>();
  for (let i = 0; i < months; i++) {
    const d = new Date(since);
    d.setMonth(d.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, { deposits: 0, withdrawals: 0 });
  }
  for (const t of data ?? []) {
    const d = new Date(t.occurred_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (t.txn_subtype === "deposit") bucket.deposits += t.amount;
    if (t.txn_subtype === "withdrawal") bucket.withdrawals += t.amount;
  }

  return Array.from(buckets.entries()).map(([month, v]) => ({ month, ...v }));
}

// ============================================================================
// Student savings accounts
// ============================================================================

export async function getOrCreateSavingsAccount(studentId: string, schoolId: string, accountType: "regular" | "special" | "activity" | "emergency" = "regular") {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("finance_accounts")
    .select("*")
    .eq("student_id", studentId)
    .eq("account_type", "savings")
    .maybeSingle();
  if (existing) return existing;

  const { data: student } = await supabase.from("students").select("full_name").eq("id", studentId).single();

  const { data: created, error } = await supabase
    .from("finance_accounts")
    .insert({
      school_id: schoolId,
      student_id: studentId,
      name: `บัญชีออมทรัพย์ - ${student?.full_name ?? ""}`,
      account_type: "savings",
      account_number: generateAccountNumber(),
      classroom: "savings",
    })
    .select()
    .single();
  if (error) throw error;
  await logFinanceAudit({ schoolId, action: "create", entityType: "finance_accounts", entityId: created.id });
  return created;
}

export async function getSavingsAccountByStudent(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("finance_accounts")
    .select("*, students(full_name, student_code, classroom, avatar_url)")
    .eq("student_id", studentId)
    .eq("account_type", "savings")
    .maybeSingle();
  return data;
}

export async function getAllSavingsAccounts() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("finance_accounts")
    .select("*, students(full_name, student_code, classroom, avatar_url, deleted_at)")
    .eq("account_type", "savings")
    .order("balance", { ascending: false });
  return (data ?? []).filter((row) => !row.students || !row.students.deleted_at);
}

// ============================================================================
// Deposits / Withdrawals
// ============================================================================

export async function recordDeposit(params: {
  schoolId: string;
  accountId: string;
  studentId?: string;
  amount: number;
  notes?: string;
  recordedBy?: string;
}) {
  const supabase = await createClient();
  const { data: account } = await supabase.from("finance_accounts").select("balance").eq("id", params.accountId).single();
  if (!account) throw new Error("ไม่พบบัญชี");

  const balanceAfter = account.balance + params.amount;
  const transactionNo = generateTransactionNo("DEP");

  const { data: txn, error } = await supabase
    .from("finance_transactions")
    .insert({
      school_id: params.schoolId,
      account_id: params.accountId,
      student_id: params.studentId ?? null,
      type: "income",
      category: "ฝากเงิน",
      amount: params.amount,
      description: params.notes ?? null,
      recorded_by: params.recordedBy ?? null,
      transaction_no: transactionNo,
      balance_after: balanceAfter,
      status: "completed",
      txn_subtype: "deposit",
    })
    .select()
    .single();
  if (error) throw error;

  await supabase.from("finance_accounts").update({ balance: balanceAfter }).eq("id", params.accountId);

  const receipt = await createReceipt({
    schoolId: params.schoolId,
    receiptType: "deposit",
    financeTransactionId: txn.id,
    amount: params.amount,
    issuedBy: params.recordedBy,
  });

  if (params.studentId) {
    await updateGoalProgressForStudent(params.studentId, params.amount, txn.id);
    const { data: student } = await supabase.from("students").select("user_id, full_name").eq("id", params.studentId).single();
    if (student?.user_id) {
      await supabase.from("notifications").insert({
        school_id: params.schoolId,
        user_id: student.user_id,
        title: "ฝากเงินสำเร็จ",
        body: `ฝากเงิน ${params.amount.toLocaleString()} บาท ยอดคงเหลือ ${balanceAfter.toLocaleString()} บาท`,
        category: "finance",
        priority: "low",
      });
    }
  }

  await logFinanceAudit({ schoolId: params.schoolId, actorId: params.recordedBy, action: "create", entityType: "finance_transactions", entityId: txn.id, details: { amount: params.amount, type: "deposit" } });

  return { transaction: txn, receipt, balanceAfter };
}

export async function recordWithdrawalRequest(params: {
  schoolId: string;
  accountId: string;
  studentId?: string;
  amount: number;
  reason: string;
  notes?: string;
  recordedBy?: string;
  requiresApproval?: boolean;
}) {
  const supabase = await createClient();
  const { data: account } = await supabase.from("finance_accounts").select("balance").eq("id", params.accountId).single();
  if (!account) throw new Error("ไม่พบบัญชี");
  if (account.balance < params.amount) throw new Error("ยอดเงินในบัญชีไม่เพียงพอ");

  const transactionNo = generateTransactionNo("WDR");
  const needsApproval = params.requiresApproval ?? params.amount >= 500;

  const { data: txn, error } = await supabase
    .from("finance_transactions")
    .insert({
      school_id: params.schoolId,
      account_id: params.accountId,
      student_id: params.studentId ?? null,
      type: "expense",
      category: "ถอนเงิน",
      amount: params.amount,
      description: `${params.reason}${params.notes ? ` - ${params.notes}` : ""}`,
      recorded_by: params.recordedBy ?? null,
      transaction_no: transactionNo,
      balance_after: needsApproval ? account.balance : account.balance - params.amount,
      status: needsApproval ? "pending" : "completed",
      txn_subtype: "withdrawal",
    })
    .select()
    .single();
  if (error) throw error;

  if (!needsApproval) {
    await supabase.from("finance_accounts").update({ balance: account.balance - params.amount }).eq("id", params.accountId);
    await createReceipt({ schoolId: params.schoolId, receiptType: "withdrawal", financeTransactionId: txn.id, amount: params.amount, issuedBy: params.recordedBy });
  }

  await logFinanceAudit({ schoolId: params.schoolId, actorId: params.recordedBy, action: "create", entityType: "finance_transactions", entityId: txn.id, details: { amount: params.amount, type: "withdrawal", needsApproval } });

  return txn;
}

export async function approveWithdrawal(transactionId: string, approverId: string, schoolId: string) {
  const supabase = await createClient();
  const { data: txn } = await supabase.from("finance_transactions").select("*").eq("id", transactionId).single();
  if (!txn) throw new Error("ไม่พบรายการ");
  if (txn.status !== "pending") throw new Error("รายการนี้ไม่ได้อยู่ในสถานะรออนุมัติ");

  const { data: account } = await supabase.from("finance_accounts").select("balance").eq("id", txn.account_id).single();
  if (!account) throw new Error("ไม่พบบัญชี");
  const balanceAfter = account.balance - txn.amount;

  await supabase
    .from("finance_transactions")
    .update({ status: "completed", approved_by: approverId, approved_at: new Date().toISOString(), balance_after: balanceAfter })
    .eq("id", transactionId);

  await supabase.from("finance_accounts").update({ balance: balanceAfter }).eq("id", txn.account_id);

  await createReceipt({ schoolId, receiptType: "withdrawal", financeTransactionId: transactionId, amount: txn.amount, issuedBy: approverId });

  if (txn.student_id) {
    const { data: student } = await supabase.from("students").select("user_id").eq("id", txn.student_id).single();
    if (student?.user_id) {
      await supabase.from("notifications").insert({
        school_id: schoolId,
        user_id: student.user_id,
        title: "อนุมัติการถอนเงินแล้ว",
        body: `ถอนเงิน ${txn.amount.toLocaleString()} บาท ยอดคงเหลือ ${balanceAfter.toLocaleString()} บาท`,
        category: "finance",
        priority: "medium",
      });
    }
  }

  await logFinanceAudit({ schoolId, actorId: approverId, action: "approve", entityType: "finance_transactions", entityId: transactionId });
}

export async function rejectWithdrawal(transactionId: string, approverId: string, schoolId: string, reason: string) {
  const supabase = await createClient();
  await supabase
    .from("finance_transactions")
    .update({ status: "rejected", approved_by: approverId, approved_at: new Date().toISOString(), rejection_reason: reason })
    .eq("id", transactionId);

  const { data: txn } = await supabase.from("finance_transactions").select("student_id, amount").eq("id", transactionId).single();
  if (txn?.student_id) {
    const { data: student } = await supabase.from("students").select("user_id").eq("id", txn.student_id).single();
    if (student?.user_id) {
      await supabase.from("notifications").insert({
        school_id: schoolId,
        user_id: student.user_id,
        title: "คำขอถอนเงินถูกปฏิเสธ",
        body: `เหตุผล: ${reason}`,
        category: "finance",
        priority: "medium",
      });
    }
  }

  await logFinanceAudit({ schoolId, actorId: approverId, action: "reject", entityType: "finance_transactions", entityId: transactionId, details: { reason } });
}

export async function getPendingWithdrawals() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("finance_transactions")
    .select("*, finance_accounts(name, account_number, students(full_name, student_code, deleted_at))")
    .eq("status", "pending")
    .eq("txn_subtype", "withdrawal")
    .order("created_at", { ascending: false });
  return (data ?? []).filter((row) => !row.finance_accounts?.students || !row.finance_accounts.students.deleted_at);
}

// ============================================================================
// Receipts
// ============================================================================

export async function createReceipt(params: {
  schoolId: string;
  receiptType: "deposit" | "withdrawal" | "expense" | "donation";
  financeTransactionId?: string;
  financeExpenseId?: string;
  amount: number;
  issuedTo?: string;
  issuedBy?: string;
}) {
  const supabase = await createClient();
  const prefixMap: Record<string, string> = { deposit: "DEP", withdrawal: "WDR", expense: "EXP", donation: "DON" };
  const { data, error } = await supabase
    .from("finance_receipts")
    .insert({
      school_id: params.schoolId,
      receipt_no: generateReceiptNo(prefixMap[params.receiptType]),
      receipt_type: params.receiptType,
      finance_transaction_id: params.financeTransactionId ?? null,
      finance_expense_id: params.financeExpenseId ?? null,
      issued_to: params.issuedTo ?? null,
      amount: params.amount,
      verification_code: generateVerificationCode(),
      issued_by: params.issuedBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getReceiptByTransaction(transactionId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("finance_receipts")
    .select("*, finance_transactions(amount, occurred_at, category, description, finance_accounts(name, account_number, students(full_name, student_code)))")
    .eq("finance_transaction_id", transactionId)
    .maybeSingle();
  return data;
}

// ============================================================================
// Transaction history
// ============================================================================

export type TransactionFilterPeriod = "daily" | "weekly" | "monthly" | "yearly" | "all";

export async function getTransactionHistory(params: {
  studentId?: string;
  period?: TransactionFilterPeriod;
  limit?: number;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("finance_transactions")
    .select("*, finance_accounts(name, account_number, students(full_name, student_code, deleted_at))")
    .order("occurred_at", { ascending: false })
    .limit(params.limit ?? 100);

  if (params.studentId) query = query.eq("student_id", params.studentId);

  const period = params.period ?? "all";
  if (period !== "all") {
    const days = period === "daily" ? 1 : period === "weekly" ? 7 : period === "monthly" ? 30 : 365;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    query = query.gte("occurred_at", since);
  }

  const { data } = await query;
  return (data ?? []).filter((row) => !row.finance_accounts?.students || !row.finance_accounts.students.deleted_at);
}

// ============================================================================
// Classroom fund / expenses
// ============================================================================

export async function getFinanceCategories(kind?: "income" | "expense") {
  const supabase = await createClient();
  let query = supabase.from("finance_categories").select("*").order("name");
  if (kind) query = query.eq("kind", kind);
  const { data } = await query;
  return data ?? [];
}

export async function getClassroomFundAccounts() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("finance_accounts")
    .select("*")
    .in("account_type", ["classroom_fund", "school_fund", "lunch_fund"])
    .order("name");
  return data ?? [];
}

export async function recordExpense(params: {
  schoolId: string;
  accountId: string;
  categoryId?: string;
  name: string;
  amount: number;
  expenseDate?: string;
  receiptUrl?: string;
  description?: string;
  requestedBy?: string;
  autoApprove?: boolean;
}) {
  const supabase = await createClient();
  const status = params.autoApprove ? "approved" : "pending";

  const { data: expense, error } = await supabase
    .from("finance_expenses")
    .insert({
      school_id: params.schoolId,
      account_id: params.accountId,
      category_id: params.categoryId ?? null,
      name: params.name,
      amount: params.amount,
      expense_date: params.expenseDate ?? new Date().toISOString().slice(0, 10),
      receipt_url: params.receiptUrl ?? null,
      description: params.description ?? null,
      requested_by: params.requestedBy ?? null,
      status,
      approved_by: params.autoApprove ? params.requestedBy ?? null : null,
      approved_at: params.autoApprove ? new Date().toISOString() : null,
    })
    .select()
    .single();
  if (error) throw error;

  if (status === "approved") {
    await applyApprovedExpense(expense.id);
  }

  await logFinanceAudit({ schoolId: params.schoolId, actorId: params.requestedBy, action: "create", entityType: "finance_expenses", entityId: expense.id });
  return expense;
}

export async function approveExpense(expenseId: string, approverId: string, schoolId: string) {
  const supabase = await createClient();
  await supabase
    .from("finance_expenses")
    .update({ status: "approved", approved_by: approverId, approved_at: new Date().toISOString() })
    .eq("id", expenseId);
  await applyApprovedExpense(expenseId);
  await logFinanceAudit({ schoolId, actorId: approverId, action: "approve", entityType: "finance_expenses", entityId: expenseId });
}

async function applyApprovedExpense(expenseId: string) {
  const supabase = await createClient();
  const { data: expense } = await supabase.from("finance_expenses").select("*").eq("id", expenseId).single();
  if (!expense) return;

  const { data: account } = await supabase.from("finance_accounts").select("balance").eq("id", expense.account_id).single();
  if (!account) return;
  const balanceAfter = account.balance - expense.amount;

  const { data: txn } = await supabase
    .from("finance_transactions")
    .insert({
      school_id: expense.school_id,
      account_id: expense.account_id,
      type: "expense",
      category: "ค่าใช้จ่ายกองทุน",
      amount: expense.amount,
      description: expense.name,
      transaction_no: generateTransactionNo("EXP"),
      balance_after: balanceAfter,
      status: "completed",
      txn_subtype: "expense",
      recorded_by: expense.approved_by,
    })
    .select()
    .single();

  await supabase.from("finance_accounts").update({ balance: balanceAfter }).eq("id", expense.account_id);
  if (txn) {
    await supabase.from("finance_expenses").update({ finance_transaction_id: txn.id }).eq("id", expenseId);
    await createReceipt({ schoolId: expense.school_id, receiptType: "expense", financeExpenseId: expenseId, financeTransactionId: txn.id, amount: expense.amount, issuedBy: expense.approved_by ?? undefined });
  }
}

export async function getExpenses(status?: "pending" | "approved" | "rejected") {
  const supabase = await createClient();
  let query = supabase
    .from("finance_expenses")
    .select("*, finance_categories(name, icon), finance_accounts(name)")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data } = await query;
  return data ?? [];
}

// ============================================================================
// Savings goals
// ============================================================================

export async function createSavingsGoal(params: {
  schoolId: string;
  studentId: string;
  accountId?: string;
  title: string;
  targetAmount: number;
  targetDate?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("finance_goals")
    .insert({
      school_id: params.schoolId,
      student_id: params.studentId,
      account_id: params.accountId ?? null,
      title: params.title,
      target_amount: params.targetAmount,
      target_date: params.targetDate ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getStudentGoals(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("finance_goals")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

async function updateGoalProgressForStudent(studentId: string, depositAmount: number, transactionId: string) {
  const supabase = await createClient();
  const { data: goals } = await supabase
    .from("finance_goals")
    .select("*")
    .eq("student_id", studentId)
    .eq("status", "active");
  if (!goals || goals.length === 0) return;

  // Apply the deposit proportionally to the most urgent active goal (earliest target date / oldest).
  const goal = goals[0];
  const newAmount = Math.min(goal.target_amount, goal.current_amount + depositAmount);

  await supabase.from("finance_goal_progress").insert({
    goal_id: goal.id,
    finance_transaction_id: transactionId,
    amount: depositAmount,
  });

  await supabase
    .from("finance_goals")
    .update({
      current_amount: newAmount,
      status: newAmount >= goal.target_amount ? "achieved" : "active",
    })
    .eq("id", goal.id);
}

export function estimateGoalCompletion(goal: { current_amount: number; target_amount: number; created_at: string }): string | null {
  const remaining = goal.target_amount - goal.current_amount;
  if (remaining <= 0) return null;
  const daysElapsed = Math.max(1, (Date.now() - new Date(goal.created_at).getTime()) / (1000 * 60 * 60 * 24));
  const dailyRate = goal.current_amount / daysElapsed;
  if (dailyRate <= 0) return null;
  const daysNeeded = Math.ceil(remaining / dailyRate);
  const completion = new Date(Date.now() + daysNeeded * 24 * 60 * 60 * 1000);
  return completion.toISOString().slice(0, 10);
}

// ============================================================================
// QR payments
// ============================================================================

export async function createQrPayment(params: {
  schoolId: string;
  purpose: "school_activity" | "fundraising" | "donation" | "field_trip" | "other";
  title: string;
  description?: string;
  qrType?: "static" | "dynamic";
  targetAmount?: number;
  amount?: number;
  promptPayId: string;
  createdBy?: string;
}) {
  const supabase = await createClient();
  const payload = buildPromptPayPayload(params.promptPayId, params.qrType === "dynamic" ? params.amount : undefined);

  const { data, error } = await supabase
    .from("finance_qr_payments")
    .insert({
      school_id: params.schoolId,
      purpose: params.purpose,
      title: params.title,
      description: params.description ?? null,
      qr_type: params.qrType ?? "dynamic",
      target_amount: params.targetAmount ?? null,
      amount: params.amount ?? null,
      payload,
      created_by: params.createdBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Builds a PromptPay EMVCo-format QR payload string client-side (no network
 * call, no real payment gateway). This follows the standard PromptPay TLV
 * structure used widely for Thai QR codes; mobile banking apps can read the
 * recipient + amount, but actual settlement still happens outside this app.
 */
export function buildPromptPayPayload(promptPayId: string, amount?: number): string {
  const sanitizedId = promptPayId.replace(/[^0-9]/g, "");
  const isPhone = sanitizedId.length <= 10;
  const formattedId = isPhone ? `0066${sanitizedId.replace(/^0/, "")}` : sanitizedId;

  function tlv(id: string, value: string) {
    const len = value.length.toString().padStart(2, "0");
    return `${id}${len}${value}`;
  }

  const merchantInfo =
    tlv("00", "A000000677010111") + tlv("01", isPhone ? tlv("01", formattedId) : tlv("02", formattedId));

  let payload =
    tlv("00", "01") +
    tlv("01", amount ? "12" : "11") +
    tlv("29", merchantInfo) +
    tlv("53", "764");

  if (amount) {
    payload += tlv("54", amount.toFixed(2));
  }

  payload += "6304";
  const crc = crc16(payload);
  return payload + crc;
}

function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export async function getActiveQrPayments() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("finance_qr_payments")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function markQrPaymentPaid(id: string) {
  const supabase = await createClient();
  await supabase.from("finance_qr_payments").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
}

// ============================================================================
// Parent finance portal
// ============================================================================

export async function getParentFinanceSummary(studentId: string) {
  const [account, transactions, goals] = await Promise.all([
    getSavingsAccountByStudent(studentId),
    getTransactionHistory({ studentId, limit: 30 }),
    getStudentGoals(studentId),
  ]);

  return { account, transactions, goals };
}

// ============================================================================
// Financial analytics & leaderboard
// ============================================================================

export async function getSavingsLeaderboard(limit = 10) {
  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("finance_accounts")
    .select("balance, student_id, created_at, students(full_name, student_code, classroom, avatar_url, xp, coins, deleted_at)")
    .eq("account_type", "savings")
    .not("student_id", "is", null);
  if (!accounts) return [];

  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: recentDeposits } = await supabase
    .from("finance_transactions")
    .select("student_id, amount, occurred_at")
    .eq("txn_subtype", "deposit")
    .eq("status", "completed")
    .gte("occurred_at", since30);

  const depositCountMap = new Map<string, number>();
  const depositSumMap = new Map<string, number>();
  for (const d of recentDeposits ?? []) {
    if (!d.student_id) continue;
    depositCountMap.set(d.student_id, (depositCountMap.get(d.student_id) ?? 0) + 1);
    depositSumMap.set(d.student_id, (depositSumMap.get(d.student_id) ?? 0) + d.amount);
  }

  return accounts
    .filter((a) => a.student_id && a.students && !a.students.deleted_at)
    .map((a) => ({
      studentId: a.student_id as string,
      fullName: a.students!.full_name,
      studentCode: a.students!.student_code,
      classroom: a.students!.classroom,
      avatarUrl: a.students!.avatar_url,
      balance: a.balance,
      depositCount30d: depositCountMap.get(a.student_id as string) ?? 0,
      depositSum30d: depositSumMap.get(a.student_id as string) ?? 0,
    }))
    .sort((a, b) => b.balance - a.balance)
    .slice(0, limit);
}

export async function getClassroomFinanceComparison() {
  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("finance_accounts")
    .select("balance, students(classroom, deleted_at)")
    .eq("account_type", "savings")
    .not("student_id", "is", null);

  const totals = new Map<string, { total: number; count: number }>();
  for (const a of (accounts ?? []).filter((a) => !a.students || !a.students.deleted_at)) {
    const classroom = a.students?.classroom ?? "ไม่ระบุ";
    const cur = totals.get(classroom) ?? { total: 0, count: 0 };
    cur.total += a.balance;
    cur.count += 1;
    totals.set(classroom, cur);
  }

  return Array.from(totals.entries())
    .map(([classroom, v]) => ({ classroom, totalSavings: v.total, accountCount: v.count, average: v.count > 0 ? Math.round(v.total / v.count) : 0 }))
    .sort((a, b) => b.totalSavings - a.totalSavings);
}

// ============================================================================
// AI financial analysis (rule-based, no external LLM calls)
// ============================================================================

export async function getAiFinancialAnalysis(studentId: string): Promise<string[]> {
  const supabase = await createClient();
  const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [{ data: account }, { data: txns }, { data: student }] = await Promise.all([
    supabase.from("finance_accounts").select("balance, updated_at").eq("student_id", studentId).eq("account_type", "savings").maybeSingle(),
    supabase
      .from("finance_transactions")
      .select("amount, txn_subtype, occurred_at")
      .eq("student_id", studentId)
      .gte("occurred_at", since90)
      .order("occurred_at", { ascending: false }),
    supabase.from("students").select("full_name").eq("id", studentId).single(),
  ]);

  const insights: string[] = [];
  if (!account || !student) {
    insights.push("ยังไม่มีบัญชีออมทรัพย์สำหรับนักเรียนคนนี้");
    return insights;
  }

  const deposits = (txns ?? []).filter((t) => t.txn_subtype === "deposit");
  const withdrawals = (txns ?? []).filter((t) => t.txn_subtype === "withdrawal");
  const depositSum = deposits.reduce((s, t) => s + t.amount, 0);
  const withdrawalSum = withdrawals.reduce((s, t) => s + t.amount, 0);

  const daysSinceUpdate = account.updated_at ? (Date.now() - new Date(account.updated_at).getTime()) / (1000 * 60 * 60 * 24) : Infinity;
  if (daysSinceUpdate > 60) {
    insights.push(`${student.full_name} ไม่มีการเคลื่อนไหวบัญชีมานานกว่า ${Math.floor(daysSinceUpdate)} วัน ควรติดตามและกระตุ้นให้ออมเงินอย่างต่อเนื่อง`);
  }

  if (deposits.length >= 8) {
    insights.push(`${student.full_name} มีพฤติกรรมการออมที่สม่ำเสมอ (ฝากเงิน ${deposits.length} ครั้งใน 90 วัน) ควรได้รับคำชมเชย`);
  } else if (deposits.length === 0) {
    insights.push(`${student.full_name} ยังไม่มีการฝากเงินในช่วง 90 วันที่ผ่านมา ควรส่งเสริมให้เริ่มออมเงิน`);
  }

  if (withdrawalSum > depositSum && depositSum > 0) {
    insights.push(`${student.full_name} มีการถอนเงินมากกว่าการฝากเงินในช่วง 90 วันที่ผ่านมา ควรพูดคุยเรื่องการบริหารเงินออม`);
  }

  if (account.balance < 100) {
    insights.push(`${student.full_name} มียอดเงินออมต่ำ (${account.balance.toLocaleString()} บาท) อาจมีความเสี่ยงด้านการเงิน ควรให้คำแนะนำเรื่องการออม`);
  } else if (account.balance >= 2000) {
    insights.push(`${student.full_name} มียอดเงินออมสูง (${account.balance.toLocaleString()} บาท) แสดงถึงวินัยทางการเงินที่ดีเยี่ยม`);
  }

  if (insights.length === 0) {
    insights.push(`${student.full_name} มีพฤติกรรมทางการเงินอยู่ในเกณฑ์ปกติ ไม่พบความเสี่ยงที่ชัดเจนในช่วงนี้`);
  }

  return insights;
}

export async function getClassroomFinancialSummary() {
  const supabase = await createClient();
  const { data: accounts } = await supabase.from("finance_accounts").select("balance, status").eq("account_type", "savings");
  const total = (accounts ?? []).reduce((s, a) => s + a.balance, 0);
  const active = (accounts ?? []).filter((a) => a.status === "active").length;
  const average = accounts && accounts.length > 0 ? Math.round(total / accounts.length) : 0;

  const insights: string[] = [];
  insights.push(`ยอดเงินออมรวมของนักเรียนทั้งหมด ${total.toLocaleString()} บาท จาก ${accounts?.length ?? 0} บัญชี (เฉลี่ย ${average.toLocaleString()} บาท/บัญชี)`);
  if (active < (accounts?.length ?? 0)) {
    insights.push(`มีบัญชีที่ไม่ได้ใช้งาน ${(accounts?.length ?? 0) - active} บัญชี ควรตรวจสอบและติดตาม`);
  }
  return { total, accountCount: accounts?.length ?? 0, average, insights };
}

// ============================================================================
// Audit log
// ============================================================================

export async function getFinanceAuditLogs(limit = 100) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("finance_audit_logs")
    .select("*, users(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

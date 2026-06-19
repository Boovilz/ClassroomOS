import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Coins, TrendingDown, TrendingUp, Wallet, Users, AlertTriangle } from "lucide-react";
import {
  getFinanceDashboard,
  getTopSavers,
  getAllSavingsAccounts,
  getPendingWithdrawals,
  getMonthlyTrends,
  getClassroomFinanceComparison,
  getActiveQrPayments,
} from "@/lib/queries/finance";
import { DepositDialog } from "@/components/finance/deposit-dialog";
import { WithdrawalDialog } from "@/components/finance/withdrawal-dialog";
import { PendingWithdrawalsPanel } from "@/components/finance/pending-withdrawals-panel";
import { FinanceTrendChart } from "@/components/finance/finance-trend-chart";
import { ClassroomComparisonChart } from "@/components/finance/classroom-comparison-chart";
import { PromptPayQrCard } from "@/components/finance/promptpay-qr-card";
import Link from "next/link";

const accountTypeLabel: Record<string, string> = {
  classroom_fund: "กองทุนห้องเรียน",
  school_fund: "กองทุนโรงเรียน",
  lunch_fund: "กองทุนอาหารกลางวัน",
  savings: "เงินออมนักเรียน",
  other: "อื่นๆ",
};

export default async function FinancePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("id, school_id").eq("id", auth.user.id).single()
    : { data: null };

  const [
    { data: fundAccounts },
    { data: transactions },
    stats,
    topSavers,
    savingsAccounts,
    pendingWithdrawals,
    monthlyTrends,
    classroomComparison,
    qrPayments,
  ] = await Promise.all([
    supabase.from("finance_accounts").select("*").in("account_type", ["classroom_fund", "school_fund", "lunch_fund"]).order("name"),
    supabase
      .from("finance_transactions")
      .select("id, type, category, amount, description, occurred_at, finance_accounts(name)")
      .order("occurred_at", { ascending: false })
      .limit(20)
      .returns<
        {
          id: string;
          type: string;
          category: string | null;
          amount: number;
          description: string | null;
          occurred_at: string;
          finance_accounts: { name: string } | null;
        }[]
      >(),
    getFinanceDashboard(),
    getTopSavers(5),
    getAllSavingsAccounts(),
    getPendingWithdrawals(),
    getMonthlyTrends(6),
    getClassroomFinanceComparison(),
    getActiveQrPayments(),
  ]);

  const depositAccounts = (savingsAccounts ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    balance: a.balance,
    account_number: a.account_number,
    students: a.students,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">การเงินห้องเรียนและเงินออมนักเรียน</h1>
        <p className="text-sm text-muted-foreground">ภาพรวมกองทุน บัญชีเงินออม และรายการรับ-จ่าย</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <Coins className="h-8 w-8 text-accent" />
            <div>
              <p className="text-xs text-muted-foreground">เงินออมรวม</p>
              <p className="text-xl font-bold">{stats.totalSavings.toLocaleString()} บาท</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <TrendingUp className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-xs text-muted-foreground">ฝากวันนี้</p>
              <p className="text-xl font-bold">{stats.todayDeposits.toLocaleString()} บาท</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <TrendingDown className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-xs text-muted-foreground">ถอนวันนี้</p>
              <p className="text-xl font-bold">{stats.todayWithdrawals.toLocaleString()} บาท</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <Wallet className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">กองทุนห้องเรียน</p>
              <p className="text-xl font-bold">{stats.classroomFundBalance.toLocaleString()} บาท</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <Users className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">บัญชีที่ใช้งานอยู่</p>
              <p className="text-xl font-bold">{stats.activeAccounts.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-xs text-muted-foreground">บัญชีไม่มีความเคลื่อนไหว</p>
              <p className="text-xl font-bold">{stats.inactiveAccounts.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">รายการเดือนนี้</p>
            <p className="text-xl font-bold">{stats.monthlyTransactionCount.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">รอการอนุมัติถอน</p>
            <p className="text-xl font-bold">{stats.pendingWithdrawals.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {profile?.school_id && (
        <div className="flex flex-wrap gap-2">
          <DepositDialog schoolId={profile.school_id} accounts={depositAccounts} userId={profile.id} />
          <WithdrawalDialog schoolId={profile.school_id} accounts={depositAccounts} userId={profile.id} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>แนวโน้มการฝาก-ถอน</CardTitle>
          </CardHeader>
          <CardContent>
            <FinanceTrendChart data={monthlyTrends} />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>เปรียบเทียบเงินออมตามห้องเรียน</CardTitle>
          </CardHeader>
          <CardContent>
            <ClassroomComparisonChart data={classroomComparison} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>นักออมยอดเยี่ยม</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topSavers.length > 0 ? (
              topSavers.map((s, i) => (
                <div key={s.student_id} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                  <div>
                    <span className="mr-2 font-bold text-accent">#{i + 1}</span>
                    {s.full_name} ({s.student_code})
                  </div>
                  <Badge variant="outline">{s.balance.toLocaleString()} บาท</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
            )}
          </CardContent>
        </Card>

        {profile?.school_id && (
          <PendingWithdrawalsPanel rows={pendingWithdrawals} schoolId={profile.school_id} approverId={profile.id} />
        )}
      </div>

      {qrPayments.length > 0 && (
        <div>
          <h2 className="mb-2 text-lg font-semibold">QR รับเงิน (กิจกรรม/ระดมทุน/บริจาค)</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {qrPayments.map((qr) => (
              <PromptPayQrCard
                key={qr.id}
                title={qr.title}
                description={qr.description}
                amount={qr.amount}
                targetAmount={qr.target_amount}
                payload={qr.payload}
                status={qr.status}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {fundAccounts && fundAccounts.length > 0 ? (
          fundAccounts.map((a) => (
            <Card key={a.id} className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">{a.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{a.balance.toLocaleString()} บาท</p>
                <p className="text-xs text-muted-foreground">{accountTypeLabel[a.account_type] ?? a.account_type}</p>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">ยังไม่มีบัญชีกองทุน</p>
        )}
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>สมุดบัญชีเงินออมนักเรียน</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>นักเรียน</TableHead>
                <TableHead>เลขที่บัญชี</TableHead>
                <TableHead>ห้องเรียน</TableHead>
                <TableHead className="text-right">ยอดคงเหลือ</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {savingsAccounts.length > 0 ? (
                savingsAccounts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.students?.full_name ?? "-"}</TableCell>
                    <TableCell>{a.account_number ?? "-"}</TableCell>
                    <TableCell>{a.students?.classroom ?? "-"}</TableCell>
                    <TableCell className="text-right font-medium">{a.balance.toLocaleString()} บาท</TableCell>
                    <TableCell>
                      {a.student_id && (
                        <Link href={`/finance/passbook/${a.student_id}`} className="text-xs text-primary underline">
                          สมุดบัญชี
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    ยังไม่มีบัญชีเงินออม
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>รายการล่าสุด</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>บัญชี</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead>หมวดหมู่</TableHead>
                <TableHead>รายละเอียด</TableHead>
                <TableHead className="text-right">จำนวน</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions && transactions.length > 0 ? (
                transactions.map((t) => {
                  const account = Array.isArray(t.finance_accounts) ? t.finance_accounts[0] : t.finance_accounts;
                  return (
                    <TableRow key={t.id}>
                      <TableCell>{account?.name ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant={t.type === "income" ? "success" : "destructive"}>
                          {t.type === "income" ? "รับ" : "จ่าย"}
                        </Badge>
                      </TableCell>
                      <TableCell>{t.category ?? "-"}</TableCell>
                      <TableCell>{t.description ?? "-"}</TableCell>
                      <TableCell className="text-right font-medium">
                        {t.type === "income" ? "+" : "-"}
                        {t.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    ยังไม่มีรายการการเงิน
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const accountTypeLabel: Record<string, string> = {
  classroom_fund: "กองทุนห้องเรียน",
  school_fund: "กองทุนโรงเรียน",
  lunch_fund: "กองทุนอาหารกลางวัน",
  other: "อื่นๆ",
};

export default async function FinancePage() {
  const supabase = await createClient();

  const [{ data: accounts }, { data: transactions }] = await Promise.all([
    supabase.from("finance_accounts").select("*").order("name"),
    supabase
      .from("finance_transactions")
      .select("id, type, category, amount, description, occurred_at, finance_accounts(name)")
      .order("occurred_at", { ascending: false })
      .limit(50)
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
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">การเงินห้องเรียน</h1>
        <p className="text-sm text-muted-foreground">ภาพรวมกองทุนและรายการรับ-จ่าย</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {accounts && accounts.length > 0 ? (
          accounts.map((a) => (
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
          <p className="text-sm text-muted-foreground">ยังไม่มีบัญชีการเงิน</p>
        )}
      </div>

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

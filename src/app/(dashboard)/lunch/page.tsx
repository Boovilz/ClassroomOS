import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MealRecordFormDialog } from "./meal-record-form-dialog";

const mealTypeLabel: Record<string, string> = {
  breakfast: "อาหารเช้า",
  lunch: "อาหารกลางวัน",
  snack: "อาหารว่าง",
};

const statusLabel: Record<string, string> = {
  served: "ได้รับแล้ว",
  absent: "ขาด",
  special_diet: "อาหารพิเศษ",
};

export default async function LunchPage() {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id").eq("id", auth.user.id).single()
    : { data: null };

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: students }, { data: records }, { data: lunchFund }] = await Promise.all([
    supabase.from("students").select("id, full_name, student_code").eq("is_active", true).order("full_name"),
    supabase
      .from("meal_records")
      .select("id, date, meal_type, status, notes, students(full_name, student_code)")
      .order("date", { ascending: false })
      .limit(50)
      .returns<
        {
          id: string;
          date: string;
          meal_type: string;
          status: string;
          notes: string | null;
          students: { full_name: string; student_code: string } | null;
        }[]
      >(),
    supabase.from("finance_accounts").select("name, balance").eq("account_type", "lunch_fund").maybeSingle(),
  ]);

  const todayCount = records?.filter((r) => r.date === today && r.status === "served").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ระบบอาหารกลางวัน</h1>
          <p className="text-sm text-muted-foreground">บันทึกการรับอาหารและกองทุนอาหารกลางวัน</p>
        </div>
        {profile?.school_id && <MealRecordFormDialog schoolId={profile.school_id} students={students ?? []} />}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">รับอาหารวันนี้</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{todayCount} คน</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">กองทุนอาหารกลางวัน</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {lunchFund ? `${lunchFund.balance.toLocaleString()} บาท` : "ยังไม่มีกองทุน"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>บันทึกการรับอาหารล่าสุด</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>วันที่</TableHead>
                <TableHead>นักเรียน</TableHead>
                <TableHead>ประเภทอาหาร</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>หมายเหตุ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records && records.length > 0 ? (
                records.map((r) => {
                  const student = Array.isArray(r.students) ? r.students[0] : r.students;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{new Date(r.date).toLocaleDateString("th-TH")}</TableCell>
                      <TableCell>{student ? `${student.full_name} (${student.student_code})` : "-"}</TableCell>
                      <TableCell>{mealTypeLabel[r.meal_type] ?? r.meal_type}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "served" ? "success" : r.status === "absent" ? "destructive" : "secondary"}>
                          {statusLabel[r.status] ?? r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.notes ?? "-"}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    ยังไม่มีบันทึกการรับอาหาร
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

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MealRecordFormDialog } from "./meal-record-form-dialog";
import { getActiveAllergyMap } from "@/lib/queries/health";
import { getLunchDashboard, getAiNutritionAnalysis } from "@/lib/queries/lunch";
import {
  CalendarDays,
  QrCode,
  ClipboardCheck,
  Boxes,
  Truck,
  ShieldCheck,
  BarChart3,
  Users,
} from "lucide-react";

const lunchSubPages = [
  { href: "/lunch/menu", label: "เมนูอาหาร", icon: CalendarDays },
  { href: "/lunch/distribute", label: "แจกอาหาร (QR)", icon: QrCode },
  { href: "/lunch/eligibility", label: "สิทธิ์รับอาหาร", icon: ClipboardCheck },
  { href: "/lunch/inventory", label: "คลังวัตถุดิบ", icon: Boxes },
  { href: "/lunch/suppliers", label: "จัดซื้อ/ผู้จำหน่าย", icon: Truck },
  { href: "/lunch/food-safety", label: "ความปลอดภัยอาหาร", icon: ShieldCheck },
  { href: "/lunch/analytics", label: "วิเคราะห์ข้อมูล", icon: BarChart3 },
  { href: "/lunch/parent", label: "พอร์ทัลผู้ปกครอง", icon: Users },
];

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
    supabase.from("students").select("id, full_name, student_code").eq("is_active", true).is("deleted_at", null).order("full_name"),
    supabase
      .from("meal_records")
      .select("id, student_id, date, meal_type, status, notes, students(full_name, student_code, deleted_at)")
      .order("date", { ascending: false })
      .limit(50)
      .returns<
        {
          id: string;
          student_id: string;
          date: string;
          meal_type: string;
          status: string;
          notes: string | null;
          students: { full_name: string; student_code: string; deleted_at: string | null } | null;
        }[]
      >(),
    supabase.from("finance_accounts").select("name, balance").eq("account_type", "lunch_fund").maybeSingle(),
  ]);

  const visibleRecords = (records ?? []).filter((r) => !r.students || !r.students.deleted_at);
  const todayCount = visibleRecords.filter((r) => r.date === today && r.status === "served").length;
  const allergyMap = await getActiveAllergyMap((students ?? []).map((s) => s.id));
  const dashboard = profile?.school_id ? await getLunchDashboard() : null;
  const aiInsights = profile?.school_id ? await getAiNutritionAnalysis(profile.school_id).catch(() => []) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ระบบอาหารกลางวัน</h1>
          <p className="text-sm text-muted-foreground">โภชนาการ เมนู คลังวัตถุดิบ และการแจกอาหารกลางวันด้วย QR</p>
        </div>
        {profile?.school_id && <MealRecordFormDialog schoolId={profile.school_id} students={students ?? []} />}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {lunchSubPages.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Button variant="outline" className="glass-card h-auto w-full flex-col gap-2 py-4">
              <Icon className="h-5 w-5 text-primary" />
              <span className="text-xs">{label}</span>
            </Button>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">รับอาหารวันนี้</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{todayCount} คน</p>
            {dashboard && <p className="text-xs text-muted-foreground">ขาดรับ {dashboard.studentsAbsent} คน</p>}
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
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">วัตถุดิบเหลือน้อย/ใกล้หมดอายุ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{dashboard ? dashboard.lowStockCount + dashboard.nearExpiryCount : 0} รายการ</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">นักเรียนอาหารพิเศษ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{dashboard?.specialDietCount ?? 0} คน</p>
          </CardContent>
        </Card>
      </div>

      {aiInsights.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">ข้อมูลเชิงวิเคราะห์ด้านโภชนาการ (AI)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {aiInsights.map((insight, i) => (
                <li key={i}>{insight}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

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
              {visibleRecords.length > 0 ? (
                visibleRecords.map((r) => {
                  const student = Array.isArray(r.students) ? r.students[0] : r.students;
                  const studentAllergies = allergyMap.get(r.student_id) ?? [];
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{new Date(r.date).toLocaleDateString("th-TH")}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          <span>{student ? `${student.full_name} (${student.student_code})` : "-"}</span>
                          {studentAllergies.map((a, i) => (
                            <Badge key={i} variant="destructive" className="text-[10px]">
                              แพ้ {a.allergen}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
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

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getLunchAnalytics, getClassroomLunchComparison } from "@/lib/queries/lunch";
import { LunchAnalyticsCharts } from "./lunch-analytics-charts";

export default async function LunchAnalyticsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id").eq("id", auth.user.id).single()
    : { data: null };
  const schoolId = profile?.school_id ?? null;

  const [analytics, classroomComparison] = schoolId
    ? await Promise.all([getLunchAnalytics(schoolId), getClassroomLunchComparison(schoolId)])
    : [null, []];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">วิเคราะห์ข้อมูลอาหารกลางวัน</h1>
        <p className="text-sm text-muted-foreground">แนวโน้มการรับอาหาร ต้นทุน คลังวัตถุดิบ และโภชนาการของนักเรียน</p>
      </div>

      {!analytics ? (
        <Card className="glass-card">
          <CardContent className="py-10 text-center text-muted-foreground">ไม่มีข้อมูลโรงเรียน</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">ค่าใช้จ่ายวันนี้</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{analytics.costSummary.dailyCost.toLocaleString()} บาท</p>
                <p className="text-xs text-muted-foreground">เฉลี่ย {analytics.costSummary.costPerStudent.toLocaleString()} บาท/คน</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">ค่าใช้จ่ายสัปดาห์นี้</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{analytics.costSummary.weeklyCost.toLocaleString()} บาท</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">ค่าใช้จ่ายเดือนนี้</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{analytics.costSummary.monthlyCost.toLocaleString()} บาท</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">งบเหลือในกองทุน</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">
                  {analytics.costSummary.budgetRemaining != null ? `${analytics.costSummary.budgetRemaining.toLocaleString()} บาท` : "ไม่มีกองทุน"}
                </p>
              </CardContent>
            </Card>
          </div>

          <LunchAnalyticsCharts
            participationTrend={analytics.participationTrend}
            nutritionBreakdown={analytics.nutritionBreakdown}
            classroomComparison={classroomComparison}
          />

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>การแจ้งเตือนคลังวัตถุดิบ</CardTitle>
              <CardDescription>รายการที่ใกล้หมด หมดสต็อก หรือใกล้/หมดอายุ</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.stockAlerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">ไม่มีการแจ้งเตือน</p>
              ) : (
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {analytics.stockAlerts.map((a, i) => (
                    <li key={i}>
                      {a.itemName} — {a.quantity} {a.unit}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

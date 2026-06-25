import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getParentLunchSummary, eligibilityStatusLabel, menuCategoryLabel } from "@/lib/queries/lunch";

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

export default async function LunchParentPortalPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { data: parentLinks } = auth?.user
    ? await supabase.from("parents").select("student_id").eq("user_id", auth.user.id)
    : { data: null };

  const studentIds = (parentLinks ?? []).map((p) => p.student_id);
  const { data: children } = studentIds.length > 0
    ? await supabase.from("students").select("id, full_name, student_code").in("id", studentIds).is("deleted_at", null)
    : { data: [] };

  const childList = children ?? [];

  const summaries = await Promise.all(childList.map((s) => getParentLunchSummary(s.id)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">พอร์ทัลผู้ปกครอง — อาหารกลางวัน</h1>
        <p className="text-sm text-muted-foreground">เมนูวันนี้ ประวัติการรับอาหาร สิทธิ์ และข้อมูลโภชนาการของบุตรหลาน</p>
      </div>

      {childList.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-10 text-center text-muted-foreground">ไม่พบข้อมูลนักเรียนที่เชื่อมโยงกับบัญชีนี้</CardContent>
        </Card>
      ) : (
        childList.map((student, idx) => {
          const summary = summaries[idx];
          const todayMenuItems = summary.todayMenu.items ?? [];
          return (
            <Card key={student.id} className="glass-card">
              <CardHeader>
                <CardTitle>
                  {student.full_name} ({student.student_code})
                </CardTitle>
                <CardDescription>
                  สิทธิ์การรับอาหาร: {summary.eligibility ? eligibilityStatusLabel[summary.eligibility.status] ?? summary.eligibility.status : "ยังไม่กำหนด"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="mb-2 text-sm font-medium">เมนูอาหารวันนี้</h3>
                  {summary.todayMenu.menu ? (
                    <div className="flex flex-wrap gap-2">
                      {todayMenuItems.map((item) => (
                        <Badge key={item.id} variant="secondary">
                          {item.name} ({menuCategoryLabel[item.category] ?? item.category})
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">ยังไม่มีเมนูสำหรับวันนี้</p>
                  )}
                </div>

                {summary.specialDiets.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium">ข้อจำกัดด้านอาหาร</h3>
                    <div className="flex flex-wrap gap-2">
                      {summary.specialDiets.map((d, i) => (
                        <Badge key={i} variant="destructive">
                          {d.allergen}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {summary.nutrition.recommendations.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium">คำแนะนำด้านโภชนาการ</h3>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {summary.nutrition.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h3 className="mb-2 text-sm font-medium">ประวัติการรับอาหารล่าสุด</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>วันที่</TableHead>
                        <TableHead>ประเภทอาหาร</TableHead>
                        <TableHead>สถานะ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.mealHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="h-16 text-center text-muted-foreground">
                            ยังไม่มีประวัติการรับอาหาร
                          </TableCell>
                        </TableRow>
                      ) : (
                        summary.mealHistory.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell>{new Date(m.date).toLocaleDateString("th-TH")}</TableCell>
                            <TableCell>{mealTypeLabel[m.meal_type] ?? m.meal_type}</TableCell>
                            <TableCell>
                              <Badge variant={m.status === "served" ? "success" : m.status === "absent" ? "destructive" : "secondary"}>
                                {statusLabel[m.status] ?? m.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

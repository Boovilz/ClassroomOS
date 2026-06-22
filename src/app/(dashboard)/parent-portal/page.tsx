import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getParentPortalOverview,
  getParentPortalStudentSummary,
  getSharedDocuments,
} from "@/lib/queries/communication";

const attendanceStatusLabel: Record<string, string> = {
  present: "มาเรียน",
  absent: "ขาด",
  late: "มาสาย",
  leave: "ลา",
};

export default async function ParentPortalPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth?.user) {
    return (
      <Card className="glass-card">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">กรุณาเข้าสู่ระบบ</CardContent>
      </Card>
    );
  }

  const { students, parentRows } = await getParentPortalOverview(auth.user.id);
  const firstParentId = parentRows[0]?.id ?? null;

  const summaries = await Promise.all(students.map((s) => getParentPortalStudentSummary(s.id)));
  const sharedDocuments = firstParentId ? await getSharedDocuments(firstParentId) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">พอร์ทัลผู้ปกครอง</h1>
        <p className="text-sm text-muted-foreground">
          ภาพรวมข้อมูลบุตรหลานของท่าน รวบรวมจากระบบที่มีอยู่ของโรงเรียน (ไม่แสดงข้อมูลกรณีสวัสดิการ/เยี่ยมบ้านซึ่งเป็นข้อมูลภายในของเจ้าหน้าที่เท่านั้น)
        </p>
      </div>

      {students.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">ไม่พบข้อมูลนักเรียนที่เชื่อมโยงกับบัญชีนี้</CardContent>
        </Card>
      ) : (
        students.map((s, idx) => {
          const summary = summaries[idx];
          return (
            <Card key={s.id} className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">
                  {s.full_name} ({s.student_code}) - {s.classroom ?? "-"}
                </CardTitle>
                <div className="flex gap-2 pt-1">
                  <Badge variant="secondary">XP {s.xp}</Badge>
                  <Badge variant="secondary">เหรียญ {s.coins}</Badge>
                  <Badge variant="secondary">เลเวล {s.level}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-1 text-sm font-medium">การมาเรียนล่าสุด</p>
                  {summary.attendance.length === 0 ? (
                    <p className="text-xs text-muted-foreground">ไม่มีข้อมูล</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {summary.attendance.slice(0, 10).map((a, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">
                          {new Date(a.date).toLocaleDateString("th-TH")} · {attendanceStatusLabel[a.status] ?? a.status}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 text-sm">
                  <Link href="/attendance">
                    <Button variant="outline" size="sm">
                      ดูการมาเรียนทั้งหมด
                    </Button>
                  </Link>
                  <Link href="/academic">
                    <Button variant="outline" size="sm">
                      ดูผลการเรียน
                    </Button>
                  </Link>
                  <Link href="/behavior">
                    <Button variant="outline" size="sm">
                      ดูพฤติกรรม/XP
                    </Button>
                  </Link>
                  <Link href={`/health/${s.id}`}>
                    <Button variant="outline" size="sm">
                      ดูสุขภาพ
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">ประกาศล่าสุดจากโรงเรียน</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(summaries[0]?.announcements ?? []).length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">ยังไม่มีประกาศ</p>
          ) : (
            summaries[0].announcements.map((a) => (
              <div key={a.id} className="rounded-lg border border-border/60 p-3">
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("th-TH")}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">เอกสารที่โรงเรียนแบ่งปันให้</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sharedDocuments.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">ยังไม่มีเอกสารที่แบ่งปัน</p>
          ) : (
            sharedDocuments.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <div>
                  <p className="text-sm font-medium">{d.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.category} · {d.acknowledged_at ? `รับทราบแล้ว (${new Date(d.acknowledged_at).toLocaleDateString("th-TH")})` : "ยังไม่รับทราบ"}
                  </p>
                </div>
                <a href={d.file_url ?? "#"} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm">
                    เปิดเอกสาร
                  </Button>
                </a>
              </div>
            ))
          )}
          <p className="pt-2 text-[11px] text-muted-foreground">
            หมายเหตุ: การรับทราบเอกสารใช้การบันทึกเวลา (acknowledged_at) เท่านั้น ระบบนี้ไม่รองรับการลงลายมือชื่อดิจิทัล (digital signature)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

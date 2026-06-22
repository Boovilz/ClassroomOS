import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SchoolsManager } from "./schools-manager";
import { PLAN_LABEL_TH, type PlanId } from "@/lib/admin/quotas";

export default async function AdminSchoolsPage() {
  const supabase = await createClient();
  const { data: schools } = await supabase
    .from("schools")
    .select("*, school_quotas(*)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">จัดการโรงเรียน</h1>
        <p className="text-sm text-muted-foreground">รายชื่อโรงเรียนทั้งหมดในระบบ — เพิ่ม แก้ไข หรือระงับการใช้งาน</p>
      </div>

      <SchoolsManager />

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>รายชื่อโรงเรียน</CardTitle>
          <CardDescription>{schools?.length ?? 0} โรงเรียน</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อโรงเรียน</TableHead>
                <TableHead>จังหวัด</TableHead>
                <TableHead>แพ็กเกจ</TableHead>
                <TableHead>โควตานักเรียน</TableHead>
                <TableHead>สถานะ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schools && schools.length > 0 ? (
                schools.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.province ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{PLAN_LABEL_TH[s.plan as PlanId] ?? s.plan}</Badge>
                    </TableCell>
                    <TableCell>{s.school_quotas?.max_students ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={s.deleted_at ? "destructive" : "success"}>
                        {s.deleted_at ? "ระงับการใช้งาน" : "ใช้งานอยู่"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    ยังไม่มีโรงเรียนในระบบ
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

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getEligibilityList, eligibilityStatusLabel, programTypeLabel } from "@/lib/queries/lunch";
import { EligibilityFormDialog } from "./eligibility-form-dialog";

export default async function LunchEligibilityPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id").eq("id", auth.user.id).single()
    : { data: null };

  const [{ data: students }, eligibilityList] = await Promise.all([
    supabase.from("students").select("id, full_name, student_code").eq("is_active", true).is("deleted_at", null).order("full_name"),
    profile?.school_id ? getEligibilityList(profile.school_id) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">สิทธิ์รับอาหารกลางวัน</h1>
          <p className="text-sm text-muted-foreground">อาหารกลางวันฟรี โครงการช่วยเหลือพิเศษ ทุนการศึกษา และข้อจำกัดด้านอาหาร</p>
        </div>
        {profile?.school_id && <EligibilityFormDialog schoolId={profile.school_id} students={students ?? []} />}
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>รายชื่อนักเรียน</CardTitle>
          <CardDescription>สถานะสิทธิ์การรับอาหารกลางวันของนักเรียนแต่ละคน</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>นักเรียน</TableHead>
                <TableHead>โครงการ</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>ข้อจำกัดด้านอาหาร</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eligibilityList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    ยังไม่มีข้อมูลสิทธิ์การรับอาหาร
                  </TableCell>
                </TableRow>
              ) : (
                eligibilityList.map((row) => {
                  const student = Array.isArray(row.students) ? row.students[0] : row.students;
                  return (
                    <TableRow key={row.id}>
                      <TableCell>{student ? `${student.full_name} (${student.student_code})` : "-"}</TableCell>
                      <TableCell>{programTypeLabel[row.program_type] ?? row.program_type}</TableCell>
                      <TableCell>
                        <Badge variant={row.status === "eligible" ? "success" : row.status === "not_eligible" ? "destructive" : "secondary"}>
                          {eligibilityStatusLabel[row.status] ?? row.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{row.meal_restrictions ?? "-"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

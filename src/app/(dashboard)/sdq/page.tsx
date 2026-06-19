import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SdqFormDialog } from "./sdq-form-dialog";

const riskLabel: Record<string, string> = {
  normal: "ปกติ",
  borderline: "เฝ้าระวัง",
  abnormal: "มีความเสี่ยง",
};

const riskVariant: Record<string, "success" | "secondary" | "destructive"> = {
  normal: "success",
  borderline: "secondary",
  abnormal: "destructive",
};

export default async function SdqPage() {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id").eq("id", auth.user.id).single()
    : { data: null };

  const [{ data: students }, { data: assessments }] = await Promise.all([
    supabase.from("students").select("id, full_name, student_code").eq("is_active", true).order("full_name"),
    supabase
      .from("sdq_assessments")
      .select(
        "id, assessment_date, total_difficulties_score, risk_level, students(full_name, student_code)"
      )
      .order("assessment_date", { ascending: false })
      .limit(50)
      .returns<
        {
          id: string;
          assessment_date: string;
          total_difficulties_score: number | null;
          risk_level: string | null;
          students: { full_name: string; student_code: string } | null;
        }[]
      >(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ระบบประเมิน SDQ</h1>
          <p className="text-sm text-muted-foreground">แบบประเมินพฤติกรรมและจุดแข็ง-จุดอ่อนของนักเรียน</p>
        </div>
        {profile?.school_id && <SdqFormDialog schoolId={profile.school_id} students={students ?? []} />}
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>ผลการประเมินล่าสุด</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>วันที่ประเมิน</TableHead>
                <TableHead>นักเรียน</TableHead>
                <TableHead>คะแนนรวม</TableHead>
                <TableHead>ระดับความเสี่ยง</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assessments && assessments.length > 0 ? (
                assessments.map((a) => {
                  const student = Array.isArray(a.students) ? a.students[0] : a.students;
                  return (
                    <TableRow key={a.id}>
                      <TableCell>{new Date(a.assessment_date).toLocaleDateString("th-TH")}</TableCell>
                      <TableCell>{student ? `${student.full_name} (${student.student_code})` : "-"}</TableCell>
                      <TableCell>{a.total_difficulties_score ?? "-"}</TableCell>
                      <TableCell>
                        {a.risk_level && (
                          <Badge variant={riskVariant[a.risk_level] ?? "secondary"}>
                            {riskLabel[a.risk_level] ?? a.risk_level}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    ยังไม่มีผลการประเมิน
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

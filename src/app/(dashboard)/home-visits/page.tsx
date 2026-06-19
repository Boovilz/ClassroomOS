import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HomeVisitFormDialog } from "./home-visit-form-dialog";

export default async function HomeVisitsPage() {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id").eq("id", auth.user.id).single()
    : { data: null };
  const { data: teacher } = auth?.user
    ? await supabase.from("teachers").select("id").eq("user_id", auth.user.id).maybeSingle()
    : { data: null };

  const [{ data: students }, { data: visits }] = await Promise.all([
    supabase.from("students").select("id, full_name, student_code").eq("is_active", true).order("full_name"),
    supabase
      .from("home_visits")
      .select("id, visit_date, summary, family_situation, follow_up_required, students(full_name, student_code)")
      .order("visit_date", { ascending: false })
      .limit(30)
      .returns<
        {
          id: string;
          visit_date: string;
          summary: string | null;
          family_situation: string | null;
          follow_up_required: boolean;
          students: { full_name: string; student_code: string } | null;
        }[]
      >(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ระบบเยี่ยมบ้าน</h1>
          <p className="text-sm text-muted-foreground">บันทึกข้อมูลการเยี่ยมบ้านนักเรียนและสภาพแวดล้อมความเป็นอยู่</p>
        </div>
        {profile?.school_id && (
          <HomeVisitFormDialog schoolId={profile.school_id} teacherId={teacher?.id ?? null} students={students ?? []} />
        )}
      </div>

      <div className="space-y-3">
        {visits && visits.length > 0 ? (
          visits.map((v) => {
            const student = Array.isArray(v.students) ? v.students[0] : v.students;
            return (
              <Card key={v.id} className="glass-card">
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                  <div>
                    <CardTitle className="text-base">
                      {student?.full_name} ({student?.student_code})
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {new Date(v.visit_date).toLocaleDateString("th-TH")}
                    </p>
                  </div>
                  {v.follow_up_required && <Badge variant="destructive">ต้องติดตามต่อ</Badge>}
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {v.summary && <p>{v.summary}</p>}
                  {v.family_situation && (
                    <p className="text-muted-foreground">สภาพครอบครัว: {v.family_situation}</p>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="glass-card">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              ยังไม่มีบันทึกการเยี่ยมบ้าน
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

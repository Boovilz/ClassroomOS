import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BehaviorFormDialog } from "./behavior-form-dialog";

export default async function BehaviorPage() {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id").eq("id", auth.user.id).single()
    : { data: null };

  const [{ data: students }, { data: records }] = await Promise.all([
    supabase.from("students").select("id, full_name, student_code").eq("is_active", true).order("full_name"),
    supabase
      .from("behavior_records")
      .select("id, title, category, points, occurred_at, students(full_name, student_code)")
      .order("occurred_at", { ascending: false })
      .limit(30)
      .returns<
        {
          id: string;
          title: string;
          category: string;
          points: number;
          occurred_at: string;
          students: { full_name: string; student_code: string } | null;
        }[]
      >(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">พฤติกรรม &amp; XP</h1>
          <p className="text-sm text-muted-foreground">บันทึกพฤติกรรมเชิงบวก/ลบ และติดตาม XP ของนักเรียน</p>
        </div>
        {profile?.school_id && <BehaviorFormDialog schoolId={profile.school_id} students={students ?? []} />}
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>บันทึกพฤติกรรมล่าสุด</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {records && records.length > 0 ? (
            records.map((r) => {
              const student = Array.isArray(r.students) ? r.students[0] : r.students;
              return (
                <div key={r.id} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-muted-foreground">
                      {student?.full_name} ({student?.student_code})
                    </p>
                  </div>
                  <Badge variant={r.category === "positive" ? "success" : "destructive"}>
                    {r.points > 0 ? "+" : ""}
                    {r.points}
                  </Badge>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">ยังไม่มีบันทึกพฤติกรรม</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

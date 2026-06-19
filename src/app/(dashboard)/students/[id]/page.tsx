import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentFormDialog } from "@/components/students/student-form-dialog";

const genderLabel: Record<string, string> = { male: "ชาย", female: "หญิง", other: "อื่นๆ" };

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: student } = await supabase.from("students").select("*").eq("id", id).single();

  if (!student) {
    notFound();
  }

  const [{ data: parents }, { data: health }, { data: scores }, { data: behaviorRecords }, { data: attendance }] =
    await Promise.all([
      supabase.from("parents").select("*").eq("student_id", id),
      supabase
        .from("health_records")
        .select("*")
        .eq("student_id", id)
        .order("recorded_at", { ascending: false })
        .limit(5),
      supabase
        .from("scores")
        .select("score, max_score, term, subjects(name)")
        .eq("student_id", id)
        .order("created_at", { ascending: false })
        .limit(10)
        .returns<
          { score: number; max_score: number; term: string | null; subjects: { name: string } | null }[]
        >(),
      supabase
        .from("behavior_records")
        .select("title, points, category, occurred_at")
        .eq("student_id", id)
        .order("occurred_at", { ascending: false })
        .limit(10),
      supabase
        .from("attendance")
        .select("status, date")
        .eq("student_id", id)
        .order("date", { ascending: false })
        .limit(10),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-xl">{student.full_name?.[0] ?? "น"}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{student.full_name}</h1>
          <p className="text-muted-foreground">
            รหัสนักเรียน: {student.student_code} {student.nickname ? `(${student.nickname})` : ""} ·{" "}
            {student.classroom ?? "-"}
          </p>
        </div>
        <Badge variant={student.is_active ? "success" : "outline"} className="ml-auto">
          {student.is_active ? "กำลังศึกษา" : "ไม่ได้ศึกษา"}
        </Badge>
        <StudentFormDialog
          schoolId={student.school_id}
          initialValues={{
            id: student.id,
            student_code: student.student_code,
            full_name: student.full_name,
            nickname: student.nickname ?? "",
            gender: student.gender ?? undefined,
            birth_date: student.birth_date ?? "",
            grade: student.grade ?? "",
            classroom: student.classroom ?? "",
            blood_type: student.blood_type ?? "",
            address: student.address ?? "",
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">ระดับ / XP / เหรียญ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              Lv.{student.level} · {student.xp} XP · {student.coins} เหรียญ
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">วันเกิด</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{student.birth_date ?? "-"}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">เพศ / กรุ๊ปเลือด</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              {student.gender ? genderLabel[student.gender] ?? "-" : "-"} · {student.blood_type ?? "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="personal">
        <TabsList>
          <TabsTrigger value="personal">ข้อมูลส่วนตัว</TabsTrigger>
          <TabsTrigger value="parent">ผู้ปกครอง</TabsTrigger>
          <TabsTrigger value="health">สุขภาพ</TabsTrigger>
          <TabsTrigger value="academic">ผลการเรียน</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>ที่อยู่และข้อมูลทั่วไป</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>ที่อยู่: {student.address ?? "-"}</p>
              <p>เลขประจำตัวประชาชน: {student.citizen_id ?? "-"}</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>บันทึกพฤติกรรมล่าสุด</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {behaviorRecords && behaviorRecords.length > 0 ? (
                behaviorRecords.map((log, i) => (
                  <div key={i} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                    <span>{log.title}</span>
                    <Badge variant={log.category === "positive" ? "success" : "destructive"}>
                      {log.points > 0 ? "+" : ""}
                      {log.points}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">ยังไม่มีบันทึกพฤติกรรม</p>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>ประวัติการเข้าเรียนล่าสุด</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {attendance && attendance.length > 0 ? (
                attendance.map((a, i) => (
                  <div key={i} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                    <span>{a.date}</span>
                    <Badge variant="outline">{a.status}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลการเข้าเรียน</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parent">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>ข้อมูลผู้ปกครอง</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {parents && parents.length > 0 ? (
                parents.map((p) => (
                  <div key={p.id} className="rounded-xl border border-border/60 p-3 text-sm">
                    <p className="font-medium">{p.full_name}</p>
                    <p className="text-muted-foreground">
                      {p.relationship ?? "-"} · {p.phone ?? "-"} · {p.email ?? "-"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลผู้ปกครอง</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>บันทึกสุขภาพล่าสุด</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {health && health.length > 0 ? (
                health.map((h) => (
                  <div key={h.id} className="rounded-xl border border-border/60 p-3 text-sm">
                    <p>
                      ส่วนสูง {h.height_cm ?? "-"} ซม. · น้ำหนัก {h.weight_kg ?? "-"} กก.
                    </p>
                    <p className="text-muted-foreground">
                      บันทึกเมื่อ {h.recorded_at} {h.allergies ? `· แพ้: ${h.allergies}` : ""}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">ยังไม่มีบันทึกสุขภาพ</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academic">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>ผลการเรียนล่าสุด</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {scores && scores.length > 0 ? (
                scores.map((s, i) => {
                  const subject = Array.isArray(s.subjects) ? s.subjects[0] : s.subjects;
                  return (
                    <div key={i} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                      <span>
                        {subject?.name ?? "-"} ({s.term ?? "-"})
                      </span>
                      <span className="font-medium">
                        {s.score} / {s.max_score}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">ยังไม่มีผลการเรียน</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

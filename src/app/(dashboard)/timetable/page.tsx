import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users } from "lucide-react";

export default async function TimetablePage() {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("id, school_id").eq("id", auth.user.id).single()
    : { data: null };

  // List teachers for quick access to teacher timetable
  const { data: teachers } = profile?.school_id
    ? await supabase
        .from("users")
        .select("id, full_name")
        .eq("school_id", profile.school_id)
        .order("full_name")
        .limit(50)
    : { data: [] };

  const beYear = new Date().getFullYear() + 543;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ตารางสอน</h1>
        <p className="text-sm text-muted-foreground">พิมพ์ตารางสอนรายครูและรายห้องเรียน</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">ตารางสอนรายครู</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(teachers ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">ไม่พบข้อมูลครู</p>
            ) : (
              (teachers ?? []).map((t) => (
                <Button key={t.id} asChild variant="ghost" size="sm" className="w-full justify-start">
                  <Link href={`/timetable/teacher-print?teacherId=${t.id}&year=${beYear}&semester=1`}>
                    {t.full_name ?? "-"}
                  </Link>
                </Button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">ตารางเรียนรายห้อง</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              เปิดผ่าน URL:{" "}
              <code className="text-xs bg-muted px-1 rounded">
                /timetable/class-print?grade=ม.1&classroom=1&year={beYear}&semester=1
              </code>
            </p>
            {["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"].map((g) => (
              <Button key={g} asChild variant="ghost" size="sm" className="w-full justify-start">
                <Link href={`/timetable/class-print?grade=${encodeURIComponent(g)}&year=${beYear}&semester=1`}>
                  ตาราง {g}
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

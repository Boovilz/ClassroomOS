import { Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const { data: students } = await supabase
    .from("students")
    .select("id, student_code, full_name, classroom, level, xp, coins")
    .eq("is_active", true)
    .order("xp", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-7 w-7 text-accent" />
        <div>
          <h1 className="text-2xl font-bold">กระดานผู้นำ</h1>
          <p className="text-sm text-muted-foreground">จัดอันดับนักเรียนตาม XP สะสม</p>
        </div>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>อันดับนักเรียนทั้งหมด</CardTitle>
          <CardDescription>เรียงลำดับตาม XP มากไปน้อย คลิกชื่อคอลัมน์เพื่อจัดเรียงใหม่</CardDescription>
        </CardHeader>
        <CardContent>
          <LeaderboardTable data={students ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}

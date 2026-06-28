import { Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LeaderboardView } from "@/components/leaderboard/leaderboard-view";

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const { data: students } = await supabase
    .from("students")
    .select("id, student_code, full_name, classroom, level, xp, coins, avatar_url, profile_picture_url")
    .eq("is_active", true)
    .is("deleted_at", null)
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

      <LeaderboardView data={students ?? []} />
    </div>
  );
}

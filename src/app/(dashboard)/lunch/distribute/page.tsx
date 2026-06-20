import { createClient } from "@/lib/supabase/server";
import { MealDistributionScanner } from "@/components/lunch/meal-distribution-scanner";

export default async function LunchDistributePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id").eq("id", auth.user.id).single()
    : { data: null };

  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, student_code, avatar_url")
    .eq("is_active", true)
    .order("full_name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">แจกอาหารกลางวันด้วย QR</h1>
        <p className="text-sm text-muted-foreground">สแกน QR / กรอกรหัสนักเรียน / เลือกนักเรียนด้วยตนเอง เพื่อบันทึกการรับอาหาร</p>
      </div>
      {profile?.school_id && <MealDistributionScanner schoolId={profile.school_id} students={students ?? []} />}
    </div>
  );
}

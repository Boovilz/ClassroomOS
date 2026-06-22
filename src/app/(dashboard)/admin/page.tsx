import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { School, Users, GraduationCap, UserCheck, Database, Sparkles, Activity, HardDrive } from "lucide-react";
import { UserGrowthChart, LoginStatsChart } from "./admin-charts";
import type { AdminTableStat } from "@/lib/supabase/types";

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string | number; sub?: string }) {
  return (
    <Card className="glass-card">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold leading-tight">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function bucketByDay(rows: { created_at: string }[], days = 14) {
  const buckets = new Map<string, number>();
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of rows) {
    const key = row.created_at.slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets.entries()).map(([date, count]) => ({ date: date.slice(5), count }));
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const since14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: schoolsCount },
    { count: usersCount },
    { count: teachersCount },
    { count: studentsCount },
    { count: activeSessions24h },
    { data: newUsers14d },
    { data: logins14d },
    { count: aiCalls },
    { data: tableStats },
  ] = await Promise.all([
    supabase.from("schools").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("teachers").select("id", { count: "exact", head: true }),
    supabase.from("students").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("login_logs").select("id", { count: "exact", head: true }).gte("created_at", since24h),
    supabase.from("users").select("created_at").gte("created_at", since14d),
    supabase.from("login_logs").select("created_at").gte("created_at", since14d),
    supabase.from("ai_usage_logs").select("id", { count: "exact", head: true }),
    supabase.rpc("admin_table_stats" as never) as unknown as { data: AdminTableStat[] | null },
  ]);

  const totalBytes = Array.isArray(tableStats)
    ? tableStats.reduce((sum, t) => sum + (t.total_bytes ?? 0), 0)
    : 0;
  const dbSizeMb = (totalBytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">แดชบอร์ดผู้ดูแลระบบสูงสุด</h1>
        <p className="text-sm text-muted-foreground">ภาพรวมทั้งระบบ ครอบคลุมทุกโรงเรียนที่ใช้งาน ClassroomOS</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={School} label="โรงเรียนทั้งหมด" value={schoolsCount ?? 0} />
        <StatCard icon={Users} label="ผู้ใช้งานทั้งหมด" value={usersCount ?? 0} />
        <StatCard icon={UserCheck} label="ครูทั้งหมด" value={teachersCount ?? 0} />
        <StatCard icon={GraduationCap} label="นักเรียนทั้งหมด" value={studentsCount ?? 0} />
        <StatCard icon={Activity} label="เซสชันที่ใช้งาน (24 ชม.)" value={activeSessions24h ?? 0} sub="อิงจากการเข้าสู่ระบบล่าสุด" />
        <StatCard icon={Database} label="ขนาดฐานข้อมูล" value={`${dbSizeMb} MB`} sub="pg_total_relation_size รวมทุกตาราง" />
        <StatCard icon={Sparkles} label="การเรียกใช้ AI ทั้งหมด" value={aiCalls ?? 0} sub="Claude API เท่านั้น" />
        <StatCard icon={HardDrive} label="ตารางที่ติดตาม" value={Array.isArray(tableStats) ? tableStats.length : 0} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>ผู้ใช้งานใหม่ (14 วันล่าสุด)</CardTitle>
            <CardDescription>จำนวนบัญชีผู้ใช้ที่สร้างใหม่ต่อวัน</CardDescription>
          </CardHeader>
          <CardContent>
            <UserGrowthChart data={bucketByDay(newUsers14d ?? [])} />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>การเข้าสู่ระบบ (14 วันล่าสุด)</CardTitle>
            <CardDescription>จำนวนครั้งที่เข้าสู่ระบบสำเร็จต่อวัน</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginStatsChart data={bucketByDay(logins14d ?? [])} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardContent className="p-4 text-xs text-muted-foreground">
          หมายเหตุ: ระบบนี้ไม่สามารถแสดงค่าใช้งาน CPU/หน่วยความจำระดับเซิร์ฟเวอร์ได้ เนื่องจากสถาปัตยกรรม Vercel/Supabase ไม่มีเซิร์ฟเวอร์ที่อ่านค่าดังกล่าวได้โดยตรง
          ตัวเลขทั้งหมดข้างต้นคำนวณจากข้อมูลจริงในฐานข้อมูลและบันทึกการใช้งานเท่านั้น ไม่มีตัวเลขที่สร้างขึ้นเอง
        </CardContent>
      </Card>
    </div>
  );
}

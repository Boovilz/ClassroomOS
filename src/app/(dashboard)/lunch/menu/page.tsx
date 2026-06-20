import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { menuCategoryLabel, getWeeklyMenus } from "@/lib/queries/lunch";
import { MenuFormDialog } from "./menu-form-dialog";
import { AiMenuPlanner } from "./ai-menu-planner";

export default async function LunchMenuPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id").eq("id", auth.user.id).single()
    : { data: null };

  const weekStart = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const menus = profile?.school_id ? await getWeeklyMenus(profile.school_id, weekStart) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">จัดการเมนูอาหาร</h1>
          <p className="text-sm text-muted-foreground">สร้างเมนูรายวัน/รายสัปดาห์/รายเดือน พร้อมข้อมูลโภชนาการและต้นทุน</p>
        </div>
        {profile?.school_id && <MenuFormDialog schoolId={profile.school_id} />}
      </div>

      <AiMenuPlanner />

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>เมนูในสัปดาห์นี้</CardTitle>
          <CardDescription>เมนูที่วางแผนไว้ในช่วง 7 วันที่ผ่านมาถึงปัจจุบัน</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {menus.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีเมนูในสัปดาห์นี้</p>
          ) : (
            menus.map((menu) => {
              const items = Array.isArray(menu.menu_items) ? menu.menu_items : [];
              return (
                <div key={menu.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{menu.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(menu.menu_date).toLocaleDateString("th-TH")} · {menu.plan_scope} · สถานะ {menu.status}
                      </p>
                    </div>
                    <Badge variant="secondary">{menu.total_calories ?? 0} kcal</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {items.map((item: { id: string; name: string; category: string }) => (
                      <Badge key={item.id} variant="outline" className="text-xs">
                        {menuCategoryLabel[item.category] ?? item.category}: {item.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

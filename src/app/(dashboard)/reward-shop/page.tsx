import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins } from "lucide-react";
import { RedeemButton } from "./redeem-button";
import { getRedemptionHistory } from "@/lib/queries/behavior";

export default async function RewardShopPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id").eq("id", auth.user.id).single()
    : { data: null };

  const [{ data: items }, { data: students }, history] = await Promise.all([
    supabase.from("reward_shop_items").select("*").eq("is_active", true).order("cost_coins"),
    supabase.from("students").select("id, full_name, coins").eq("is_active", true).order("full_name"),
    getRedemptionHistory(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ร้านค้ารางวัล</h1>
        <p className="text-sm text-muted-foreground">แลกเหรียญที่สะสมได้เป็นของรางวัล</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items && items.length > 0 ? (
          items.map((item) => (
            <Card key={item.id} className="glass-card flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  {item.name}
                  <Badge variant="outline">
                    คงเหลือ {item.stock ?? "∞"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-2">
                <p className="text-sm text-muted-foreground">{item.description ?? "-"}</p>
                <p className="flex items-center gap-1 text-lg font-bold text-accent">
                  <Coins className="h-4 w-4" /> {item.cost_coins.toLocaleString()}
                </p>
              </CardContent>
              <CardFooter>
                {profile?.school_id && (
                  <RedeemButton
                    itemId={item.id}
                    costCoins={item.cost_coins}
                    schoolId={profile.school_id}
                    students={students ?? []}
                  />
                )}
              </CardFooter>
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">ยังไม่มีของรางวัลในร้านค้า</p>
        )}
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>ประวัติการแลกของรางวัล</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {history.length > 0 ? (
            history.map((h) => {
              const student = Array.isArray(h.students) ? h.students[0] : h.students;
              const item = Array.isArray(h.reward_shop_items) ? h.reward_shop_items[0] : h.reward_shop_items;
              return (
                <div key={h.id} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                  <div>
                    <p className="font-medium">{item?.name}</p>
                    <p className="text-muted-foreground">
                      {student?.full_name} ({student?.student_code})
                    </p>
                  </div>
                  <Badge variant="outline">{item?.cost_coins.toLocaleString()} เหรียญ</Badge>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">ยังไม่มีประวัติการแลกของรางวัล</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

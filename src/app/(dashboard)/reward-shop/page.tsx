import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, Package, ShoppingBag, History, ImageIcon } from "lucide-react";
import { RedeemButton } from "./redeem-button";
import { ManageRewardDialog } from "./manage-reward-dialog";
import { DeleteRewardButton } from "./delete-reward-button";
import { getRedemptionHistory } from "@/lib/queries/behavior";

export default async function RewardShopPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id").eq("id", auth.user.id).single()
    : { data: null };

  const schoolId = profile?.school_id ?? null;

  const [{ data: items }, { data: students }, history] = await Promise.all([
    schoolId
      ? supabase.from("reward_shop_items").select("*").eq("school_id", schoolId).order("cost_coins")
      : Promise.resolve({ data: [] }),
    schoolId
      ? supabase.from("students").select("id, full_name, coins").eq("school_id", schoolId).eq("is_active", true).is("deleted_at", null).order("full_name")
      : Promise.resolve({ data: [] }),
    getRedemptionHistory(),
  ]);

  const activeItems = (items ?? []).filter((i) => i.is_active);
  const inactiveItems = (items ?? []).filter((i) => !i.is_active);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" />
            ร้านค้ารางวัล
          </h1>
          <p className="text-sm text-muted-foreground mt-1">แลกเหรียญที่สะสมได้เป็นของรางวัล</p>
        </div>
        {schoolId && (
          <ManageRewardDialog schoolId={schoolId} />
        )}
      </div>

      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/80 via-primary to-primary/60 px-6 py-8 text-white shadow-lg">
        <div className="relative z-10">
          <p className="text-sm font-medium opacity-80">สะสมเหรียญ แลกของรางวัล</p>
          <p className="mt-1 text-3xl font-bold">🛍️ แลกรางวัลได้เลย!</p>
          <p className="mt-2 text-sm opacity-70">รางวัลทั้งหมด {activeItems.length} รายการ</p>
        </div>
        <div className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-12 -right-4 h-64 w-64 rounded-full bg-white/5" />
      </div>

      {/* Active items grid */}
      {activeItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16 text-center text-muted-foreground">
          <Package className="mb-3 h-12 w-12 opacity-30" />
          <p className="font-medium">ยังไม่มีของรางวัลในร้านค้า</p>
          <p className="mt-1 text-sm">เพิ่มรางวัลใหม่โดยกดปุ่ม &quot;เพิ่มรางวัล&quot; ด้านบน</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {activeItems.map((item) => (
            <div key={item.id} className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:shadow-md">
              {/* Image */}
              <div className="relative aspect-square w-full overflow-hidden bg-muted/40">
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="h-full w-full object-contain p-3 transition group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                )}
                {/* Stock badge */}
                {item.stock != null && (
                  <div className="absolute bottom-2 right-2">
                    <Badge variant={item.stock <= 5 ? "destructive" : "secondary"} className="text-xs">
                      เหลือ {item.stock}
                    </Badge>
                  </div>
                )}
                {/* Admin controls */}
                {schoolId && (
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <ManageRewardDialog
                      schoolId={schoolId}
                      item={item}
                      trigger={
                        <button className="flex h-7 w-7 items-center justify-center rounded-full bg-background/90 shadow hover:bg-background">
                          <span className="text-xs">✏️</span>
                        </button>
                      }
                    />
                    <DeleteRewardButton id={item.id} name={item.name} />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex flex-1 flex-col p-3">
                <p className="line-clamp-2 text-sm font-semibold leading-snug">{item.name}</p>
                {item.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                )}
                <div className="mt-2 flex items-center gap-1">
                  <Coins className="h-4 w-4 text-amber-500" />
                  <span className="text-base font-bold text-amber-600 dark:text-amber-400">
                    {item.cost_coins.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground">เหรียญ</span>
                </div>
                <div className="mt-3">
                  {schoolId ? (
                    <RedeemButton
                      itemId={item.id}
                      itemName={item.name}
                      costCoins={item.cost_coins}
                      schoolId={schoolId}
                      students={students ?? []}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">ไม่พบข้อมูลโรงเรียน</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inactive items (admin view) */}
      {inactiveItems.length > 0 && schoolId && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">รายการที่ปิดการแลก ({inactiveItems.length})</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 opacity-50">
            {inactiveItems.map((item) => (
              <div key={item.id} className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
                <div className="relative aspect-square w-full overflow-hidden bg-muted/40">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt={item.name} className="h-full w-full object-contain p-3 grayscale" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-10 w-10 text-muted-foreground/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Badge variant="outline" className="bg-background/80 text-xs">ปิดการแลก</Badge>
                  </div>
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <ManageRewardDialog
                      schoolId={schoolId}
                      item={item}
                      trigger={
                        <button className="flex h-7 w-7 items-center justify-center rounded-full bg-background/90 shadow hover:bg-background">
                          <span className="text-xs">✏️</span>
                        </button>
                      }
                    />
                    <DeleteRewardButton id={item.id} name={item.name} />
                  </div>
                </div>
                <div className="p-3">
                  <p className="line-clamp-1 text-sm font-semibold">{item.name}</p>
                  <div className="mt-1 flex items-center gap-1">
                    <Coins className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{item.cost_coins.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Redemption history */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            ประวัติการแลกรางวัล
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length > 0 ? (
            <div className="divide-y">
              {history.map((h) => {
                const student = Array.isArray(h.students) ? h.students[0] : h.students;
                const rewardItem = Array.isArray(h.reward_shop_items) ? h.reward_shop_items[0] : h.reward_shop_items;
                return (
                  <div key={h.id} className="flex items-center justify-between py-3 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-lg">🎁</div>
                      <div>
                        <p className="font-medium">{rewardItem?.name ?? "-"}</p>
                        <p className="text-xs text-muted-foreground">
                          {student?.full_name} {student?.student_code ? `(${student.student_code})` : ""}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0 gap-1">
                      <Coins className="h-3 w-3 text-amber-500" />
                      {rewardItem?.cost_coins?.toLocaleString() ?? "-"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มีประวัติการแลกรางวัล</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

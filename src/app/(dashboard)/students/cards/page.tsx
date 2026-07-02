import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CardsDesigner } from "./cards-designer";

export default async function StudentCardsPage() {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("school_id")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (!profile?.school_id) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">ออกแบบบัตรนักเรียน</h1>
        <p className="text-muted-foreground">ไม่พบข้อมูลโรงเรียน กรุณาติดต่อผู้ดูแลระบบ</p>
      </div>
    );
  }

  const { data: school } = await supabase
    .from("schools")
    .select("id, name, address")
    .eq("id", profile.school_id)
    .maybeSingle();

  if (!school) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">ออกแบบบัตรนักเรียน</h1>
        <p className="text-muted-foreground">ไม่พบข้อมูลโรงเรียน</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ออกแบบบัตรนักเรียน</h1>
        <p className="text-sm text-muted-foreground">
          ปรับแต่งและพิมพ์บัตรนักเรียนสำหรับ {school.name}
        </p>
      </div>

      <CardsDesigner
        school={{
          id: school.id,
          name: school.name,
          address: school.address ?? null,
        }}
      />
    </div>
  );
}

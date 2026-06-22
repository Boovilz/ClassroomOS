import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/guard";

/** Multi-school admin: super_admin-only list + create. */
export async function GET() {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { supabase } = guard.ctx;

  const { data: schools, error } = await supabase
    .from("schools")
    .select("*, school_quotas(*)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ schools });
}

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { supabase } = guard.ctx;

  const body = await request.json().catch(() => null);
  if (!body?.name) {
    return NextResponse.json({ error: "ต้องระบุชื่อโรงเรียน" }, { status: 400 });
  }

  const { data: school, error } = await supabase
    .from("schools")
    .insert({
      name: body.name,
      name_en: body.name_en ?? null,
      address: body.address ?? null,
      province: body.province ?? null,
      phone: body.phone ?? null,
      plan: body.plan ?? "free",
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ school }, { status: 201 });
}

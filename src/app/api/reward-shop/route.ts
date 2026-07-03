import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/reward-shop?schoolId=&includeInactive=true
export async function GET(request: NextRequest) {
  const schoolId = request.nextUrl.searchParams.get("schoolId");
  const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true";
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  const supabase = await createClient();
  let query = supabase
    .from("reward_shop_items")
    .select("*")
    .eq("school_id", schoolId)
    .order("cost_coins");

  if (!includeInactive) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}

// POST /api/reward-shop  — create
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_id, name, description, cost_coins, stock, image_url, is_active } = body;
    if (!school_id || !name || cost_coins == null) {
      return NextResponse.json({ error: "school_id, name, cost_coins required" }, { status: 400 });
    }
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("reward_shop_items")
      .insert({ school_id, name, description: description ?? null, cost_coins, stock: stock ?? null, image_url: image_url ?? null, is_active: is_active ?? true })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// PATCH /api/reward-shop?id=  — update
export async function PATCH(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const body = await request.json();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("reward_shop_items")
      .update(body)
      .eq("id", id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: data });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// DELETE /api/reward-shop?id=
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const supabase = await createClient();
  const { error } = await supabase.from("reward_shop_items").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

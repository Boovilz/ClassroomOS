import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/calendar/upcoming?days=7&limit=10
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const days  = Number(sp.get("days")  ?? "7");
  const limit = Math.min(Number(sp.get("limit") ?? "10"), 30);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users").select("school_id").eq("id", auth.user.id).single();
  if (!profile?.school_id) return NextResponse.json({ events: [] });

  const now = new Date();
  const future = new Date(now);
  future.setDate(future.getDate() + days);

  const { data } = await supabase
    .from("calendar_events")
    .select("id, title, description, event_type, classroom, starts_at, ends_at")
    .eq("school_id", profile.school_id)
    .gte("starts_at", now.toISOString())
    .lte("starts_at", future.toISOString())
    .order("starts_at", { ascending: true })
    .limit(limit);

  return NextResponse.json({ events: data ?? [] });
}

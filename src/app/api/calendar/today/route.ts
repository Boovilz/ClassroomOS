import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/calendar/today
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users").select("school_id").eq("id", auth.user.id).single();
  if (!profile?.school_id) return NextResponse.json({ events: [] });

  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("calendar_events")
    .select("id, title, description, event_type, classroom, starts_at, ends_at")
    .eq("school_id", profile.school_id)
    .gte("starts_at", today)
    .lte("starts_at", today + "T23:59:59")
    .order("starts_at", { ascending: true });

  return NextResponse.json({ events: data ?? [], date: today });
}

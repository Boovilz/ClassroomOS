import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type EventType = "exam" | "activity" | "parent_meeting" | "field_trip" | "holiday";

// GET /api/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD&type=&view=month
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const from = sp.get("from") ?? "";
  const to   = sp.get("to")   ?? "";
  const type = sp.get("type") ?? "";

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users").select("school_id").eq("id", auth.user.id).single();
  if (!profile?.school_id) return NextResponse.json({ events: [] });

  let q = supabase
    .from("calendar_events")
    .select("id, title, description, event_type, classroom, starts_at, ends_at, created_by, created_at")
    .eq("school_id", profile.school_id)
    .order("starts_at", { ascending: true });

  if (from) q = q.gte("starts_at", from);
  if (to)   q = q.lte("starts_at", to + "T23:59:59");
  if (type) q = q.eq("event_type", type as EventType);

  const { data } = await q;
  return NextResponse.json({ events: data ?? [] });
}

// POST /api/calendar
export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users").select("school_id").eq("id", auth.user.id).single();
  if (!profile?.school_id) return NextResponse.json({ error: "No school" }, { status: 400 });

  const { title, description, event_type, classroom, starts_at, ends_at } = body;
  if (!title || !starts_at || !event_type) {
    return NextResponse.json({ error: "title, starts_at, event_type required" }, { status: 400 });
  }

  const { data, error } = await supabase.from("calendar_events").insert({
    school_id: profile.school_id,
    created_by: auth.user.id,
    title,
    description: description ?? null,
    event_type: event_type as EventType,
    classroom: classroom ?? null,
    starts_at,
    ends_at: ends_at ?? null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data }, { status: 201 });
}

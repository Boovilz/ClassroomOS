import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/notifications?filter=all|unread|read&module=&priority=&search=&cursor=&limit=
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const filter   = sp.get("filter")   ?? "all";
  const mod      = sp.get("module")   ?? "";
  const priority = sp.get("priority") ?? "";
  const search   = sp.get("search")   ?? "";
  const cursor   = sp.get("cursor")   ?? null;
  const limit    = Math.min(Number(sp.get("limit") ?? "20"), 50);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("school_id").eq("id", auth.user.id).single();
  if (!profile?.school_id) return NextResponse.json({ notifications: [], hasMore: false, unreadCount: 0 });

  let q = supabase
    .from("notifications")
    .select("id, title, body, link, priority, category, read_at, created_at, user_id, channel", { count: "exact" })
    .eq("school_id", profile.school_id)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (filter === "unread") q = q.is("read_at", null);
  if (filter === "read")   q = q.not("read_at", "is", null);
  if (mod)      q = q.eq("category", mod);
  if (priority) q = q.eq("priority", priority as "low" | "medium" | "high" | "critical");
  if (cursor)   q = q.lt("created_at", cursor);
  if (search)   q = q.or(`title.ilike.%${search}%,body.ilike.%${search}%`);

  const { data, count } = await q;
  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const notifications = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? notifications[notifications.length - 1].created_at : null;

  // Unread count (separate query, no other filters)
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("school_id", profile.school_id)
    .is("read_at", null);

  return NextResponse.json({ notifications, hasMore, nextCursor, total: count ?? 0, unreadCount: unreadCount ?? 0 });
}

// PATCH /api/notifications  — mark read / mark all read
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("school_id").eq("id", auth.user.id).single();
  if (!profile?.school_id) return NextResponse.json({ error: "No school" }, { status: 400 });

  const now = new Date().toISOString();

  if (body.markAllRead) {
    await supabase.from("notifications").update({ read_at: now }).eq("school_id", profile.school_id).is("read_at", null);
    return NextResponse.json({ success: true });
  }

  if (body.id) {
    const readAt = body.action === "read" ? now : null;
    await supabase.from("notifications").update({ read_at: readAt }).eq("id", body.id).eq("school_id", profile.school_id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid body" }, { status: 400 });
}

// POST /api/notifications — create a notification
export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("school_id").eq("id", auth.user.id).single();
  if (!profile?.school_id) return NextResponse.json({ error: "No school" }, { status: 400 });

  const { user_id, title, body: notifBody, category, priority, link } = body;
  if (!title || !user_id) return NextResponse.json({ error: "title and user_id required" }, { status: 400 });

  const { data, error } = await supabase.from("notifications").insert({
    school_id: profile.school_id,
    user_id,
    title,
    body: notifBody ?? null,
    category: category ?? "system",
    priority: priority ?? "medium",
    link: link ?? null,
    channel: "in_app",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notification: data }, { status: 201 });
}

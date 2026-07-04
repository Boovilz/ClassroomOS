import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface SearchResult {
  id: string;
  category: string;
  title: string;
  subtitle: string | null;
  detail: string | null;
  icon: string;
  color: string;
  href: string;
  score: number;
  created_at?: string;
}

function rankScore(q: string, text: string): number {
  const lower = text.toLowerCase();
  const qLower = q.toLowerCase();
  if (lower === qLower) return 100;
  if (lower.startsWith(qLower)) return 80;
  if (lower.includes(qLower)) return 60;
  return 40;
}

// GET /api/search?q=&filter=all|students|subjects|behavior|health|attendance|finance|documents&limit=
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim();
  const filter = sp.get("filter") ?? "all";
  const limit = Math.min(Number(sp.get("limit") ?? "8"), 20);

  if (!q || q.length < 2) {
    return NextResponse.json({ results: {}, total: 0 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("school_id, role")
    .eq("id", auth.user.id)
    .single();
  if (!profile?.school_id) return NextResponse.json({ results: {}, total: 0 });

  const { school_id } = profile;
  const ilike = `%${q}%`;

  const searches: Record<string, Promise<SearchResult[]>> = {};

  const shouldSearch = (cat: string) => filter === "all" || filter === cat;

  // ── Students ──────────────────────────────────────────────────────────────
  if (shouldSearch("students")) {
    searches.students = (async () => {
      const { data } = await supabase
        .from("students")
        .select("id, full_name, student_code, grade, classroom, nickname, citizen_id")
        .eq("school_id", school_id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .or(
          `full_name.ilike.${ilike},student_code.ilike.${ilike},nickname.ilike.${ilike},citizen_id.ilike.${ilike}`
        )
        .limit(limit);
      return (data ?? []).map((s) => ({
        id: s.id,
        category: "students",
        title: s.full_name ?? "",
        subtitle: `${s.grade ?? ""} ${s.classroom ?? ""}`.trim() || null,
        detail: s.student_code ? `รหัส: ${s.student_code}` : null,
        icon: "👤",
        color: "blue",
        href: `/students/${s.id}`,
        score: rankScore(q, s.full_name ?? ""),
      }));
    })();
  }

  // ── Subjects ──────────────────────────────────────────────────────────────
  if (shouldSearch("subjects")) {
    searches.subjects = (async () => {
      const { data } = await supabase
        .from("subjects")
        .select("id, name, code, grade")
        .eq("school_id", school_id)
        .or(`name.ilike.${ilike},code.ilike.${ilike}`)
        .limit(limit);
      return (data ?? []).map((s) => ({
        id: s.id,
        category: "subjects",
        title: s.name ?? "",
        subtitle: s.code ? `รหัสวิชา: ${s.code}` : null,
        detail: s.grade ? `ชั้น ${s.grade}` : null,
        icon: "📚",
        color: "violet",
        href: `/academic`,
        score: rankScore(q, s.name ?? ""),
      }));
    })();
  }

  // ── Behavior ──────────────────────────────────────────────────────────────
  if (shouldSearch("behavior")) {
    searches.behavior = (async () => {
      const { data } = await supabase
        .from("behavior_records")
        .select("id, title, category, points, occurred_at, student_id, students!inner(full_name, grade, classroom)")
        .eq("students.school_id", school_id)
        .or(`title.ilike.${ilike}`)
        .order("occurred_at", { ascending: false })
        .limit(limit);
      type BRow = typeof data extends (infer R)[] | null ? R : never;
      return (data ?? []).map((r: BRow) => {
        const s = (r as { students?: { full_name?: string; grade?: string; classroom?: string } }).students;
        return {
          id: r.id,
          category: "behavior",
          title: r.title ?? "",
          subtitle: s?.full_name ?? null,
          detail: `${(r as { category?: string }).category === "positive" ? "+" : ""}${(r as { points?: number }).points ?? 0} คะแนน`,
          icon: (r as { category?: string }).category === "positive" ? "⭐" : "⚠️",
          color: (r as { category?: string }).category === "positive" ? "yellow" : "red",
          href: `/behavior`,
          score: rankScore(q, r.title ?? ""),
        };
      });
    })();
  }

  // ── Health ────────────────────────────────────────────────────────────────
  if (shouldSearch("health")) {
    searches.health = (async () => {
      const { data } = await supabase
        .from("health_records")
        .select("id, student_id, allergies, chronic_conditions, recorded_at, students!inner(full_name, grade, classroom)")
        .eq("students.school_id", school_id)
        .or(`allergies.ilike.${ilike},chronic_conditions.ilike.${ilike}`)
        .order("recorded_at", { ascending: false })
        .limit(limit);
      type HRow = typeof data extends (infer R)[] | null ? R : never;
      return (data ?? []).map((r: HRow) => {
        const s = (r as { students?: { full_name?: string; grade?: string; classroom?: string } }).students;
        return {
          id: r.id,
          category: "health",
          title: s?.full_name ?? "บันทึกสุขภาพ",
          subtitle: (r as { allergies?: string }).allergies ? `แพ้: ${(r as { allergies?: string }).allergies}` : null,
          detail: (r as { chronic_conditions?: string }).chronic_conditions ?? null,
          icon: "🏥",
          color: "green",
          href: `/health`,
          score: 40,
        };
      });
    })();
  }

  // ── Attendance — search by student name ──────────────────────────────────
  if (shouldSearch("attendance")) {
    searches.attendance = (async () => {
      // Search students matching query, then fetch their latest attendance status
      const { data: studs } = await supabase
        .from("students")
        .select("id, full_name, grade, classroom")
        .eq("school_id", school_id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .or(`full_name.ilike.${ilike},student_code.ilike.${ilike}`)
        .limit(limit);
      if (!studs?.length) return [];
      const ids = studs.map(s => s.id);
      const { data: latest } = await supabase
        .from("attendance")
        .select("student_id, date, status")
        .in("student_id", ids)
        .order("date", { ascending: false })
        .limit(ids.length * 3);
      const lastMap = new Map<string, { date: string; status: string }>();
      for (const a of latest ?? []) {
        if (!lastMap.has(a.student_id)) lastMap.set(a.student_id, { date: a.date, status: a.status });
      }
      const STATUS_LABEL: Record<string, string> = { present: "มาเรียน", late: "สาย", sick: "ป่วย", personal_leave: "ลากิจ", absent: "ขาด" };
      return studs.map(s => {
        const att = lastMap.get(s.id);
        return {
          id: s.id,
          category: "attendance",
          title: s.full_name ?? "",
          subtitle: att ? `${att.date} · ${STATUS_LABEL[att.status] ?? att.status}` : "ไม่มีบันทึก",
          detail: `${s.grade ?? ""} ${s.classroom ?? ""}`.trim() || null,
          icon: "📅",
          color: "teal",
          href: `/attendance`,
          score: rankScore(q, s.full_name ?? ""),
        };
      });
    })();
  }

  // ── Finance (Savings) — search by student name ────────────────────────────
  if (shouldSearch("finance")) {
    searches.finance = (async () => {
      const { data: studs } = await supabase
        .from("students")
        .select("id, full_name, grade, classroom")
        .eq("school_id", school_id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .or(`full_name.ilike.${ilike},student_code.ilike.${ilike}`)
        .limit(limit);
      if (!studs?.length) return [];
      const ids = studs.map(s => s.id);
      const { data: txns } = await supabase
        .from("finance_transactions")
        .select("student_id, type, amount, occurred_at")
        .in("student_id", ids)
        .order("occurred_at", { ascending: false })
        .limit(ids.length * 3);
      const lastTxn = new Map<string, { type: string; amount: number }>();
      for (const t of txns ?? []) {
        if (t.student_id && !lastTxn.has(t.student_id)) {
          lastTxn.set(t.student_id, { type: t.type ?? "", amount: Number(t.amount) });
        }
      }
      return studs.map(s => {
        const txn = lastTxn.get(s.id);
        return {
          id: s.id,
          category: "finance",
          title: s.full_name ?? "",
          subtitle: txn ? `${txn.type === "deposit" ? "+" : "-"}฿${txn.amount.toLocaleString()}` : null,
          detail: `${s.grade ?? ""} ${s.classroom ?? ""}`.trim() || null,
          icon: "💰",
          color: "emerald",
          href: `/finance`,
          score: rankScore(q, s.full_name ?? ""),
        };
      });
    })();
  }

  // ── Home Visits ───────────────────────────────────────────────────────────
  if (shouldSearch("home_visits")) {
    searches.home_visits = (async () => {
      type HVRow = { id: string; student_id: string; visit_date: string | null; outcome: string | null; students: { full_name: string | null } | null };
      const { data } = await supabase
        .from("home_visits")
        .select("id, student_id, visit_date, outcome, students!inner(full_name)")
        .eq("students.school_id", school_id)
        .or(`outcome.ilike.${ilike}`)
        .order("visit_date", { ascending: false })
        .limit(limit) as { data: HVRow[] | null };
      return (data ?? []).map((r) => {
        const s = r.students;
        return {
          id: r.id,
          category: "home_visits",
          title: s?.full_name ?? "บันทึกเยี่ยมบ้าน",
          subtitle: r.visit_date ?? null,
          detail: r.outcome ?? null,
          icon: "🏠",
          color: "orange",
          href: `/home-visits`,
          score: 40,
        };
      });
    })();
  }

  // ── Teachers / Users ──────────────────────────────────────────────────────
  if (shouldSearch("teachers")) {
    searches.teachers = (async () => {
      const { data } = await supabase
        .from("users")
        .select("id, full_name, role, email")
        .eq("school_id", school_id)
        .eq("is_active", true)
        .or(`full_name.ilike.${ilike},email.ilike.${ilike}`)
        .limit(limit);
      return (data ?? []).map((u) => ({
        id: u.id,
        category: "teachers",
        title: u.full_name ?? u.email ?? "",
        subtitle: u.role ?? null,
        detail: u.email ?? null,
        icon: "👩‍🏫",
        color: "purple",
        href: `/settings`,
        score: rankScore(q, u.full_name ?? ""),
      }));
    })();
  }

  // ── Resolve all ───────────────────────────────────────────────────────────
  const resolved = await Promise.allSettled(Object.entries(searches).map(async ([cat, p]) => {
    const items = await p;
    return [cat, items] as [string, SearchResult[]];
  }));

  const results: Record<string, SearchResult[]> = {};
  let total = 0;
  for (const r of resolved) {
    if (r.status === "fulfilled") {
      const [cat, items] = r.value;
      if (items.length > 0) {
        results[cat] = items.sort((a, b) => b.score - a.score);
        total += items.length;
      }
    }
  }

  return NextResponse.json({ results, total });
}

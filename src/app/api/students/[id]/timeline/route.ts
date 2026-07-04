import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface TimelineEvent {
  id: string;
  module: string;
  event_type: string;
  event_date: string;
  title: string;
  description: string | null;
  icon: string;
  color: string;
  created_by: string | null;
  meta: Record<string, unknown>;
  source_url: string | null;
}

const MODULE_META: Record<string, { color: string; icon: string }> = {
  attendance_present:   { color: "green",   icon: "✅" },
  attendance_absent:    { color: "green",   icon: "❌" },
  attendance_late:      { color: "green",   icon: "⏰" },
  attendance_leave:     { color: "green",   icon: "🏠" },
  grade:                { color: "blue",    icon: "📝" },
  behavior_positive:    { color: "orange",  icon: "⭐" },
  behavior_negative:    { color: "orange",  icon: "⚠️" },
  coin:                 { color: "orange",  icon: "🪙" },
  reward:               { color: "orange",  icon: "🎁" },
  health:               { color: "red",     icon: "❤️" },
  home_visit:           { color: "purple",  icon: "🏠" },
  savings_deposit:      { color: "emerald", icon: "💰" },
  savings_withdrawal:   { color: "emerald", icon: "💸" },
  lunch:                { color: "yellow",  icon: "🍱" },
  eq:                   { color: "pink",    icon: "🧠" },
  sdq:                  { color: "gray",    icon: "📋" },
  certificate:          { color: "amber",   icon: "🏆" },
  document:             { color: "sky",     icon: "📄" },
};

function meta(type: string) {
  return MODULE_META[type] ?? { color: "gray", icon: "📌" };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sp = request.nextUrl.searchParams;
  const filterModule = sp.get("module") ?? "all";
  const search  = sp.get("search")   ?? "";
  const dateFrom = sp.get("dateFrom") ?? null;
  const dateTo   = sp.get("dateTo")   ?? null;
  const cursor   = sp.get("cursor")   ?? null;   // ISO date, events before this
  const limit    = 20;

  const supabase = await createClient();

  // Helper to apply date filters to a query
  // eslint-disable-next-line
  function applyDateFilter(q: ReturnType<typeof supabase.from>, col: string) {
    if (cursor)   q = q.lt(col, cursor);
    if (dateFrom) q = q.gte(col, dateFrom);
    if (dateTo)   q = q.lte(col, dateTo);
    return q;
  }

  const events: TimelineEvent[] = [];

  // ── ATTENDANCE ──────────────────────────────────────────────
  if (filterModule === "all" || filterModule === "attendance") {
    let q = supabase.from("attendance").select("id, date, status, check_in_time, note").eq("student_id", id).order("date", { ascending: false }).limit(50);
    q = applyDateFilter(q, "date");
    const { data } = await q;
    for (const r of data ?? []) {
      const typeMap: Record<string, string> = { present: "attendance_present", absent: "attendance_absent", late: "attendance_late", sick: "attendance_leave", personal_leave: "attendance_leave" };
      const t = typeMap[r.status] ?? "attendance_present";
      const labelMap: Record<string, string> = { present: "มาเรียน", absent: "ขาดเรียน", late: "มาสาย", sick: "ลาป่วย", personal_leave: "ลากิจ" };
      events.push({ id: `att-${r.id}`, module: "attendance", event_type: r.status, event_date: r.date, title: labelMap[r.status] ?? r.status, description: r.note ?? null, icon: meta(t).icon, color: meta(t).color, created_by: null, meta: { check_in_time: r.check_in_time }, source_url: null });
    }
  }

  // ── BEHAVIOR ─────────────────────────────────────────────────
  if (filterModule === "all" || filterModule === "behavior") {
    let q = supabase.from("behavior_records").select("id, title, points, category, occurred_at, description, recorded_by").eq("student_id", id).order("occurred_at", { ascending: false }).limit(50);
    q = applyDateFilter(q, "occurred_at");
    const { data } = await q;
    for (const r of data ?? []) {
      const t = r.category === "positive" ? "behavior_positive" : "behavior_negative";
      events.push({ id: `beh-${r.id}`, module: "behavior", event_type: r.category, event_date: r.occurred_at, title: r.title, description: r.description ?? (r.points > 0 ? `+${r.points} คะแนน` : `${r.points} คะแนน`), icon: meta(t).icon, color: meta(t).color, created_by: r.recorded_by ?? null, meta: { points: r.points, category: r.category }, source_url: null });
    }
  }

  // ── COIN TRANSACTIONS ────────────────────────────────────────
  if (filterModule === "all" || filterModule === "behavior") {
    let q = supabase.from("coin_transactions").select("id, amount, reason, created_at, reward_item_id").eq("student_id", id).order("created_at", { ascending: false }).limit(50);
    q = applyDateFilter(q, "created_at");
    const { data } = await q;
    for (const r of data ?? []) {
      const isRedeem = r.amount < 0;
      const t = isRedeem ? "reward" : "coin";
      events.push({ id: `coin-${r.id}`, module: "behavior", event_type: isRedeem ? "redeem" : "coin", event_date: r.created_at, title: isRedeem ? `แลกของรางวัล` : `ได้รับเหรียญ`, description: r.reason ?? null, icon: meta(t).icon, color: meta(t).color, created_by: null, meta: { amount: r.amount, reward_item_id: r.reward_item_id }, source_url: isRedeem ? "/reward-shop" : null });
    }
  }

  // ── GRADES / SCORES ──────────────────────────────────────────
  if (filterModule === "all" || filterModule === "grade") {
    let q = supabase.from("scores").select("id, score, max_score, term, component, created_at, subjects(name, code)").eq("student_id", id).order("created_at", { ascending: false }).limit(50);
    q = applyDateFilter(q, "created_at");
    const { data } = await q;
    for (const r of data ?? []) {
      const subj = Array.isArray(r.subjects) ? r.subjects[0] : r.subjects;
      const pct = r.max_score > 0 ? Math.round((r.score / r.max_score) * 100) : 0;
      events.push({ id: `score-${r.id}`, module: "grade", event_type: r.component ?? "score", event_date: r.created_at, title: `คะแนน${subj?.name ?? ""}`, description: `${r.score}/${r.max_score} (${pct}%)`, icon: meta("grade").icon, color: meta("grade").color, created_by: null, meta: { score: r.score, max_score: r.max_score, pct, term: r.term, subject: subj?.name, subject_code: subj?.code }, source_url: null });
    }
  }

  // ── HEALTH ───────────────────────────────────────────────────
  if (filterModule === "all" || filterModule === "health") {
    let q = supabase.from("health_records").select("id, recorded_at, height_cm, weight_kg, bmi, nutrition_status, remarks, recorded_by").eq("student_id", id).order("recorded_at", { ascending: false }).limit(30);
    q = applyDateFilter(q, "recorded_at");
    const { data } = await q;
    for (const r of data ?? []) {
      const bmiStr = r.bmi ? ` (BMI ${Number(r.bmi).toFixed(1)})` : "";
      events.push({ id: `health-${r.id}`, module: "health", event_type: "measurement", event_date: r.recorded_at, title: `บันทึกสุขภาพ${bmiStr}`, description: r.remarks ?? (r.nutrition_status ? `สถานะ: ${r.nutrition_status}` : null), icon: meta("health").icon, color: meta("health").color, created_by: r.recorded_by ?? null, meta: { height_cm: r.height_cm, weight_kg: r.weight_kg, bmi: r.bmi, nutrition_status: r.nutrition_status }, source_url: null });
    }
  }

  // ── HOME VISITS ──────────────────────────────────────────────
  if (filterModule === "all" || filterModule === "home_visit") {
    let q = supabase.from("home_visits").select("id, visit_date, visit_type, status, purpose, summary, outcome").eq("student_id", id).order("visit_date", { ascending: false }).limit(30);
    q = applyDateFilter(q, "visit_date");
    const { data } = await q;
    for (const r of data ?? []) {
      const typeLabel: Record<string, string> = { routine: "เยี่ยมบ้านตามปกติ", follow_up: "ติดตามผล", emergency: "เร่งด่วน", poverty_screening: "คัดกรองยากจน", welfare_check: "ตรวจสวัสดิภาพ" };
      events.push({ id: `hv-${r.id}`, module: "home_visit", event_type: r.visit_type ?? "visit", event_date: r.visit_date, title: typeLabel[r.visit_type] ?? "เยี่ยมบ้าน", description: r.summary ?? r.purpose ?? null, icon: meta("home_visit").icon, color: meta("home_visit").color, created_by: null, meta: { status: r.status, outcome: r.outcome }, source_url: `/home-visits/${r.id}` });
    }
  }

  // ── SAVINGS (Finance) ────────────────────────────────────────
  if (filterModule === "all" || filterModule === "savings") {
    let q = supabase.from("finance_transactions").select("id, type, category, amount, balance_after, description, occurred_at").eq("student_id", id).order("occurred_at", { ascending: false }).limit(50);
    q = applyDateFilter(q, "occurred_at");
    const { data } = await q;
    for (const r of data ?? []) {
      const isDeposit = r.type === "income";
      const t = isDeposit ? "savings_deposit" : "savings_withdrawal";
      events.push({ id: `fin-${r.id}`, module: "savings", event_type: r.type, event_date: r.occurred_at, title: r.category ?? (isDeposit ? "ฝากเงิน" : "ถอนเงิน"), description: r.description ?? (r.balance_after != null ? `ยอดคงเหลือ ฿${Number(r.balance_after).toLocaleString()}` : null), icon: meta(t).icon, color: meta(t).color, created_by: null, meta: { amount: r.amount, balance_after: r.balance_after }, source_url: null });
    }
  }

  // ── LUNCH ────────────────────────────────────────────────────
  if (filterModule === "all" || filterModule === "lunch") {
    let q = supabase.from("meal_records").select("id, date, meal_type, status, notes").eq("student_id", id).order("date", { ascending: false }).limit(50);
    q = applyDateFilter(q, "date");
    const { data } = await q;
    for (const r of data ?? []) {
      const mealLabel: Record<string, string> = { breakfast: "อาหารเช้า", lunch: "อาหารกลางวัน", snack: "อาหารว่าง" };
      const statusLabel: Record<string, string> = { served: "รับอาหารแล้ว", absent: "ไม่ได้รับ", special_diet: "อาหารพิเศษ" };
      events.push({ id: `meal-${r.id}`, module: "lunch", event_type: r.meal_type, event_date: r.date, title: mealLabel[r.meal_type] ?? "รับอาหาร", description: statusLabel[r.status] ?? r.status, icon: meta("lunch").icon, color: meta("lunch").color, created_by: null, meta: { meal_type: r.meal_type, status: r.status, notes: r.notes }, source_url: null });
    }
  }

  // ── EQ ───────────────────────────────────────────────────────
  if (filterModule === "all" || filterModule === "eq") {
    let q = supabase.from("eq_assessments").select("id, created_at, self_awareness, self_regulation, motivation, empathy, social_skills, notes").eq("student_id", id).order("created_at", { ascending: false }).limit(20);
    q = applyDateFilter(q, "created_at");
    const { data: eqData } = await (q as ReturnType<typeof supabase.from>);
    type EqRow = { id: string; created_at: string; self_awareness: number; self_regulation: number; motivation: number; empathy: number; social_skills: number; notes: string | null };
    for (const r of (eqData ?? []) as EqRow[]) {
      const total = (r.self_awareness ?? 0) + (r.self_regulation ?? 0) + (r.motivation ?? 0) + (r.empathy ?? 0) + (r.social_skills ?? 0);
      const level = total <= 10 ? "ต่ำ" : total <= 15 ? "ปานกลาง" : total <= 20 ? "สูง" : "ดีเยี่ยม";
      events.push({ id: `eq-${r.id}`, module: "eq", event_type: "assessment", event_date: r.created_at, title: `ประเมิน EQ — ระดับ${level}`, description: r.notes ?? `คะแนนรวม ${total}/25`, icon: meta("eq").icon, color: meta("eq").color, created_by: null, meta: { total, self_awareness: r.self_awareness, self_regulation: r.self_regulation, motivation: r.motivation, empathy: r.empathy, social_skills: r.social_skills }, source_url: `/students/${id}/eq` });
    }
  }

  // ── SDQ ──────────────────────────────────────────────────────
  if (filterModule === "all" || filterModule === "sdq") {
    let q = supabase.from("sdq_assessments").select("id, assessment_date, assessment_type, status, total_difficulties_score, risk_level, created_at").eq("student_id", id).order("assessment_date", { ascending: false }).limit(20);
    q = applyDateFilter(q, "assessment_date");
    const { data } = await q;
    for (const r of data ?? []) {
      const typeLabel: Record<string, string> = { teacher: "ครู", parent: "ผู้ปกครอง", student: "นักเรียน" };
      const riskLabel: Record<string, string> = { normal: "ปกติ", borderline: "เฝ้าระวัง", at_risk: "มีความเสี่ยง", high_risk: "เสี่ยงสูง", critical: "วิกฤต" };
      events.push({ id: `sdq-${r.id}`, module: "sdq", event_type: r.assessment_type, event_date: r.assessment_date ?? r.created_at, title: `ประเมิน SDQ (${typeLabel[r.assessment_type] ?? r.assessment_type})`, description: r.risk_level ? `ระดับ: ${riskLabel[r.risk_level] ?? r.risk_level}` : null, icon: meta("sdq").icon, color: meta("sdq").color, created_by: null, meta: { total_score: r.total_difficulties_score, risk_level: r.risk_level, status: r.status }, source_url: `/sdq` });
    }
  }

  // ── CERTIFICATES ─────────────────────────────────────────────
  if (filterModule === "all" || filterModule === "certificate") {
    let q = supabase.from("academic_certificates").select("id, title, description, issued_at, issued_by").eq("student_id", id).order("issued_at", { ascending: false }).limit(20);
    q = applyDateFilter(q, "issued_at");
    const { data } = await q;
    for (const r of data ?? []) {
      events.push({ id: `cert-${r.id}`, module: "certificate", event_type: "issued", event_date: r.issued_at, title: `ได้รับเกียรติบัตร: ${r.title}`, description: r.description ?? null, icon: meta("certificate").icon, color: meta("certificate").color, created_by: r.issued_by ?? null, meta: { title: r.title }, source_url: `/academic/certificates/${r.id}` });
    }
  }

  // ── DOCUMENTS ────────────────────────────────────────────────
  if (filterModule === "all" || filterModule === "document") {
    let q = supabase.from("documents").select("id, title, category, created_at").eq("student_id", id).order("created_at", { ascending: false }).limit(20);
    q = applyDateFilter(q, "created_at");
    const { data } = await q;
    for (const r of data ?? []) {
      events.push({ id: `doc-${r.id}`, module: "document", event_type: r.category ?? "document", event_date: r.created_at, title: `สร้างเอกสาร: ${r.title}`, description: r.category ?? null, icon: meta("document").icon, color: meta("document").color, created_by: null, meta: { category: r.category }, source_url: "/documents" });
    }
  }

  // ── Merge, sort, filter, paginate ────────────────────────────
  let result = events.sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());

  if (search) {
    const s = search.toLowerCase();
    result = result.filter((e) => e.title.toLowerCase().includes(s) || (e.description ?? "").toLowerCase().includes(s));
  }

  const paged = result.slice(0, limit);
  const hasMore = result.length > limit;
  const nextCursor = hasMore ? paged[paged.length - 1].event_date : null;

  return NextResponse.json({ events: paged, hasMore, nextCursor });
}

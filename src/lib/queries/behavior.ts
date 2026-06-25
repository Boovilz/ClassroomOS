import { createClient } from "@/lib/supabase/server";
import { getLevelInfo, getClassroomTier } from "@/lib/gamification/levels";

// ============================================================================
// Behavior dashboard
// ============================================================================

export interface BehaviorDashboardStats {
  todayPositive: number;
  todayNegative: number;
  weekPositive: number;
  weekNegative: number;
  monthPositive: number;
  monthNegative: number;
  averageScore: number;
  riskStudents: number;
  excellentStudents: number;
}

export async function getBehaviorDashboard(): Promise<BehaviorDashboardStats> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: records } = await supabase
    .from("behavior_records")
    .select("category, points, occurred_at")
    .gte("occurred_at", since);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const stats: BehaviorDashboardStats = {
    todayPositive: 0,
    todayNegative: 0,
    weekPositive: 0,
    weekNegative: 0,
    monthPositive: 0,
    monthNegative: 0,
    averageScore: 0,
    riskStudents: 0,
    excellentStudents: 0,
  };

  for (const r of records ?? []) {
    const occurred = new Date(r.occurred_at);
    const isPositive = r.category === "positive";
    if (occurred >= startOfDay) {
      if (isPositive) stats.todayPositive += r.points;
      else stats.todayNegative += r.points;
    }
    if (occurred >= startOfWeek) {
      if (isPositive) stats.weekPositive += r.points;
      else stats.weekNegative += r.points;
    }
    if (isPositive) stats.monthPositive += r.points;
    else stats.monthNegative += r.points;
  }

  const { data: students } = await supabase.from("students").select("behavior_score").eq("is_active", true).is("deleted_at", null);
  if (students && students.length > 0) {
    const scores = students.map((s) => (s as { behavior_score?: number }).behavior_score ?? 100);
    stats.averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    stats.riskStudents = scores.filter((s) => s < 60).length;
    stats.excellentStudents = scores.filter((s) => s >= 150).length;
  }

  return stats;
}

// ============================================================================
// Behavior categories (point catalog)
// ============================================================================

export async function getBehaviorCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("behavior_categories")
    .select("*")
    .order("category")
    .order("title");
  return data ?? [];
}

// ============================================================================
// Add / deduct behavior points
// ============================================================================

const BEHAVIOR_SCORE_MIN = 0;
const BEHAVIOR_SCORE_MAX = 200;

export async function recordBehaviorPoints(params: {
  schoolId: string;
  studentId: string;
  category: "positive" | "negative";
  title: string;
  points: number;
  description?: string;
  evidenceUrl?: string;
  recordedBy?: string;
}) {
  const supabase = await createClient();
  const signedPoints = params.category === "positive" ? Math.abs(params.points) : -Math.abs(params.points);

  const { data: record, error } = await supabase
    .from("behavior_records")
    .insert({
      school_id: params.schoolId,
      student_id: params.studentId,
      category: params.category,
      title: params.title,
      description: params.description ?? null,
      evidence_url: params.evidenceUrl ?? null,
      points: signedPoints,
      recorded_by: params.recordedBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  await supabase.from("xp_transactions").insert({
    school_id: params.schoolId,
    student_id: params.studentId,
    amount: signedPoints,
    reason: params.title,
    related_behavior_record_id: record.id,
  });

  if (signedPoints > 0) {
    await supabase.from("coin_transactions").insert({
      school_id: params.schoolId,
      student_id: params.studentId,
      amount: Math.max(1, Math.round(signedPoints / 5)),
      reason: `รางวัลพฤติกรรม: ${params.title}`,
    });
  }

  const { data: student } = await supabase
    .from("students")
    .select("xp, coins, behavior_score, full_name, user_id")
    .eq("id", params.studentId)
    .single();
  if (!student) return record;

  const beforeLevel = getLevelInfo(student.xp).level;
  const newXp = Math.max(0, student.xp + signedPoints);
  const newCoins = signedPoints > 0 ? student.coins + Math.max(1, Math.round(signedPoints / 5)) : student.coins;
  const currentScore = (student as { behavior_score?: number }).behavior_score ?? 100;
  const newScore = Math.min(BEHAVIOR_SCORE_MAX, Math.max(BEHAVIOR_SCORE_MIN, currentScore + signedPoints));
  const afterLevel = getLevelInfo(newXp).level;

  await supabase
    .from("students")
    .update({ xp: newXp, coins: newCoins, behavior_score: newScore, level: afterLevel })
    .eq("id", params.studentId);

  if (student.user_id) {
    await supabase.from("notifications").insert({
      school_id: params.schoolId,
      user_id: student.user_id,
      title: signedPoints > 0 ? "ได้รับคะแนนพฤติกรรม" : "ถูกหักคะแนนพฤติกรรม",
      body: `${params.title} (${signedPoints > 0 ? "+" : ""}${signedPoints} คะแนน)`,
      category: "behavior",
      priority: "low",
    });
    if (afterLevel > beforeLevel) {
      const levelInfo = getLevelInfo(newXp);
      await supabase.from("notifications").insert({
        school_id: params.schoolId,
        user_id: student.user_id,
        title: "เลเวลอัพ!",
        body: `${student.full_name} เลื่อนระดับเป็น Level ${levelInfo.level} (${levelInfo.name})`,
        category: "level_up",
        priority: "medium",
      });
    }
  }

  await checkAndAwardXpAchievements(params.studentId, params.schoolId, newXp);

  return record;
}

async function checkAndAwardXpAchievements(studentId: string, schoolId: string, xp: number) {
  const supabase = await createClient();
  const milestones: { code: string; min: number }[] = [
    { code: "xp_100", min: 100 },
    { code: "xp_500", min: 500 },
    { code: "xp_1000", min: 1000 },
  ];
  const eligible = milestones.filter((m) => xp >= m.min).map((m) => m.code);
  if (eligible.length === 0) return;

  const { data: achievements } = await supabase.from("achievements").select("id, code").in("code", eligible);
  for (const a of achievements ?? []) {
    const { data: existing } = await supabase
      .from("student_achievements")
      .select("id")
      .eq("student_id", studentId)
      .eq("achievement_id", a.id)
      .maybeSingle();
    if (existing) continue;
    await supabase.from("student_achievements").insert({ student_id: studentId, achievement_id: a.id });
    const { data: student } = await supabase.from("students").select("user_id").eq("id", studentId).single();
    if (student?.user_id) {
      await supabase.from("notifications").insert({
        school_id: schoolId,
        user_id: student.user_id,
        title: "ได้รับเหรียญตราใหม่!",
        body: "คุณปลดล็อกเหรียญตราใหม่แล้ว",
        category: "badge",
        priority: "medium",
      });
    }
  }
}

// ============================================================================
// Behavior history
// ============================================================================

export async function getBehaviorHistory(studentId: string, limit = 50) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("behavior_records")
    .select("id, title, category, points, description, evidence_url, occurred_at")
    .eq("student_id", studentId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

// ============================================================================
// Leaderboard (by category)
// ============================================================================

export type LeaderboardCategory = "xp" | "coins" | "behavior" | "attendance";

export async function getLeaderboard(category: LeaderboardCategory, limit = 10) {
  const supabase = await createClient();

  if (category === "attendance") {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: students } = await supabase
      .from("students")
      .select("id, full_name, student_code, avatar_url, level, xp, coins")
      .eq("is_active", true)
      .is("deleted_at", null);
    if (!students) return [];
    const { data: attendance } = await supabase
      .from("attendance")
      .select("student_id, status")
      .gte("date", since.slice(0, 10));
    const rateMap = new Map<string, { present: number; total: number }>();
    for (const a of attendance ?? []) {
      const cur = rateMap.get(a.student_id) ?? { present: 0, total: 0 };
      cur.total += 1;
      if (a.status === "present") cur.present += 1;
      rateMap.set(a.student_id, cur);
    }
    return students
      .map((s) => {
        const rate = rateMap.get(s.id);
        const attendanceRate = rate && rate.total > 0 ? Math.round((rate.present / rate.total) * 100) : 0;
        return { ...s, metric: attendanceRate };
      })
      .sort((a, b) => b.metric - a.metric)
      .slice(0, limit);
  }

  const sortColumn = category === "xp" ? "xp" : category === "coins" ? "coins" : "behavior_score";
  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, student_code, avatar_url, level, xp, coins, behavior_score")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order(sortColumn, { ascending: false })
    .limit(limit);

  return (students ?? []).map((s) => ({
    ...s,
    metric: sortColumn === "xp" ? s.xp : sortColumn === "coins" ? s.coins : s.behavior_score,
  }));
}

// ============================================================================
// XP / Coin ledgers
// ============================================================================

export async function getStudentXpTransactions(studentId: string, limit = 30) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("xp_transactions")
    .select("id, amount, reason, created_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getStudentCoinTransactions(studentId: string, limit = 30) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("coin_transactions")
    .select("id, amount, reason, created_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

// ============================================================================
// Badges
// ============================================================================

export async function getBadges() {
  const supabase = await createClient();
  const { data } = await supabase.from("achievements").select("*").order("title");
  return data ?? [];
}

export async function getStudentBadges(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_achievements")
    .select("awarded_at, achievements(id, title, description, icon, xp_reward, coin_reward)")
    .eq("student_id", studentId)
    .order("awarded_at", { ascending: false });
  return data ?? [];
}

// ============================================================================
// Quests
// ============================================================================

export async function getQuests(schoolId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("quests")
    .select("*")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .order("period");
  return data ?? [];
}

export async function getStudentQuestProgress(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_quests")
    .select("*, quests(title, description, period, target_count, xp_reward, coin_reward)")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function completeQuest(studentId: string, questId: string, schoolId: string) {
  const supabase = await createClient();
  const { data: quest } = await supabase.from("quests").select("*").eq("id", questId).single();
  if (!quest) throw new Error("Quest not found");

  const periodStart = new Date().toISOString().slice(0, 10);
  await supabase
    .from("student_quests")
    .upsert(
      { student_id: studentId, quest_id: questId, progress_count: quest.target_count, completed_at: new Date().toISOString(), period_start: periodStart },
      { onConflict: "student_id,quest_id,period_start" }
    );

  if (quest.xp_reward > 0 || quest.coin_reward > 0) {
    const { data: student } = await supabase.from("students").select("xp, coins, user_id").eq("id", studentId).single();
    if (student) {
      await supabase
        .from("students")
        .update({ xp: student.xp + quest.xp_reward, coins: student.coins + quest.coin_reward })
        .eq("id", studentId);
      if (quest.xp_reward > 0) {
        await supabase.from("xp_transactions").insert({ school_id: schoolId, student_id: studentId, amount: quest.xp_reward, reason: `เควส: ${quest.title}` });
      }
      if (quest.coin_reward > 0) {
        await supabase.from("coin_transactions").insert({ school_id: schoolId, student_id: studentId, amount: quest.coin_reward, reason: `เควส: ${quest.title}` });
      }
      if (student.user_id) {
        await supabase.from("notifications").insert({
          school_id: schoolId,
          user_id: student.user_id,
          title: "เควสสำเร็จ!",
          body: `คุณทำเควส "${quest.title}" สำเร็จแล้ว`,
          category: "quest",
          priority: "low",
        });
      }
    }
  }

  if (quest.badge_id) {
    await supabase.from("student_achievements").insert({ student_id: studentId, achievement_id: quest.badge_id }).select();
  }
}

// ============================================================================
// Reward redemption
// ============================================================================

export async function redeemReward(studentId: string, rewardItemId: string, schoolId: string) {
  const supabase = await createClient();
  const [{ data: student }, { data: item }] = await Promise.all([
    supabase.from("students").select("coins, user_id").eq("id", studentId).single(),
    supabase.from("reward_shop_items").select("*").eq("id", rewardItemId).single(),
  ]);
  if (!student || !item) throw new Error("Student or reward item not found");
  if (student.coins < item.cost_coins) throw new Error("เหรียญไม่เพียงพอ");

  const { data: txn, error: txnError } = await supabase
    .from("coin_transactions")
    .insert({ school_id: schoolId, student_id: studentId, amount: -item.cost_coins, reason: `แลกของรางวัล: ${item.name}`, reward_item_id: rewardItemId })
    .select()
    .single();
  if (txnError) throw txnError;

  await supabase.from("students").update({ coins: student.coins - item.cost_coins }).eq("id", studentId);

  const { data: redemption, error } = await supabase
    .from("reward_redemptions")
    .insert({ school_id: schoolId, student_id: studentId, reward_item_id: rewardItemId, coin_transaction_id: txn.id })
    .select()
    .single();
  if (error) throw error;

  if (student.user_id) {
    await supabase.from("notifications").insert({
      school_id: schoolId,
      user_id: student.user_id,
      title: "แลกของรางวัลสำเร็จ",
      body: `แลก "${item.name}" ด้วย ${item.cost_coins} เหรียญ`,
      category: "reward",
      priority: "low",
    });
  }

  return redemption;
}

export interface RedemptionHistoryRow {
  id: string;
  status: string;
  redeemed_at: string;
  students: { full_name: string; student_code: string } | null;
  reward_shop_items: { name: string; cost_coins: number } | null;
}

export async function getRedemptionHistory(studentId?: string, limit = 30): Promise<RedemptionHistoryRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("reward_redemptions")
    .select(
      "id, status, redeemed_at, students(full_name, student_code, deleted_at), reward_shop_items(name, cost_coins)"
    )
    .order("redeemed_at", { ascending: false })
    .limit(limit);
  if (studentId) query = query.eq("student_id", studentId);
  const { data } = await query.returns<
    (RedemptionHistoryRow & { students: (RedemptionHistoryRow["students"] & { deleted_at: string | null }) | null })[]
  >();
  return (data ?? []).filter((row) => !row.students || !row.students.deleted_at);
}

// ============================================================================
// Classroom level
// ============================================================================

export async function getClassroomLevels() {
  const supabase = await createClient();
  const { data: students } = await supabase.from("students").select("classroom, xp").eq("is_active", true).is("deleted_at", null);
  const totals = new Map<string, number>();
  for (const s of students ?? []) {
    const classroom = s.classroom ?? "ไม่ระบุ";
    totals.set(classroom, (totals.get(classroom) ?? 0) + s.xp);
  }
  return Array.from(totals.entries())
    .map(([classroom, totalXp]) => ({ classroom, totalXp, tier: getClassroomTier(totalXp) }))
    .sort((a, b) => b.totalXp - a.totalXp);
}

// ============================================================================
// AI behavior analysis (rule-based, no external calls)
// ============================================================================

export async function getAiBehaviorAnalysis(studentId: string): Promise<string[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const { data: records } = await supabase
    .from("behavior_records")
    .select("category, points, title")
    .eq("student_id", studentId)
    .gte("occurred_at", since);

  const { data: student } = await supabase.from("students").select("full_name, behavior_score, xp").eq("id", studentId).single();
  if (!student) return [];

  const positives = (records ?? []).filter((r) => r.category === "positive");
  const negatives = (records ?? []).filter((r) => r.category === "negative");
  const insights: string[] = [];

  const score = (student as { behavior_score?: number }).behavior_score ?? 100;
  if (score >= 150) {
    insights.push(`${student.full_name} มีคะแนนพฤติกรรมดีเยี่ยม (${score} คะแนน) ควรได้รับการยกย่องและส่งเสริมให้เป็นแบบอย่าง`);
  } else if (score < 60) {
    insights.push(`${student.full_name} มีคะแนนพฤติกรรมต่ำ (${score} คะแนน) ควรติดตามใกล้ชิดและพูดคุยกับผู้ปกครอง`);
  }

  if (positives.length > 0 && negatives.length === 0) {
    insights.push(`${student.full_name} แสดงพฤติกรรมเชิงบวกอย่างสม่ำเสมอในช่วง 2 เดือนที่ผ่านมา`);
  }

  const leadershipCount = positives.filter((p) => p.title.includes("ผู้นำ") || p.title.includes("ช่วยเหลือ")).length;
  const homeworkIssues = negatives.filter((n) => n.title.includes("การบ้าน")).length;
  if (leadershipCount >= 2 && homeworkIssues >= 2) {
    insights.push(`${student.full_name} แสดงความเป็นผู้นำที่ดี แต่ควรปรับปรุงความสม่ำเสมอในการส่งการบ้าน`);
  }

  if (negatives.filter((n) => n.title.includes("สาย")).length >= 3) {
    insights.push(`${student.full_name} มาเรียนสายบ่อยครั้ง ควรพูดคุยเรื่องการบริหารเวลา`);
  }

  if (insights.length === 0) {
    insights.push(`${student.full_name} มีพฤติกรรมอยู่ในเกณฑ์ปกติ ไม่พบความเสี่ยงที่ชัดเจนในช่วงนี้`);
  }

  return insights;
}

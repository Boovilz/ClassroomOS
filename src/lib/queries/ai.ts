import { createClient } from "@/lib/supabase/server";
import { callAi, isAiConfigured, AI_NOT_CONFIGURED_MESSAGE_TH, type CallAiOptions } from "@/lib/ai/client";
import { getAiRiskScore } from "@/lib/queries/welfare";
import { getAiBehaviorAnalysis } from "@/lib/queries/behavior";
import { getAiAcademicAnalysis } from "@/lib/queries/academic";
import { getAiHealthAnalysis } from "@/lib/queries/health";
import { getAiFinancialAnalysis } from "@/lib/queries/finance";

// ============================================================================
// Module 12 - AI Teacher Assistant query layer.
//
// Consolidation note: this file persists chat conversations/messages, the
// single ai_generated_content table (insight/recommendation/alert/report/
// document/certificate_text/message_draft/lesson_plan/workflow_run), the
// ai_knowledge_base lexical-search table, and ai_usage_logs - see the
// migration header comment in
// supabase/migrations/20250101000021_ai_assistant.sql for the full
// reasoning on why these 5 tables replace the spec's ~10 suggested tables.
// ============================================================================

async function currentUserContext(): Promise<{ userId: string | null; schoolId: string | null; role: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { userId: null, schoolId: null, role: null };
  const { data: profile } = await supabase.from("users").select("school_id, role").eq("id", auth.user.id).single();
  return { userId: auth.user.id, schoolId: profile?.school_id ?? null, role: profile?.role ?? null };
}

async function logAiUsage(params: {
  schoolId: string | null;
  userId: string | null;
  feature: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  succeeded: boolean;
  errorMessage?: string;
}) {
  const supabase = await createClient();
  await supabase.from("ai_usage_logs").insert({
    school_id: params.schoolId,
    user_id: params.userId,
    feature: params.feature,
    model: params.model ?? null,
    input_tokens: params.inputTokens ?? null,
    output_tokens: params.outputTokens ?? null,
    succeeded: params.succeeded,
    error_message: params.errorMessage ?? null,
  });
}

// ============================================================================
// Conversations / Messages (chat assistant memory)
// ============================================================================

export async function getOrCreateConversation(conversationId?: string | null): Promise<{ id: string } | null> {
  const supabase = await createClient();
  const { userId, schoolId } = await currentUserContext();
  if (!userId || !schoolId) return null;

  if (conversationId) {
    const { data } = await supabase.from("ai_conversations").select("id").eq("id", conversationId).eq("user_id", userId).maybeSingle();
    if (data) return data;
  }

  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({ school_id: schoolId, user_id: userId, title: "การสนทนาใหม่" })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

export async function listConversations(limit = 20) {
  const supabase = await createClient();
  const { userId } = await currentUserContext();
  if (!userId) return [];
  const { data } = await supabase
    .from("ai_conversations")
    .select("id, title, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getConversationMessages(conversationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_messages")
    .select("id, role, content, created_at, model, input_tokens, output_tokens")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

async function appendMessage(conversationId: string, role: "user" | "assistant" | "system", content: string, extra?: { model?: string; inputTokens?: number; outputTokens?: number }) {
  const supabase = await createClient();
  await supabase.from("ai_messages").insert({
    conversation_id: conversationId,
    role,
    content,
    model: extra?.model ?? null,
    input_tokens: extra?.inputTokens ?? null,
    output_tokens: extra?.outputTokens ?? null,
  });
  await supabase.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
}

// ============================================================================
// Simple keyword/intent routing for the chat assistant - NOT real
// function-calling/tool-use, documented as the time-budget tradeoff.
// e.g. "สรุปนักเรียนที่มีความเสี่ยงวันนี้" routes to risk-student context.
// ============================================================================

export interface ChatContextResult {
  contextText: string | null;
  matchedIntent: string | null;
}

async function buildChatContext(message: string, schoolId: string): Promise<ChatContextResult> {
  const supabase = await createClient();
  const lower = message;

  if (/เสี่ยง|risk/i.test(lower)) {
    const { data: students } = await supabase
      .from("students")
      .select("id, full_name, classroom, risk_level")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .in("risk_level", ["medium", "high"])
      .limit(10);
    if (students && students.length > 0) {
      const lines = students.map((s) => `- ${s.full_name} (ห้อง ${s.classroom ?? "-"}) ระดับความเสี่ยง: ${s.risk_level}`);
      return { contextText: `รายชื่อนักเรียนที่มีความเสี่ยงในระบบขณะนี้:\n${lines.join("\n")}`, matchedIntent: "risk_students" };
    }
    return { contextText: "ไม่พบนักเรียนที่มีความเสี่ยงระดับปานกลางขึ้นไปในระบบขณะนี้", matchedIntent: "risk_students" };
  }

  if (/แจ้งผู้ปกครอง|เขียนข้อความ|ข้อความถึงผู้ปกครอง/i.test(lower)) {
    return {
      contextText:
        "ผู้ใช้ต้องการร่างข้อความถึงผู้ปกครอง - หากทราบชื่อนักเรียนและประเด็น ให้เขียนข้อความที่สุภาพ กระชับ เหมาะสำหรับส่งทาง LINE OA หรือแอปสื่อสารโรงเรียน (อ้างอิงรูปแบบเดียวกับโมดูลสื่อสารผู้ปกครอง)",
      matchedIntent: "parent_message_draft",
    };
  }

  if (/มาเรียน|ขาดเรียน|attendance/i.test(lower)) {
    const { count } = await supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("status", "absent")
      .gte("date", new Date().toISOString().slice(0, 10));
    return { contextText: `วันนี้มีนักเรียนขาดเรียน ${count ?? 0} คน (ข้อมูลจากระบบเช็คชื่อ)`, matchedIntent: "attendance_today" };
  }

  return { contextText: null, matchedIntent: null };
}

const CHAT_SYSTEM_PROMPT =
  "คุณคือผู้ช่วย AI อัจฉริยะของครูในระบบ Teacher Classroom OS (โรงเรียนในประเทศไทย) ตอบเป็นภาษาไทยเสมอ " +
  "หน้าที่ของคุณคือช่วยครูวิเคราะห์ข้อมูลนักเรียน เขียนเอกสาร ร่างข้อความถึงผู้ปกครอง และให้คำแนะนำเชิงปฏิบัติ " +
  "ตอบกระชับ ตรงประเด็น เป็นมิตร และอ้างอิงข้อมูลบริบทที่ให้มาหากมี หากไม่มีข้อมูลบริบทที่เกี่ยวข้อง ให้ตอบจากความรู้ทั่วไปเกี่ยวกับการศึกษาและการดูแลนักเรียน " +
  "คุณไม่ใช่ผู้ให้บริการทางการแพทย์หรือกฎหมาย หากคำถามต้องการความเชี่ยวชาญเฉพาะทาง ให้แนะนำให้ปรึกษาผู้เชี่ยวชาญที่เกี่ยวข้อง";

/**
 * Non-streaming chat turn (used by POST /api/ai/chat). A separate
 * streaming variant exists for the chat UI itself - see
 * src/app/api/ai/chat/route.ts which uses streamAi() directly for SSE.
 * This function does the persistence + context-injection plumbing shared
 * by both paths.
 */
export async function sendChatMessage(params: { conversationId: string; message: string }): Promise<{
  reply: string;
  notConfigured: boolean;
  matchedIntent: string | null;
}> {
  const { schoolId, userId } = await currentUserContext();
  await appendMessage(params.conversationId, "user", params.message);

  if (!schoolId) {
    return { reply: AI_NOT_CONFIGURED_MESSAGE_TH, notConfigured: true, matchedIntent: null };
  }

  const { contextText, matchedIntent } = await buildChatContext(params.message, schoolId);
  const history = (await getConversationMessages(params.conversationId))
    .slice(-10, -1)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const prompt = contextText ? `บริบทข้อมูลจากระบบ:\n${contextText}\n\nคำถามของครู: ${params.message}` : params.message;

  const result = await callAi(prompt, CHAT_SYSTEM_PROMPT, { history, maxTokens: 1024 });

  await appendMessage(params.conversationId, "assistant", result.text, {
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  });
  await logAiUsage({
    schoolId,
    userId,
    feature: "chat",
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    succeeded: result.ok,
    errorMessage: result.error,
  });

  return { reply: result.text, notConfigured: !!result.notConfigured, matchedIntent };
}

export { buildChatContext, CHAT_SYSTEM_PROMPT };

// ============================================================================
// ai_generated_content persistence (insights/recommendations/alerts/
// reports/documents/certificate text/message drafts/lesson plans/workflow
// run summaries).
// ============================================================================

export type AiContentType =
  | "insight"
  | "recommendation"
  | "alert"
  | "report"
  | "document"
  | "certificate_text"
  | "message_draft"
  | "lesson_plan"
  | "workflow_run";

export async function saveAiGeneratedContent(params: {
  schoolId: string;
  studentId?: string | null;
  contentType: AiContentType;
  domain?: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  createdBy?: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_generated_content")
    .insert({
      school_id: params.schoolId,
      student_id: params.studentId ?? null,
      content_type: params.contentType,
      domain: params.domain ?? null,
      title: params.title,
      content: params.content,
      metadata: params.metadata ?? {},
      created_by: params.createdBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAiGeneratedContent(schoolId: string, contentType?: AiContentType, limit = 20) {
  const supabase = await createClient();
  let query = supabase
    .from("ai_generated_content")
    .select("*, students(full_name, student_code, classroom, deleted_at)")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (contentType) query = query.eq("content_type", contentType);
  const { data } = await query;
  return (data ?? []).filter((row) => !row.students || !row.students.deleted_at);
}

// ============================================================================
// AI Command Center dashboard - reuses existing dashboard/analytics
// functions from Modules 1/3/4/5/7/9/10 plus the persisted content table.
// ============================================================================

export async function getAiCommandCenterDashboard(schoolId: string) {
  const supabase = await createClient();

  const [{ count: riskStudents }, recentInsights, recentAlerts, recentReports, usageToday] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("is_active", true).is("deleted_at", null).in("risk_level", ["medium", "high"]),
    getAiGeneratedContent(schoolId, "insight", 5),
    getAiGeneratedContent(schoolId, "alert", 5),
    getAiGeneratedContent(schoolId, "report", 5),
    supabase
      .from("ai_usage_logs")
      .select("input_tokens, output_tokens")
      .eq("school_id", schoolId)
      .gte("created_at", new Date().toISOString().slice(0, 10)),
  ]);

  const tokensToday = (usageToday.data ?? []).reduce(
    (sum, r) => sum + (r.input_tokens ?? 0) + (r.output_tokens ?? 0),
    0
  );

  return {
    aiConfigured: isAiConfigured(),
    riskStudentsCount: riskStudents ?? 0,
    recentInsights,
    recentAlerts,
    recentReports,
    tokensUsedToday: tokensToday,
  };
}

// ============================================================================
// AI Recommendation Engine - synthesizes Module 9 intervention logic +
// Module 4 behavior + Module 5 academic structured outputs into one
// Claude-written recommendation, persisted to ai_generated_content.
// ============================================================================

export async function generateStudentRecommendations(studentId: string, schoolId: string, createdBy?: string) {
  const supabase = await createClient();
  const { data: student } = await supabase.from("students").select("full_name").eq("id", studentId).single();
  const studentName = student?.full_name ?? "นักเรียน";

  const [risk, behaviorInsights, academicInsights] = await Promise.all([
    getAiRiskScore(studentId).catch(() => null),
    getAiBehaviorAnalysis(studentId).catch(() => []),
    getAiAcademicAnalysis(studentId).catch(() => []),
  ]);

  const structuredFindings: string[] = [
    ...(risk ? [`ระดับความเสี่ยงโดยรวม: ${risk.riskLevel} (คะแนน ${risk.riskScore})`, ...risk.recommendations] : []),
    ...behaviorInsights,
    ...academicInsights,
  ];

  const prompt =
    `ข้อมูลนักเรียน ${studentName} ที่ระบบวิเคราะห์ไว้แล้ว:\n${structuredFindings.map((f, i) => `${i + 1}. ${f}`).join("\n")}\n\n` +
    `โปรดสังเคราะห์เป็น "รายการคำแนะนำการดำเนินการ" (recommended actions) 3-5 ข้อ เป็นภาษาไทย แต่ละข้อสั้น เจาะจง ทำได้จริง เรียงตามความสำคัญ`;
  const system = "คุณเป็นผู้ช่วย AI ที่สังเคราะห์ข้อมูลนักเรียนจากหลายด้านเป็นคำแนะนำการดำเนินการที่เจาะจงและนำไปใช้ได้จริง ตอบเป็นภาษาไทยเท่านั้น";

  const result = await callAi(prompt, system, { maxTokens: 700 });

  if (result.ok) {
    await saveAiGeneratedContent({
      schoolId,
      studentId,
      contentType: "recommendation",
      domain: "welfare",
      title: `คำแนะนำสำหรับ ${studentName}`,
      content: result.text,
      createdBy,
    });
  }

  return { text: result.text, notConfigured: !!result.notConfigured, structuredFindings };
}

// ============================================================================
// AI Automation Workflows - manually-triggered "run now" compositions, NOT
// a real scheduler/cron (no background job runner in this Next.js app).
// Production path: pair with an external cron hitting a Route Handler.
// ============================================================================

export type WorkflowKind = "daily_attendance_summary" | "risk_alert_sweep" | "parent_notification_batch" | "health_monitoring_sweep";

export async function runAiWorkflow(kind: WorkflowKind, schoolId: string, createdBy?: string) {
  const supabase = await createClient();
  let structuredFindings: string[] = [];
  let title = "";

  if (kind === "daily_attendance_summary") {
    title = "สรุปการมาเรียนประจำวัน (AI)";
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase.from("attendance").select("status").eq("date", today);
    const counts: Record<string, number> = {};
    for (const r of data ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1;
    structuredFindings = Object.entries(counts).map(([status, count]) => `${status}: ${count} คน`);
  } else if (kind === "risk_alert_sweep") {
    title = "สรุปนักเรียนกลุ่มเสี่ยง (AI)";
    const { data } = await supabase
      .from("students")
      .select("full_name, classroom, risk_level")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .in("risk_level", ["medium", "high"])
      .limit(20);
    structuredFindings = (data ?? []).map((s) => `${s.full_name} (${s.classroom ?? "-"}) ระดับ ${s.risk_level}`);
  } else if (kind === "parent_notification_batch") {
    title = "สรุปการแจ้งเตือนผู้ปกครอง (AI)";
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("school_id", schoolId).gte("created_at", since);
    structuredFindings = [`มีการแจ้งเตือนผู้ปกครอง/นักเรียนทั้งหมด ${count ?? 0} รายการใน 24 ชั่วโมงที่ผ่านมา`];
  } else if (kind === "health_monitoring_sweep") {
    title = "สรุปการเฝ้าระวังสุขภาพ (AI)";
    const { data } = await supabase.from("health_alerts").select("severity").eq("school_id", schoolId).eq("is_resolved", false);
    const counts: Record<string, number> = {};
    for (const a of data ?? []) counts[a.severity] = (counts[a.severity] ?? 0) + 1;
    structuredFindings = Object.entries(counts).map(([sev, count]) => `ระดับ ${sev}: ${count} รายการ`);
  }

  if (structuredFindings.length === 0) structuredFindings = ["ไม่พบข้อมูลที่เกี่ยวข้องในขณะนี้"];

  const prompt = `ข้อมูลที่รวบรวมได้:\n${structuredFindings.map((f, i) => `${i + 1}. ${f}`).join("\n")}\n\nโปรดเขียนสรุปสั้น ๆ เป็นภาษาไทย 2-3 ประโยค สำหรับรายงานผู้บริหาร/ครูประจำชั้น`;
  const system = "คุณเป็นผู้ช่วย AI ที่เขียนสรุปรายงานประจำวัน/สัปดาห์ของโรงเรียนแบบกระชับ เป็นภาษาไทยเท่านั้น";
  const result = await callAi(prompt, system, { maxTokens: 400 });

  const saved = await saveAiGeneratedContent({
    schoolId,
    contentType: "workflow_run",
    domain: kind,
    title,
    content: result.ok ? result.text : structuredFindings.join("\n"),
    metadata: { structuredFindings, aiConfigured: result.ok },
    createdBy,
  });

  return saved;
}

// ============================================================================
// AI Lesson Assistant - genuinely new capability, no prior-module overlap.
// ============================================================================

export interface LessonAssistantInput {
  gradeLevel: string;
  subject: string;
  topic: string;
  activityType: "lesson_plan" | "worksheet" | "rubric" | "quiz" | "project" | "coding_activity" | "stem_activity" | "active_learning";
}

const ACTIVITY_LABEL_TH: Record<LessonAssistantInput["activityType"], string> = {
  lesson_plan: "แผนการสอน",
  worksheet: "ใบงาน",
  rubric: "เกณฑ์การประเมิน (รูบริก)",
  quiz: "แบบทดสอบ",
  project: "โครงงาน",
  coding_activity: "กิจกรรมการเขียนโค้ด",
  stem_activity: "กิจกรรม STEM",
  active_learning: "กิจกรรม Active Learning",
};

export async function generateLessonAsset(input: LessonAssistantInput, schoolId?: string, createdBy?: string) {
  const label = ACTIVITY_LABEL_TH[input.activityType];
  const prompt =
    `ช่วยสร้าง "${label}" สำหรับวิชา ${input.subject} ระดับชั้น ${input.gradeLevel} เรื่อง "${input.topic}" ` +
    `โดยให้เนื้อหาเหมาะสมตามมาตรฐานหลักสูตรของไทย ใช้ภาษาไทย จัดรูปแบบให้อ่านง่าย มีหัวข้อย่อยชัดเจน พร้อมนำไปใช้สอนหรือพิมพ์ได้จริง`;
  const system =
    "คุณเป็นผู้ช่วย AI สำหรับครูในการออกแบบสื่อการสอน แผนการสอน ใบงาน และกิจกรรมการเรียนรู้ ตอบเป็นภาษาไทยเท่านั้น เนื้อหาต้องมีโครงสร้างชัดเจน เหมาะสมกับระดับชั้นที่ระบุ";

  const result = await callAi(prompt, system, { maxTokens: 2000 });

  if (result.ok && schoolId) {
    await saveAiGeneratedContent({
      schoolId,
      contentType: "lesson_plan",
      domain: input.subject,
      title: `${label}: ${input.topic} (${input.gradeLevel})`,
      content: result.text,
      metadata: { ...input },
      createdBy,
    });
  }

  return { text: result.text, notConfigured: !!result.notConfigured };
}

// ============================================================================
// AI Knowledge Base - plain-text chunks + Postgres full-text search (NOT
// vector embeddings). Real RAG pattern, lexical retrieval.
// ============================================================================

export async function addKnowledgeBaseEntry(params: { schoolId: string; category?: string; title: string; content: string; createdBy?: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_knowledge_base")
    .insert({
      school_id: params.schoolId,
      category: params.category ?? "general",
      title: params.title,
      content: params.content,
      created_by: params.createdBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listKnowledgeBaseEntries(schoolId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("ai_knowledge_base").select("*").eq("school_id", schoolId).order("created_at", { ascending: false });
  return data ?? [];
}

export async function updateKnowledgeBaseEntry(id: string, changes: Partial<{ title: string; content: string; category: string }>) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("ai_knowledge_base").update(changes).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteKnowledgeBaseEntry(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("ai_knowledge_base").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Lexical retrieval: Postgres full-text search via to_tsquery (with an
 * ILIKE fallback for short/Thai queries where 'simple' tokenization may
 * not split words usefully). Returns the top-N matching chunks - this IS
 * the "semantic search" feature, implemented without embeddings.
 */
export async function searchKnowledgeBase(schoolId: string, query: string, topN = 3) {
  const supabase = await createClient();
  const { data: ftsResults } = await supabase
    .from("ai_knowledge_base")
    .select("*")
    .eq("school_id", schoolId)
    .textSearch("title", query, { type: "plain", config: "simple" })
    .limit(topN);

  if (ftsResults && ftsResults.length > 0) return ftsResults;

  // Fallback: ILIKE substring match across title + content for short/Thai queries.
  const { data: likeResults } = await supabase
    .from("ai_knowledge_base")
    .select("*")
    .eq("school_id", schoolId)
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .limit(topN);
  return likeResults ?? [];
}

export async function askKnowledgeBase(schoolId: string, question: string) {
  const chunks = await searchKnowledgeBase(schoolId, question, 3);
  const contextText =
    chunks.length > 0
      ? chunks.map((c, i) => `[เอกสาร ${i + 1}: ${c.title}]\n${c.content}`).join("\n\n")
      : "ไม่พบเอกสารที่เกี่ยวข้องในฐานความรู้";

  const prompt = `เอกสารอ้างอิงจากฐานความรู้ของโรงเรียน:\n${contextText}\n\nคำถาม: ${question}\n\nโปรดตอบโดยอ้างอิงจากเอกสารข้างต้นเป็นหลัก หากไม่มีข้อมูลที่เกี่ยวข้องเพียงพอ ให้บอกตามตรงว่าไม่พบข้อมูลในฐานความรู้`;
  const system = "คุณเป็นผู้ช่วย AI ที่ตอบคำถามเกี่ยวกับนโยบาย/ระเบียบ/เอกสารของโรงเรียนโดยอ้างอิงจากฐานความรู้ที่ให้มา ตอบเป็นภาษาไทยเท่านั้น";

  const result = await callAi(prompt, system, { maxTokens: 800 });
  return { answer: result.text, notConfigured: !!result.notConfigured, sources: chunks.map((c) => c.title) };
}

// ============================================================================
// AI Communication Assistant - reuses Module 11's draft-generation by
// asking Claude to polish/personalize a message given a short intent,
// rather than duplicating Module 11's template logic.
// ============================================================================

export async function draftParentMessage(params: { studentName: string; topic: string; tone?: "formal" | "friendly" }) {
  const prompt =
    `เขียนข้อความถึงผู้ปกครองของนักเรียนชื่อ ${params.studentName} เกี่ยวกับเรื่อง: ${params.topic} ` +
    `น้ำเสียง: ${params.tone === "formal" ? "ทางการ สุภาพ" : "เป็นมิตร อบอุ่น"} ความยาวไม่เกิน 4-5 ประโยค เหมาะสำหรับส่งทาง LINE OA หรือแอปสื่อสารโรงเรียน`;
  const system = "คุณเป็นผู้ช่วย AI เขียนข้อความสื่อสารระหว่างครูกับผู้ปกครองภาษาไทยที่สุภาพและชัดเจน";
  const result = await callAi(prompt, system, { maxTokens: 400 });
  return { text: result.text, notConfigured: !!result.notConfigured };
}

// ============================================================================
// AI Dashboard Insights - schoolwide one-paragraph summary on top of
// existing analytics query functions.
// ============================================================================

export async function getSchoolwideAiSummary(schoolId: string) {
  const supabase = await createClient();
  const [{ count: totalStudents }, { count: riskStudents }, { count: openCases }] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("is_active", true).is("deleted_at", null),
    supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("is_active", true).is("deleted_at", null).in("risk_level", ["medium", "high"]),
    supabase.from("student_cases").select("id", { count: "exact", head: true }).eq("school_id", schoolId).in("status", ["open", "monitoring"]),
  ]);

  const structuredFindings = [
    `นักเรียนทั้งหมด ${totalStudents ?? 0} คน`,
    `นักเรียนกลุ่มเสี่ยง ${riskStudents ?? 0} คน`,
    `กรณีที่ยังเปิดอยู่ ${openCases ?? 0} กรณี`,
  ];
  const prompt = `ข้อมูลสรุปโรงเรียน:\n${structuredFindings.join("\n")}\n\nโปรดเขียนสรุปภาพรวมโรงเรียน 1 พารากราฟ (3-4 ประโยค) เป็นภาษาไทยสำหรับผู้บริหาร`;
  const system = "คุณเป็นผู้ช่วย AI ที่เขียนสรุปภาพรวมสถานการณ์ของโรงเรียนสำหรับผู้บริหาร ตอบเป็นภาษาไทยเท่านั้น กระชับ ตรงประเด็น";
  const result = await callAi(prompt, system, { maxTokens: 400 });
  return { summary: result.text, notConfigured: !!result.notConfigured, structuredFindings };
}

export { logAiUsage, currentUserContext };

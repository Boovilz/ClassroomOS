/**
 * Real Claude-powered AI feature entry points for Module 12 - AI Teacher
 * Assistant. These extend (not replace) the original typed stubs: the
 * same function names/signatures from the original stub file are kept
 * where they match the spec (generateStudentSummary, writeReport,
 * detectRisk, etc.) so existing call sites keep working, but the bodies
 * now call the real Anthropic API via src/lib/ai/client.ts instead of
 * throwing.
 *
 * ARCHITECTURE NOTE (read this before adding a new "AI analysis" function):
 * every prior module (3/4/5/7/9/10) already has a deterministic,
 * rule-based "AI analysis" function (getAiBehaviorAnalysis,
 * getAiAcademicAnalysis, getAiHealthAnalysis, getAiSdqAnalysis,
 * getAiHomeVisitAnalysis, getAiFinancialAnalysis, getAiRiskScore). Those
 * stay exactly as they are - they are the cheap, deterministic STRUCTURED
 * DATA layer. Functions in this file take that structured output as INPUT
 * CONTEXT to a single Claude call that produces a natural-language
 * synthesis on top, matching the established Thai tone (short, practical,
 * actionable bullet-style sentences). This avoids recomputing anything
 * Claude would be unreliable or slow at, and avoids 7 duplicated Claude
 * call-sites - see getAiSynthesis() below, the one shared entry point.
 */
import type { Student } from "@/lib/types";
import { callAi, isAiConfigured, AI_NOT_CONFIGURED_MESSAGE_TH, type CallAiResult } from "@/lib/ai/client";

export interface AiSummaryResult {
  summary: string;
  generatedAt: string;
  /** True if this result is the graceful "AI not configured" placeholder, not a real model response. */
  notConfigured?: boolean;
  inputTokens?: number;
  outputTokens?: number;
}

const TEACHER_TONE_GUIDE =
  "ตอบเป็นภาษาไทยเท่านั้น น้ำเสียงเป็นมิตร กระชับ ตรงประเด็น แบบที่ครูใช้พูดคุยกับครูหรือผู้บริหารโรงเรียน " +
  "หลีกเลี่ยงศัพท์เทคนิคเกินจำเป็น เน้นข้อสรุปที่นำไปใช้ปฏิบัติได้จริง ไม่ต้องทักทายหรือลงท้ายด้วยประโยคทั่วไป ตอบเฉพาะเนื้อหาที่ขอ";

function toAiSummaryResult(result: CallAiResult): AiSummaryResult {
  return {
    summary: result.text,
    generatedAt: new Date().toISOString(),
    notConfigured: result.notConfigured,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  };
}

// ============================================================================
// Shared synthesis entry point - one Claude call site, many domains.
// ============================================================================

export type AiSynthesisDomain = "academic" | "attendance" | "behavior" | "health" | "sdq" | "home_visit" | "risk" | "welfare";

const DOMAIN_LABEL_TH: Record<AiSynthesisDomain, string> = {
  academic: "ผลการเรียน",
  attendance: "การมาเรียน",
  behavior: "พฤติกรรม",
  health: "สุขภาพ",
  sdq: "แบบประเมิน SDQ",
  home_visit: "การเยี่ยมบ้าน",
  risk: "ความเสี่ยงโดยรวม",
  welfare: "สวัสดิภาพนักเรียน",
}

/**
 * Takes already-computed structured data (from any prior module's
 * rule-based function) + a domain label, and asks Claude once to write a
 * short natural-language synthesis a teacher can read in 10 seconds.
 * Does NOT requery the database or recompute anything - the caller is
 * responsible for gathering `structuredFindings` from the right
 * module-specific function first.
 */
export async function getAiSynthesis(params: {
  studentName: string;
  domain: AiSynthesisDomain;
  structuredFindings: string[];
  extraContext?: string;
}): Promise<AiSummaryResult> {
  const label = DOMAIN_LABEL_TH[params.domain];
  const prompt =
    `นักเรียนชื่อ ${params.studentName}\n` +
    `ข้อมูลเชิงโครงสร้างด้าน${label}ที่ระบบวิเคราะห์ไว้แล้ว (อย่ารื้อคำนวณใหม่ ใช้เป็นข้อเท็จจริงตั้งต้น):\n` +
    params.structuredFindings.map((f, i) => `${i + 1}. ${f}`).join("\n") +
    (params.extraContext ? `\n\nข้อมูลเพิ่มเติม:\n${params.extraContext}` : "") +
    `\n\nโปรดสรุปเป็นภาษาไทย 2-4 ประโยค ให้ครูเข้าใจสถานการณ์ของนักเรียนคนนี้ในด้าน${label}ได้อย่างรวดเร็ว ` +
    `และเสนอแนะสิ่งที่ครูควรทำต่อไปแบบเจาะจง (ไม่ใช่คำแนะนำทั่วไป)`;

  const system = `คุณเป็นผู้ช่วย AI ของครูในระบบ Teacher Classroom OS สำหรับสังเคราะห์ข้อมูลนักเรียนเป็นภาษาที่เข้าใจง่าย ${TEACHER_TONE_GUIDE}`;

  const result = await callAi(prompt, system, { maxTokens: 600 });
  return toAiSummaryResult(result);
}

// ============================================================================
// Original stub signatures, now backed by getAiSynthesis() / direct calls.
// ============================================================================

export async function generateStudentSummary(student: Student): Promise<AiSummaryResult> {
  const prompt =
    `ข้อมูลนักเรียน: ชื่อ ${student.full_name ?? "-"}, รหัส ${student.student_code ?? "-"}, ห้อง ${student.classroom ?? "-"}\n` +
    `โปรดเขียนสรุปภาพรวมของนักเรียนคนนี้แบบสั้น กระชับ เป็นภาษาไทย 2-3 ประโยค สำหรับให้ครูใช้ทบทวนก่อนพบผู้ปกครอง`;
  const system = `คุณเป็นผู้ช่วย AI ของครูในระบบ Teacher Classroom OS ${TEACHER_TONE_GUIDE}`;
  const result = await callAi(prompt, system, { maxTokens: 400 });
  return toAiSummaryResult(result);
}

export async function analyzeAttendancePattern(studentId: string, structuredFindings: string[], studentName: string): Promise<AiSummaryResult> {
  return getAiSynthesis({ studentName, domain: "attendance", structuredFindings: structuredFindings.length ? structuredFindings : [`ไม่มีข้อมูลเฉพาะสำหรับนักเรียนรหัส ${studentId}`] });
}

export async function analyzeBehaviorTrend(studentId: string, structuredFindings: string[], studentName: string): Promise<AiSummaryResult> {
  return getAiSynthesis({ studentName, domain: "behavior", structuredFindings: structuredFindings.length ? structuredFindings : [`ไม่มีข้อมูลเฉพาะสำหรับนักเรียนรหัส ${studentId}`] });
}

export async function analyzeAcademicPerformance(studentId: string, structuredFindings: string[], studentName: string): Promise<AiSummaryResult> {
  return getAiSynthesis({ studentName, domain: "academic", structuredFindings: structuredFindings.length ? structuredFindings : [`ไม่มีข้อมูลเฉพาะสำหรับนักเรียนรหัส ${studentId}`] });
}

export async function summarizeHomeVisit(homeVisitId: string, structuredFindings: string[], studentName: string): Promise<AiSummaryResult> {
  return getAiSynthesis({ studentName, domain: "home_visit", structuredFindings: structuredFindings.length ? structuredFindings : [`ไม่มีข้อมูลเฉพาะสำหรับการเยี่ยมบ้านรหัส ${homeVisitId}`] });
}

/**
 * Thin natural-language layer for Module 5's EXISTING certificate
 * pipeline - Claude writes ONLY the citation/description text, which the
 * caller inserts into the existing academic_certificates record /
 * template. Does NOT generate a PDF or new template (out of scope, same
 * as the rest of this module).
 */
export async function generateCertificateText(params: {
  studentName: string;
  templateType: string;
  achievementTitle: string;
}): Promise<AiSummaryResult> {
  const prompt =
    `เขียนข้อความคำประกาศ/คำชมเชยสำหรับใบประกาศเกียรติคุณ ภาษาไทย 1-2 ประโยค สำหรับนักเรียนชื่อ ${params.studentName} ` +
    `ประเภทใบประกาศ: ${params.templateType} เรื่อง: ${params.achievementTitle} ` +
    `น้ำเสียงเป็นทางการ สุภาพ ให้เกียรติ เหมาะสำหรับพิมพ์ลงในใบประกาศเกียรติคุณจริง`;
  const system = "คุณเป็นผู้ช่วย AI เขียนข้อความใบประกาศเกียรติคุณภาษาไทยที่เป็นทางการและให้เกียรติผู้รับ";
  const result = await callAi(prompt, system, { maxTokens: 300 });
  return toAiSummaryResult(result);
}

/** @deprecated kept for signature compatibility - prefer generateCertificateText + Module 5's issueCertificate. */
export async function generateCertificate(_studentId: string, _achievementId: string): Promise<{ pdfUrl: string }> {
  throw new Error(
    "generateCertificate(pdfUrl) is superseded by generateCertificateText() + Module 5's issueCertificate()/print-to-PDF pipeline - PDF binary generation is out of scope for this module."
  );
}

/**
 * Thin natural-language layer for report-card "teacher comments" / ปพ.5/
 * ปพ.6 remarks sections, layered on top of Module 5's existing
 * getStudentAcademicSummary() structured data (passed in by the caller).
 */
export async function writeReport(
  kind: "academic" | "behavior" | "attendance",
  studentId: string,
  structuredFindings: string[],
  studentName: string
): Promise<AiSummaryResult> {
  const domain: AiSynthesisDomain = kind === "academic" ? "academic" : kind === "behavior" ? "behavior" : "attendance";
  return getAiSynthesis({
    studentName,
    domain,
    structuredFindings: structuredFindings.length ? structuredFindings : [`ไม่มีข้อมูลเฉพาะสำหรับนักเรียนรหัส ${studentId}`],
    extraContext: "โปรดเขียนในรูปแบบที่นำไปใส่ในช่อง \"ความเห็นของครูประจำชั้น\" ของแบบรายงานผลการเรียน (ปพ.5/ปพ.6) ได้โดยตรง",
  });
}

/**
 * @deprecated structured risk detection already exists as
 * getAiRiskScore() in src/lib/queries/welfare.ts (rule-based, reused by
 * Module 9/10/12). This wraps it with a Claude-written natural-language
 * explanation via getAiSynthesis - call getAiRiskScore() first, then pass
 * its `factors`/`recommendations` here as structuredFindings.
 */
export async function detectRisk(
  studentId: string,
  riskLevel: "low" | "medium" | "high" | "moderate" | "critical",
  structuredFindings: string[],
  studentName: string
): Promise<{ riskLevel: string; reasons: string[]; aiNarrative: AiSummaryResult }> {
  const aiNarrative = await getAiSynthesis({
    studentName,
    domain: "risk",
    structuredFindings: structuredFindings.length ? structuredFindings : [`ไม่มีข้อมูลเฉพาะสำหรับนักเรียนรหัส ${studentId}`],
  });
  return { riskLevel, reasons: structuredFindings, aiNarrative };
}

export { isAiConfigured, AI_NOT_CONFIGURED_MESSAGE_TH };

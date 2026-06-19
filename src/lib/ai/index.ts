/**
 * AI feature stubs. None of these call a real LLM yet — wire each one to
 * an LLM provider (e.g. the Anthropic API) with a server-side API key
 * before using in production. Signatures are typed so callers can be
 * written against them now.
 */
import type { Student } from "@/lib/types";

export interface AiSummaryResult {
  summary: string;
  generatedAt: string;
}

export async function generateStudentSummary(_student: Student): Promise<AiSummaryResult> {
  throw new Error("Not implemented: wire generateStudentSummary to an LLM provider");
}

export async function analyzeAttendancePattern(_studentId: string): Promise<AiSummaryResult> {
  throw new Error("Not implemented: wire analyzeAttendancePattern to an LLM provider");
}

export async function analyzeBehaviorTrend(_studentId: string): Promise<AiSummaryResult> {
  throw new Error("Not implemented: wire analyzeBehaviorTrend to an LLM provider");
}

export async function analyzeAcademicPerformance(_studentId: string): Promise<AiSummaryResult> {
  throw new Error("Not implemented: wire analyzeAcademicPerformance to an LLM provider");
}

export async function summarizeHomeVisit(_homeVisitId: string): Promise<AiSummaryResult> {
  throw new Error("Not implemented: wire summarizeHomeVisit to an LLM provider");
}

export async function generateCertificate(_studentId: string, _achievementId: string): Promise<{ pdfUrl: string }> {
  throw new Error("Not implemented: wire generateCertificate to a PDF + LLM pipeline");
}

export async function writeReport(_kind: "academic" | "behavior" | "attendance", _studentId: string): Promise<AiSummaryResult> {
  throw new Error("Not implemented: wire writeReport to an LLM provider");
}

export async function detectRisk(_studentId: string): Promise<{ riskLevel: "low" | "medium" | "high"; reasons: string[] }> {
  throw new Error("Not implemented: wire detectRisk to an LLM provider + SDQ/attendance/behavior data");
}

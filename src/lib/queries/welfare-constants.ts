// Pure types/constants shared between server query code (welfare.ts) and
// client components. Kept separate from welfare.ts because that file imports
// "@/lib/supabase/server" (which pulls in next/headers) and therefore cannot
// be imported from "use client" components.

export type LevelRating = "excellent" | "good" | "fair" | "needs_support";

export const levelRatingLabel: Record<LevelRating, string> = {
  excellent: "ดีเยี่ยม",
  good: "ดี",
  fair: "พอใช้",
  needs_support: "ต้องการช่วยเหลือ",
};

export type RiskLevel = "low" | "moderate" | "high" | "critical";

export const riskLevelLabel: Record<RiskLevel, string> = {
  low: "ต่ำ",
  moderate: "ปานกลาง",
  high: "สูง",
  critical: "วิกฤต",
};

export type WelfareStatus = "normal" | "monitoring" | "needs_support" | "critical";

export const welfareStatusLabel: Record<WelfareStatus, string> = {
  normal: "ปกติ",
  monitoring: "ติดตามดูแล",
  needs_support: "ต้องการช่วยเหลือ",
  critical: "วิกฤต",
};

/** Builds a plain Google Maps link from coordinates - no API key required. */
export function buildMapsUrl(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat},${lng}`;
}

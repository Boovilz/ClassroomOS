/**
 * Subscription plan + quota tracking - NO billing/payment processor (no
 * Stripe, no checkout). `schools.plan` + `school_quotas` (see migration
 * 20250101000025) are just numbers an admin can view/set; real enforcement
 * is limited to the one cheap, high-value check already wired at the
 * database layer (trg_students_enforce_quota, blocking student creation
 * past max_students - see the migration for the trigger). Everything else
 * here is informational (usage bars on the Subscription page).
 */

export type PlanId = "free" | "school_standard" | "school_pro" | "district_enterprise";

export const PLAN_LABEL_TH: Record<PlanId, string> = {
  free: "ฟรี",
  school_standard: "โรงเรียนมาตรฐาน",
  school_pro: "โรงเรียนโปร",
  district_enterprise: "เขตพื้นที่/องค์กร",
};

/** Suggested default quotas per plan - used only when an admin resets a school onto a new plan; the actual enforced numbers always live in `school_quotas`. */
export const PLAN_DEFAULT_QUOTAS: Record<PlanId, { max_students: number; max_teachers: number; max_storage_mb: number; ai_credits_per_month: number }> = {
  free: { max_students: 100, max_teachers: 10, max_storage_mb: 500, ai_credits_per_month: 100 },
  school_standard: { max_students: 500, max_teachers: 40, max_storage_mb: 5000, ai_credits_per_month: 1000 },
  school_pro: { max_students: 2000, max_teachers: 150, max_storage_mb: 20000, ai_credits_per_month: 5000 },
  district_enterprise: { max_students: 50000, max_teachers: 3000, max_storage_mb: 200000, ai_credits_per_month: 50000 },
};

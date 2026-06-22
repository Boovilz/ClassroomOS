/**
 * Shared server-side auth guard for /api/admin/* route handlers. Mirrors
 * the role check already done ad-hoc in middleware/RLS, but route handlers
 * need their own explicit check too (middleware only blocks page
 * navigation, not direct API calls).
 */
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export interface AdminContext {
  userId: string;
  role: Role;
  schoolId: string | null;
  supabase: Awaited<ReturnType<typeof createClient>>;
}

export type GuardResult = { ok: true; ctx: AdminContext } | { ok: false; status: number; error: string };

/** Requires an authenticated user whose role is in `allowedRoles`. */
export async function requireRole(allowedRoles: Role[]): Promise<GuardResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  const { data: profile } = await supabase
    .from("users")
    .select("school_id, role")
    .eq("id", auth.user.id)
    .single();
  if (!profile || !allowedRoles.includes(profile.role)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return {
    ok: true,
    ctx: { userId: auth.user.id, role: profile.role, schoolId: profile.school_id, supabase },
  };
}

/** Convenience: school_admin scoped to their own school, OR super_admin (who may pass an explicit schoolId query param to target another school). */
export async function requireSchoolAdminOrSuper(): Promise<GuardResult> {
  return requireRole(["school_admin", "super_admin"]);
}

export async function requireSuperAdmin(): Promise<GuardResult> {
  return requireRole(["super_admin"]);
}

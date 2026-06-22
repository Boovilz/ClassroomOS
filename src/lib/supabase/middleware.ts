import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/types";

// Paths that do not require an authenticated session.
const PUBLIC_PATHS = ["/login", "/register", "/auth/callback"];

// Authenticated users with no school_id are sent here to create/join a
// school before they can use any school-scoped feature.
const ONBOARDING_PATH = "/onboarding";

// Route prefixes that require authentication (the full dashboard app).
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/students",
  "/attendance",
  "/behavior",
  "/leaderboard",
  "/reward-shop",
  "/academic",
  "/health",
  "/finance",
  "/lunch",
  "/home-visits",
  "/sdq",
  "/documents",
  "/communication",
  "/reports",
  "/settings",
  "/admin",
];

// Prefixes that require role === 'super_admin' specifically (the
// multi-school super admin console). Checked in addition to the generic
// auth/onboarding guard below; non-super-admins are bounced to /dashboard.
const SUPER_ADMIN_ONLY_PREFIXES = ["/admin"];

/**
 * Refreshes the Supabase auth session on every request and performs basic
 * route guarding: unauthenticated users are redirected to /login when they
 * try to access any protected dashboard route.
 *
 * NOTE: this only checks *authentication*, not per-role authorization.
 * Fine-grained RBAC (which role can see which row) is enforced by Postgres
 * RLS policies — see supabase/migrations/*_rls_policies.sql — and by
 * src/lib/auth/rbac.ts for UI-level role checks (e.g. hiding nav items).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const isProtectedPath = PROTECTED_PREFIXES.some((path) => pathname.startsWith(path));

  if (!user && !isPublicPath && isProtectedPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated users hitting /login or /register are sent to the dashboard.
  if (user && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && isProtectedPath && pathname !== ONBOARDING_PATH) {
    const { data: profile } = await supabase
      .from("users")
      .select("school_id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile && !profile.school_id && profile.role !== "super_admin") {
      const url = request.nextUrl.clone();
      url.pathname = ONBOARDING_PATH;
      url.search = "";
      return NextResponse.redirect(url);
    }

    const isSuperAdminOnlyPath = SUPER_ADMIN_ONLY_PREFIXES.some((path) => pathname.startsWith(path));
    if (isSuperAdminOnlyPath && profile?.role !== "super_admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

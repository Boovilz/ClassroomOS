import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Hard gate: every /admin/* route is super_admin only (mirrors the middleware check, defense in depth). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("role").eq("id", auth.user.id).maybeSingle();
  if (profile?.role !== "super_admin") redirect("/dashboard");

  return <>{children}</>;
}

import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("role").eq("id", auth.user.id).maybeSingle()
    : { data: null };

  return (
    <DashboardShell role={profile?.role ?? null}>
      {children}
    </DashboardShell>
  );
}

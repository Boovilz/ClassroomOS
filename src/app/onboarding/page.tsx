import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("school_id")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (profile?.school_id) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-royal-blue-50 via-background to-emerald-green-50 p-4">
      <div className="w-full max-w-md">
        <OnboardingForm />
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.user) {
      const { data: profile } = await supabase
        .from("users")
        .select("school_id")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profile?.school_id) {
        void logAudit({
          schoolId: profile.school_id,
          actorId: data.user.id,
          action: "login",
          entityTable: "users",
          entityId: data.user.id,
        });
      }
      // Login monitoring (Security page) - best-effort, never blocks login.
      // IP address is not reliably available client-side; left null here
      // (a server-side login route could capture it from request headers,
      // but the existing login flow is a client component calling
      // supabase-js directly, so we keep that pattern and only add the
      // device/user-agent field we can read for free).
      void supabase
        .from("login_logs")
        .insert({
          school_id: profile?.school_id ?? null,
          user_id: data.user.id,
          success: true,
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        })
        .then(({ error: logErr }) => {
          if (logErr) console.error("login_logs insert failed:", logErr.message);
        });
    }
    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>เข้าสู่ระบบ ClassroomOS</CardTitle>
          <CardDescription>กรอกอีเมลและรหัสผ่านของคุณ</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">อีเมล</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@school.ac.th"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            ยังไม่มีบัญชี?{" "}
            <Link href="/register" className="text-primary underline">
              สมัครสมาชิก
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

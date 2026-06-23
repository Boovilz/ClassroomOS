"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Shown only while zero super_admin exists in the system (see migration 0026
 * / POST /api/admin/bootstrap). Disappears permanently for everyone once
 * someone claims it - this is a one-time first-run affordance, not a
 * standing self-service role upgrade.
 */
export function BootstrapSuperAdminBanner() {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/bootstrap")
      .then((res) => (res.ok ? res.json() : { available: false }))
      .then((data) => setAvailable(!!data.available))
      .catch(() => setAvailable(false));
  }, []);

  if (!available) return null;

  async function handleClaim() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/bootstrap", { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "เกิดข้อผิดพลาด");
      return;
    }
    window.location.reload();
  }

  return (
    <Card className="glass-card border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/20">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div>
          <p className="font-medium">ยังไม่มีผู้ดูแลระบบสูงสุด (Super Admin)</p>
          <p className="text-sm text-muted-foreground">คุณสามารถตั้งตัวเองเป็นผู้ดูแลระบบสูงสุดได้ครั้งเดียว ก่อนที่จะมีใครคนแรกตั้งไว้แล้ว</p>
          {error && <p className="text-sm text-destructive mt-1">{error}</p>}
        </div>
        <Button onClick={handleClaim} disabled={loading}>
          {loading ? "กำลังตั้งค่า..." : "ตั้งฉันเป็น Super Admin"}
        </Button>
      </CardContent>
    </Card>
  );
}

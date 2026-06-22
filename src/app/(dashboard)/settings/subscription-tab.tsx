"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PLAN_LABEL_TH, type PlanId } from "@/lib/admin/quotas";

interface SchoolWithQuota {
  id: string;
  plan: PlanId;
  school_quotas: { max_students: number; max_teachers: number; max_storage_mb: number; ai_credits_per_month: number; ai_credits_used_this_month: number } | null;
}

function UsageBar({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {used} / {max} ({pct}%)
        </span>
      </div>
      <Progress value={pct} />
    </div>
  );
}

/** school_admin: view-only usage bars for their own school. super_admin: can also change plan via /api/admin/schools/[id]. */
export function SubscriptionTab({ schoolId, isSuperAdmin, studentCount, teacherCount }: { schoolId: string; isSuperAdmin: boolean; studentCount: number; teacherCount: number }) {
  const [school, setSchool] = useState<SchoolWithQuota | null>(null);
  const [saving, setSaving] = useState(false);

  function reload() {
    fetch(`/api/admin/schools/${schoolId}`)
      .then((r) => r.json())
      .then((body) => {
        if (body.school) setSchool(body.school);
      });
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const quota = school?.school_quotas ?? undefined;

  async function changePlan(plan: string) {
    setSaving(true);
    const res = await fetch(`/api/admin/schools/${schoolId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("เปลี่ยนแพ็กเกจไม่สำเร็จ", { description: body.error });
      return;
    }
    toast.success("เปลี่ยนแพ็กเกจแล้ว");
    reload();
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        การจัดการแพ็กเกจนี้เป็นเพียงระบบติดตามโควตาการใช้งาน — ไม่มีการเชื่อมต่อระบบชำระเงินจริง (ไม่มี Stripe/Payment Gateway)
      </p>

      {isSuperAdmin && school && (
        <div className="flex items-center gap-3">
          <span className="text-sm">แพ็กเกจปัจจุบัน:</span>
          <Select value={school.plan} onValueChange={changePlan} disabled={saving}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PLAN_LABEL_TH).map(([id, label]) => (
                <SelectItem key={id} value={id}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {!isSuperAdmin && school && (
        <Badge variant="secondary">แพ็กเกจ: {PLAN_LABEL_TH[school.plan] ?? school.plan}</Badge>
      )}

      {quota ? (
        <div className="space-y-3 max-w-md">
          <UsageBar label="นักเรียน" used={studentCount} max={quota.max_students} />
          <UsageBar label="ครู" used={teacherCount} max={quota.max_teachers} />
          <UsageBar label="AI Credits / เดือน" used={quota.ai_credits_used_this_month} max={quota.ai_credits_per_month} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">กำลังโหลดข้อมูลโควตา...</p>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export interface SettingsField {
  key: string;
  label: string;
  type?: "text" | "number" | "time";
  placeholder?: string;
}

/**
 * Generic form for one system_settings category - reads/writes
 * /api/admin/settings/[category] (JSONB blob). Renders a flat list of
 * labeled inputs; categories needing richer UI (theme/roles/security) get
 * their own dedicated components instead of this generic one.
 */
export function SettingsCategoryForm({ category, fields, readOnly }: { category: string; fields: SettingsField[]; readOnly: boolean }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/settings/${category}`)
      .then((r) => r.json())
      .then((body) => {
        const settings = body.settings ?? {};
        const next: Record<string, string> = {};
        for (const f of fields) next[f.key] = settings[f.key] != null ? String(settings[f.key]) : "";
        setValues(next);
      })
      .catch(() => toast.error("โหลดการตั้งค่าไม่สำเร็จ"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  async function handleSave() {
    setSaving(true);
    const settings: Record<string, unknown> = {};
    for (const f of fields) {
      const v = values[f.key];
      settings[f.key] = f.type === "number" && v !== "" ? Number(v) : v;
    }
    const res = await fetch(`/api/admin/settings/${category}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("บันทึกไม่สำเร็จ", { description: body.error });
      return;
    }
    toast.success("บันทึกการตั้งค่าแล้ว");
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {fields.map((f) => (
          <Skeleton key={f.key} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.key} className="space-y-1">
          <Label className="text-xs text-muted-foreground">{f.label}</Label>
          <Input
            type={f.type === "number" ? "number" : f.type === "time" ? "time" : "text"}
            placeholder={f.placeholder}
            value={values[f.key] ?? ""}
            disabled={readOnly}
            onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
          />
        </div>
      ))}
      {!readOnly && (
        <div className="sm:col-span-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
          </Button>
        </div>
      )}
    </div>
  );
}

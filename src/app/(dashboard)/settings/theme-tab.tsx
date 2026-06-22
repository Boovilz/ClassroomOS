"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ThemeData {
  primary_color: string;
  secondary_color: string;
  logo_url: string | null;
  favicon_url: string | null;
  login_background_url: string | null;
}

const DEFAULT_THEME: ThemeData = {
  primary_color: "#4f46e5",
  secondary_color: "#0ea5e9",
  logo_url: null,
  favicon_url: null,
  login_background_url: null,
};

export function ThemeTab() {
  const [theme, setTheme] = useState<ThemeData>(DEFAULT_THEME);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/theme")
      .then((r) => r.json())
      .then((body) => {
        if (body.theme) setTheme(body.theme);
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/admin/theme", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(theme),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("บันทึกธีมไม่สำเร็จ", { description: body.error });
      return;
    }
    toast.success("บันทึกธีมแล้ว — ใช้งานได้ทันที");
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">สีหลัก (Primary)</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={theme.primary_color}
              onChange={(e) => setTheme((t) => ({ ...t, primary_color: e.target.value }))}
              className="h-9 w-12 rounded border"
            />
            <Input value={theme.primary_color} onChange={(e) => setTheme((t) => ({ ...t, primary_color: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">สีรอง (Secondary)</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={theme.secondary_color}
              onChange={(e) => setTheme((t) => ({ ...t, secondary_color: e.target.value }))}
              className="h-9 w-12 rounded border"
            />
            <Input value={theme.secondary_color} onChange={(e) => setTheme((t) => ({ ...t, secondary_color: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">URL โลโก้</Label>
          <Input value={theme.logo_url ?? ""} onChange={(e) => setTheme((t) => ({ ...t, logo_url: e.target.value }))} placeholder="https://..." />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">URL Favicon</Label>
          <Input value={theme.favicon_url ?? ""} onChange={(e) => setTheme((t) => ({ ...t, favicon_url: e.target.value }))} placeholder="https://..." />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">URL ภาพพื้นหลังหน้าเข้าสู่ระบบ</Label>
          <Input
            value={theme.login_background_url ?? ""}
            onChange={(e) => setTheme((t) => ({ ...t, login_background_url: e.target.value }))}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="rounded-xl border p-4" style={{ borderColor: theme.primary_color }}>
        <p className="text-xs text-muted-foreground mb-2">ตัวอย่าง (พรีวิว)</p>
        <div className="flex gap-2">
          <span className="rounded-lg px-3 py-1.5 text-sm font-medium text-white" style={{ backgroundColor: theme.primary_color }}>
            ปุ่มหลัก
          </span>
          <span className="rounded-lg px-3 py-1.5 text-sm font-medium text-white" style={{ backgroundColor: theme.secondary_color }}>
            ปุ่มรอง
          </span>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "กำลังบันทึก..." : "บันทึกธีม"}
      </Button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PROVIDERS = [
  { value: "anthropic", label: "Anthropic (Claude)", placeholder: "claude-sonnet-4-5" },
  { value: "openai", label: "OpenAI (GPT)", placeholder: "gpt-4o" },
  { value: "gemini", label: "Google Gemini", placeholder: "gemini-2.0-flash" },
];

export function AiProviderTab() {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<string | null>(null);

  const [provider, setProvider] = useState("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/ai-provider")
      .then((r) => r.json())
      .then((body) => {
        setConfigured(!!body.configured);
        setActiveProvider(body.provider ?? null);
        setActiveModel(body.model ?? null);
        if (body.provider) setProvider(body.provider);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!apiKey.trim()) {
      toast.error("กรุณากรอก API key");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/ai-provider", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, apiKey, model: model.trim() || undefined }),
    });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      toast.error("บันทึกไม่สำเร็จ", { description: body.error });
      return;
    }
    toast.success("บันทึกการตั้งค่า AI Provider สำเร็จ");
    setConfigured(true);
    setActiveProvider(provider);
    setActiveModel(model.trim() || null);
    setApiKey("");
  }

  async function handleClear() {
    const res = await fetch("/api/admin/ai-provider", { method: "DELETE" });
    if (res.ok) {
      toast.success("ลบการตั้งค่าของโรงเรียนแล้ว — ระบบจะใช้ค่าเริ่มต้นจากเซิร์ฟเวอร์ (.env) แทน");
      setConfigured(false);
      setActiveProvider(null);
      setActiveModel(null);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">กำลังโหลด...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {configured ? (
          <>
            <Badge variant="success">ใช้งาน: {PROVIDERS.find((p) => p.value === activeProvider)?.label ?? activeProvider}</Badge>
            {activeModel && <Badge variant="outline">{activeModel}</Badge>}
            <Button size="sm" variant="outline" onClick={handleClear}>
              ลบการตั้งค่านี้
            </Button>
          </>
        ) : (
          <Badge variant="secondary">ยังไม่ได้ตั้งค่าระดับโรงเรียน (ใช้ค่าเริ่มต้นจาก .env ของเซิร์ฟเวอร์ ถ้ามี)</Badge>
        )}
      </div>

      <div className="max-w-md space-y-4">
        <div className="space-y-1.5">
          <Label>ผู้ให้บริการ AI</Label>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>API Key</Label>
          <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
          <p className="text-xs text-muted-foreground">คีย์นี้จะถูกเก็บไว้สำหรับโรงเรียนนี้เท่านั้น และจะถูกแทนที่ทุกครั้งที่บันทึกใหม่</p>
        </div>
        <div className="space-y-1.5">
          <Label>โมเดล (ไม่บังคับ)</Label>
          <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder={PROVIDERS.find((p) => p.value === provider)?.placeholder} />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
      </div>
    </div>
  );
}

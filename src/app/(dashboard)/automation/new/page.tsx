"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Save, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  TriggerModule, Condition, ActionDef, ActionType,
  TRIGGER_CATALOG, CONDITION_FIELDS, CONDITION_OPERATORS, ACTION_CATALOG,
  ConditionOperator, LogicOperator,
} from "@/lib/automation/types";

const STEPS = ["Trigger", "Conditions", "Actions", "Review"];

function TriggerStep({ trigger, onChange }: {
  trigger: { module: TriggerModule; event: string };
  onChange: (t: { module: TriggerModule; event: string }) => void;
}) {
  const modules = Object.entries(TRIGGER_CATALOG) as [TriggerModule, typeof TRIGGER_CATALOG[TriggerModule]][];
  const events  = TRIGGER_CATALOG[trigger.module]?.events ?? [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">เลือก Module และเหตุการณ์ที่จะเริ่ม Workflow</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {modules.map(([mod, def]) => (
          <button
            key={mod}
            onClick={() => onChange({ module: mod, event: def.events[0]?.event ?? "" })}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
              trigger.module === mod
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted"
            )}
          >
            <span className="text-xl">{def.icon}</span>
            <div>
              <p className="text-sm font-medium">{def.label}</p>
              <p className="text-xs text-muted-foreground">{def.events.length} เหตุการณ์</p>
            </div>
          </button>
        ))}
      </div>

      {events.length > 0 && (
        <div className="space-y-1.5">
          <Label>เหตุการณ์ที่ต้องการ</Label>
          <div className="flex flex-wrap gap-2">
            {events.map(e => (
              <button
                key={e.event}
                onClick={() => onChange({ ...trigger, event: e.event })}
                className={cn(
                  "rounded-full px-3 py-1 text-sm border transition-colors",
                  trigger.event === e.event
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted"
                )}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ConditionsStep({ conditions, onChange }: {
  conditions: Condition[];
  onChange: (c: Condition[]) => void;
}) {
  const add = () => onChange([...conditions, {
    id: crypto.randomUUID(), field: "consecutive_absences", operator: "gte", value: 3, logic: "AND",
  }]);

  const update = (id: string, patch: Partial<Condition>) =>
    onChange(conditions.map(c => c.id === id ? { ...c, ...patch } : c));

  const remove = (id: string) => onChange(conditions.filter(c => c.id !== id));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        กำหนดเงื่อนไขที่ต้องตรงก่อน Workflow จะทำงาน (ไม่บังคับ)
      </p>
      {conditions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-2xl">
          <p className="text-sm">ไม่มีเงื่อนไข — Workflow จะทำงานทุกครั้งที่ Trigger ถูกกระตุ้น</p>
        </div>
      )}
      {conditions.map((cond, idx) => (
        <div key={cond.id} className="flex gap-2 items-center flex-wrap">
          {idx > 0 && (
            <Select value={cond.logic} onValueChange={v => update(cond.id, { logic: v as LogicOperator })}>
              <SelectTrigger className="w-20 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">AND</SelectItem>
                <SelectItem value="OR">OR</SelectItem>
              </SelectContent>
            </Select>
          )}
          {idx === 0 && <span className="text-xs text-muted-foreground w-20 text-right">IF</span>}

          <Select value={cond.field} onValueChange={v => update(cond.id, { field: v })}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONDITION_FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={cond.operator} onValueChange={v => update(cond.id, { operator: v as ConditionOperator })}>
            <SelectTrigger className="w-20 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONDITION_OPERATORS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <Input
            className="w-28 h-8 text-xs"
            value={String(cond.value)}
            onChange={e => update(cond.id, { value: e.target.value })}
            placeholder="ค่า"
          />

          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(cond.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" /> เพิ่มเงื่อนไข
      </Button>
    </div>
  );
}

function ActionsStep({ actions, onChange }: {
  actions: ActionDef[];
  onChange: (a: ActionDef[]) => void;
}) {
  const add = () => onChange([...actions, { id: crypto.randomUUID(), type: "send_notification", config: {} }]);
  const update = (id: string, patch: Partial<ActionDef>) =>
    onChange(actions.map(a => a.id === id ? { ...a, ...patch } : a));
  const remove = (id: string) => onChange(actions.filter(a => a.id !== id));

  const actionTypes = Object.entries(ACTION_CATALOG) as [ActionType, typeof ACTION_CATALOG[ActionType]][];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">กำหนดสิ่งที่ระบบจะทำเมื่อ Workflow ทำงาน</p>
      {actions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-2xl">
          <p className="text-sm">ยังไม่มี Action — กด "เพิ่ม Action" เพื่อเริ่มต้น</p>
        </div>
      )}
      {actions.map((action, idx) => {
        const catalog = ACTION_CATALOG[action.type];
        return (
          <div key={action.id} className="glass-card rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                {idx + 1}
              </span>
              <Select value={action.type} onValueChange={v => update(action.id, { type: v as ActionType, config: {} })}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {actionTypes.map(([t, def]) => (
                    <SelectItem key={t} value={t}>{def.icon} {def.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(action.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Action config fields */}
            {catalog?.fields.map(field => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-xs">{field.label}</Label>
                {field.type === "select" ? (
                  <Select
                    value={String(action.config[field.key] ?? "")}
                    onValueChange={v => update(action.id, { config: { ...action.config, [field.key]: v } })}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="เลือก..." />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={field.type}
                    className="h-8 text-sm"
                    value={String(action.config[field.key] ?? "")}
                    onChange={e => update(action.id, { config: { ...action.config, [field.key]: field.type === "number" ? Number(e.target.value) : e.target.value } })}
                    placeholder={field.label}
                  />
                )}
              </div>
            ))}
          </div>
        );
      })}
      <Button variant="outline" size="sm" onClick={add} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" /> เพิ่ม Action
      </Button>
    </div>
  );
}

export default function NewWorkflowPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState<{ module: TriggerModule; event: string }>({ module: "attendance", event: "absent" });
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [actions, setActions] = useState<ActionDef[]>([]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/automation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, trigger, conditions, actions, enabled: true }),
    });
    if (res.ok) router.push("/automation");
    setSaving(false);
  };

  const canNext = () => {
    if (step === 0) return !!trigger.event;
    if (step === 2) return actions.length > 0;
    return true;
  };

  const trig = TRIGGER_CATALOG[trigger.module];
  const evt  = trig?.events.find(e => e.event === trigger.event);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/automation"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">สร้าง Workflow ใหม่</h1>
          <p className="text-sm text-muted-foreground">กำหนดกฎอัตโนมัติแบบ Trigger → Condition → Action</p>
        </div>
      </div>

      {/* Name + Description (always visible) */}
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <div className="space-y-1.5">
          <Label>ชื่อ Workflow <span className="text-destructive">*</span></Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="เช่น แจ้งเตือนนักเรียนขาดเรียน 3 วัน" />
        </div>
        <div className="space-y-1.5">
          <Label>คำอธิบาย</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="อธิบาย Workflow นี้ทำอะไร..." rows={2} />
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => i < step && setStep(i)} className="flex items-center gap-1">
            <span className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
              i < step  ? "bg-primary text-primary-foreground cursor-pointer" :
              i === step ? "bg-primary text-primary-foreground" :
              "bg-muted text-muted-foreground"
            )}>
              {i + 1}
            </span>
            <span className={cn("text-xs font-medium hidden sm:block", i === step ? "text-foreground" : "text-muted-foreground")}>
              {s}
            </span>
            {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground mx-1" />}
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="glass-card rounded-2xl p-5">
        {step === 0 && <TriggerStep trigger={trigger} onChange={setTrigger} />}
        {step === 1 && <ConditionsStep conditions={conditions} onChange={setConditions} />}
        {step === 2 && <ActionsStep actions={actions} onChange={setActions} />}

        {/* Review */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm font-semibold">ตรวจสอบ Workflow ก่อนบันทึก</p>
            <div className="space-y-2 text-sm">
              <div className="flex gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
                <span className="font-medium text-blue-700 dark:text-blue-300 w-20 shrink-0">Trigger</span>
                <span>{trig?.icon} {trig?.label} → {evt?.label}</span>
              </div>
              <div className="flex gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-xl">
                <span className="font-medium text-yellow-700 dark:text-yellow-300 w-20 shrink-0">Conditions</span>
                <span>{conditions.length > 0 ? `${conditions.length} เงื่อนไข` : "ไม่มีเงื่อนไข (ทำงานทุกครั้ง)"}</span>
              </div>
              <div className="flex gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-xl">
                <span className="font-medium text-green-700 dark:text-green-300 w-20 shrink-0">Actions</span>
                <div className="space-y-0.5">
                  {actions.map((a, i) => (
                    <div key={a.id}>{i + 1}. {ACTION_CATALOG[a.type]?.icon} {ACTION_CATALOG[a.type]?.label}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>
          ก่อนหน้า
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
            ถัดไป <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving || !name.trim() || actions.length === 0} className="gap-1.5">
            <Save className="h-4 w-4" />
            {saving ? "กำลังบันทึก..." : "บันทึก Workflow"}
          </Button>
        )}
      </div>
    </div>
  );
}

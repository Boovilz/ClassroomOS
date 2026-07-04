"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Play, Pause, Trash2, ExternalLink, Zap, CheckCircle2, XCircle, AlertCircle, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Workflow, ExecutionLog, TRIGGER_CATALOG, WORKFLOW_TEMPLATES, ACTION_CATALOG } from "@/lib/automation/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

function StatusBadge({ status }: { status: ExecutionLog["status"] }) {
  if (status === "success") return <Badge className="bg-green-500 text-white gap-1"><CheckCircle2 className="h-3 w-3" />สำเร็จ</Badge>;
  if (status === "failed")  return <Badge className="bg-destructive text-white gap-1"><XCircle className="h-3 w-3" />ล้มเหลว</Badge>;
  return <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" />ข้ามไป</Badge>;
}

export default function AutomationPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [wRes, lRes] = await Promise.all([
      fetch("/api/automation"),
      fetch("/api/automation/logs?limit=20"),
    ]);
    if (wRes.ok) { const j = await wRes.json(); setWorkflows(j.workflows ?? []); }
    if (lRes.ok) { const j = await lRes.json(); setLogs(j.logs ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleEnabled = async (wf: Workflow) => {
    await fetch(`/api/automation/${wf.workflow_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !wf.enabled }),
    });
    setWorkflows(prev => prev.map(w => w.workflow_id === wf.workflow_id ? { ...w, enabled: !wf.enabled } : w));
  };

  const deleteWorkflow = async (id: string) => {
    await fetch(`/api/automation/${id}`, { method: "DELETE" });
    setWorkflows(prev => prev.filter(w => w.workflow_id !== id));
  };

  const manualRun = async (wf: Workflow) => {
    setRunning(wf.workflow_id);
    const res = await fetch("/api/automation/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflow_id: wf.workflow_id, trigger_data: { module: wf.trigger.module } }),
    });
    if (res.ok) {
      const j = await res.json();
      setLogs(prev => [j.log, ...prev].slice(0, 50));
      setWorkflows(prev => prev.map(w => w.workflow_id === wf.workflow_id ? { ...w, run_count: w.run_count + 1, last_run_at: new Date().toISOString() } : w));
    }
    setRunning(null);
  };

  const installTemplate = async (tpl: typeof WORKFLOW_TEMPLATES[number]) => {
    const res = await fetch("/api/automation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template: tpl }),
    });
    if (res.ok) { const j = await res.json(); setWorkflows(prev => [j.workflow, ...prev]); }
  };

  // Stats
  const totalRuns   = logs.length;
  const successRuns = logs.filter(l => l.status === "success").length;
  const failedRuns  = logs.filter(l => l.status === "failed").length;
  const activeCount = workflows.filter(w => w.enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
            <Zap className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Workflow Automation</h1>
            <p className="text-sm text-muted-foreground">กฎอัตโนมัติแบบ No-Code สำหรับทุกโมดูล</p>
          </div>
        </div>
        <Button asChild className="gap-1.5">
          <Link href="/automation/new"><Plus className="h-4 w-4" /> สร้าง Workflow</Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Workflow ทั้งหมด",  value: workflows.length, icon: <Zap className="h-4 w-4" />,          color: "text-violet-500" },
          { label: "เปิดใช้งาน",         value: activeCount,      icon: <CheckCircle2 className="h-4 w-4" />, color: "text-green-500" },
          { label: "รันสำเร็จ",           value: successRuns,      icon: <BarChart3 className="h-4 w-4" />,    color: "text-blue-500" },
          { label: "ล้มเหลว",             value: failedRuns,       icon: <XCircle className="h-4 w-4" />,      color: "text-destructive" },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-2xl p-4 flex items-center gap-3">
            <span className={s.color}>{s.icon}</span>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="workflows">
        <TabsList>
          <TabsTrigger value="workflows">Workflows ({workflows.length})</TabsTrigger>
          <TabsTrigger value="templates">เทมเพลต</TabsTrigger>
          <TabsTrigger value="logs">ประวัติ</TabsTrigger>
        </TabsList>

        {/* ── Workflows tab ─────────────────────────────────────────────── */}
        <TabsContent value="workflows" className="space-y-3 mt-4">
          {loading && (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />)}
            </div>
          )}
          {!loading && workflows.length === 0 && (
            <div className="text-center py-16 text-muted-foreground space-y-3">
              <Zap className="h-12 w-12 mx-auto opacity-30" />
              <p>ยังไม่มี Workflow</p>
              <p className="text-sm">เริ่มต้นด้วยการสร้าง Workflow หรือติดตั้งจากเทมเพลต</p>
              <Button asChild variant="outline"><Link href="/automation/new">สร้าง Workflow แรก</Link></Button>
            </div>
          )}
          {workflows.map(wf => {
            const trig = TRIGGER_CATALOG[wf.trigger.module];
            const evt  = trig?.events.find(e => e.event === wf.trigger.event);
            return (
              <div key={wf.workflow_id} className={cn(
                "glass-card rounded-2xl p-5 transition-all",
                !wf.enabled && "opacity-60"
              )}>
                <div className="flex items-start gap-4 flex-wrap">
                  {/* Icon */}
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl text-lg shrink-0",
                    wf.enabled ? "bg-violet-500/10" : "bg-muted"
                  )}>
                    {trig?.icon ?? "⚙️"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{wf.name}</h3>
                      <Badge variant={wf.enabled ? "default" : "secondary"} className="text-[10px]">
                        {wf.enabled ? "เปิด" : "ปิด"}
                      </Badge>
                    </div>
                    {wf.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">{wf.description}</p>
                    )}
                    {/* Flow summary */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded px-1.5 py-0.5">
                        {trig?.icon} {trig?.label} · {evt?.label ?? wf.trigger.event}
                      </span>
                      {wf.conditions.length > 0 && (
                        <><span>→</span><span className="bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300 rounded px-1.5 py-0.5">{wf.conditions.length} เงื่อนไข</span></>
                      )}
                      {wf.actions.map(a => (
                        <><span key={`arr-${a.id}`}>→</span><span key={a.id} className="bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 rounded px-1.5 py-0.5">{ACTION_CATALOG[a.type]?.icon} {ACTION_CATALOG[a.type]?.label}</span></>
                      ))}
                    </div>
                    <div className="flex gap-3 mt-2 text-[11px] text-muted-foreground">
                      <span>รัน {wf.run_count} ครั้ง</span>
                      {wf.last_run_at && <span>ล่าสุด {new Date(wf.last_run_at).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => manualRun(wf)}
                      disabled={!wf.enabled || running === wf.workflow_id}
                      title="รัน Manual"
                    >
                      {running === wf.workflow_id
                        ? <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                        : <Play className="h-3.5 w-3.5" />
                      }
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => toggleEnabled(wf)}
                      title={wf.enabled ? "ปิด" : "เปิด"}
                    >
                      {wf.enabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 text-green-600" />}
                    </Button>
                    <Button variant="outline" size="sm" asChild title="แก้ไข">
                      <Link href={`/automation/${wf.workflow_id}`}><ExternalLink className="h-3.5 w-3.5" /></Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>ลบ Workflow</AlertDialogTitle>
                          <AlertDialogDescription>ต้องการลบ &quot;{wf.name}&quot; ใช่หรือไม่? การกระทำนี้ไม่สามารถยกเลิกได้</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteWorkflow(wf.workflow_id)} className="bg-destructive text-destructive-foreground">ลบ</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* ── Templates tab ─────────────────────────────────────────────── */}
        <TabsContent value="templates" className="mt-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {WORKFLOW_TEMPLATES.map((tpl, i) => {
              const trig = TRIGGER_CATALOG[tpl.trigger.module];
              const alreadyInstalled = workflows.some(w => w.name === tpl.name);
              return (
                <div key={i} className="glass-card rounded-2xl p-5 space-y-3 flex flex-col">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{trig?.icon ?? "⚙️"}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{tpl.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{tpl.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    <span className="bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded px-1.5 py-0.5">
                      {trig?.label}
                    </span>
                    {tpl.conditions.length > 0 && (
                      <span className="bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300 rounded px-1.5 py-0.5">
                        {tpl.conditions.length} เงื่อนไข
                      </span>
                    )}
                    {tpl.actions.map(a => (
                      <span key={a.id} className="bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 rounded px-1.5 py-0.5">
                        {ACTION_CATALOG[a.type]?.icon} {ACTION_CATALOG[a.type]?.label}
                      </span>
                    ))}
                  </div>
                  <div className="mt-auto">
                    <Button
                      size="sm" className="w-full"
                      variant={alreadyInstalled ? "secondary" : "default"}
                      disabled={alreadyInstalled}
                      onClick={() => installTemplate(tpl)}
                    >
                      {alreadyInstalled ? "ติดตั้งแล้ว" : "ติดตั้ง Template"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Logs tab ──────────────────────────────────────────────────── */}
        <TabsContent value="logs" className="mt-4">
          {logs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-8 w-8 mx-auto opacity-30 mb-2" />
              <p className="text-sm">ยังไม่มีประวัติการรัน</p>
            </div>
          )}
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.log_id} className="glass-card rounded-xl px-4 py-3 flex items-center gap-4 flex-wrap">
                <StatusBadge status={log.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{log.workflow_name}</p>
                  {log.action_results.length > 0 && (
                    <p className="text-xs text-muted-foreground truncate">
                      {log.action_results.map(r => r.message).join(" · ")}
                    </p>
                  )}
                  {log.error && (
                    <p className="text-xs text-destructive truncate">{log.error}</p>
                  )}
                </div>
                <div className="text-right text-xs text-muted-foreground shrink-0">
                  <div>{new Date(log.executed_at).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}</div>
                  <div>{log.duration_ms}ms</div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

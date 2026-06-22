"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Upload } from "lucide-react";

interface BackupJobRow {
  id: string;
  job_type: string;
  direction: string;
  target: string;
  status: string;
  row_counts: Record<string, number> | null;
  error_message: string | null;
  created_at: string;
}

const STATUS_VARIANT: Record<string, "success" | "secondary" | "destructive"> = {
  completed: "success",
  running: "secondary",
  pending: "secondary",
  failed: "destructive",
};

export function BackupTab() {
  const [jobs, setJobs] = useState<BackupJobRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [cloudConfigured, setCloudConfigured] = useState(true);

  function reload() {
    fetch("/api/admin/backup")
      .then((r) => r.json())
      .then((body) => {
        setJobs(body.jobs ?? []);
        setCloudConfigured(body.cloudBackupConfigured ?? false);
      });
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleBackup() {
    setBusy(true);
    const res = await fetch("/api/admin/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: "local" }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      toast.error("สำรองข้อมูลไม่สำเร็จ", { description: body.error });
      reload();
      return;
    }
    // Download the JSON snapshot client-side.
    const blob = new Blob([JSON.stringify(body.snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `classroomos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("สำรองข้อมูลสำเร็จ — ไฟล์ถูกดาวน์โหลดแล้ว");
    reload();
  }

  async function handleRestore(file: File) {
    setBusy(true);
    try {
      const text = await file.text();
      const snapshot = JSON.parse(text);
      const res = await fetch("/api/admin/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("กู้คืนข้อมูลไม่สำเร็จ", { description: body.error });
      } else {
        toast.success("กู้คืนข้อมูลสำเร็จ");
      }
    } catch {
      toast.error("ไฟล์สำรองข้อมูลไม่ถูกต้อง");
    }
    setBusy(false);
    reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleBackup} disabled={busy}>
          <Download className="mr-2 h-4 w-4" /> สำรองข้อมูล (ดาวน์โหลด JSON)
        </Button>
        <label className="inline-flex">
          <Button asChild variant="outline" disabled={busy}>
            <span>
              <Upload className="mr-2 h-4 w-4" /> กู้คืนจากไฟล์สำรอง
            </span>
          </Button>
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleRestore(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {!cloudConfigured && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          ยังไม่ได้ตั้งค่าระบบสำรองข้อมูลบนคลาวด์ (BACKUP_CLOUD_BUCKET ฯลฯ) — ใช้การสำรองข้อมูลแบบไฟล์ในเครื่อง/ดาวน์โหลดได้ตามปกติ
        </p>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>เวลา</TableHead>
            <TableHead>ประเภท</TableHead>
            <TableHead>เป้าหมาย</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead>รายละเอียด</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">ยังไม่มีประวัติการสำรองข้อมูล</TableCell>
            </TableRow>
          ) : (
            jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell className="text-xs">{new Date(job.created_at).toLocaleString("th-TH")}</TableCell>
                <TableCell>{job.direction === "restore" ? "กู้คืน" : "สำรองข้อมูล"}</TableCell>
                <TableCell>{job.target === "cloud" ? "คลาวด์" : "เครื่องนี้"}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[job.status] ?? "secondary"}>{job.status}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {job.error_message ?? (job.row_counts ? Object.entries(job.row_counts).map(([t, n]) => `${t}:${n}`).join(", ") : "-")}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

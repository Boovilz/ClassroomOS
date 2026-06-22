"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ImportJobRow } from "@/lib/queries/import-jobs";

const sourceLabel: Record<string, string> = {
  excel: "Excel",
  csv: "CSV",
  api: "API",
  qr: "QR",
};

const statusLabel: Record<string, string> = {
  pending: "รอดำเนินการ",
  processing: "กำลังประมวลผล",
  completed: "สำเร็จ",
  completed_with_errors: "สำเร็จ (มีข้อผิดพลาด)",
  rolled_back: "ยกเลิกแล้ว",
};

const statusVariant: Record<string, "success" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  processing: "secondary",
  completed: "success",
  completed_with_errors: "destructive",
  rolled_back: "outline",
};

export function ImportJobsTable({ jobs }: { jobs: ImportJobRow[] }) {
  const router = useRouter();
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);

  async function handleRollback(jobId: string) {
    if (!window.confirm("ยืนยันการยกเลิกการนำเข้านี้? นักเรียนที่สร้างใหม่จะถูกย้ายไปถังขยะ และข้อมูลที่อัปเดตจะถูกคืนค่าเดิม")) return;
    setRollingBackId(jobId);
    try {
      const res = await fetch("/api/students/import/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importJobId: jobId }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error("ยกเลิกไม่สำเร็จ", { description: data.message });
      } else {
        toast.success(`ยกเลิกการนำเข้าแล้ว (กู้คืน ${data.restoredCount} รายการ, ลบ ${data.softDeletedCount} รายการ)`);
        router.refresh();
      }
    } finally {
      setRollingBackId(null);
    }
  }

  if (jobs.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีประวัติการนำเข้า</p>;
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>วันที่</TableHead>
            <TableHead>แหล่งข้อมูล</TableHead>
            <TableHead>ไฟล์</TableHead>
            <TableHead>ผู้นำเข้า</TableHead>
            <TableHead>สำเร็จ/อัปเดต/ล้มเหลว</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead>การจัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id}>
              <TableCell>{new Date(job.created_at).toLocaleString("th-TH")}</TableCell>
              <TableCell>{sourceLabel[job.source] ?? job.source}</TableCell>
              <TableCell>{job.file_name ?? "-"}</TableCell>
              <TableCell>{job.importer_name ?? "-"}</TableCell>
              <TableCell>
                {job.succeeded_count} / {job.updated_count} / {job.failed_count}
                <span className="text-muted-foreground"> (รวม {job.total_rows})</span>
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant[job.status] ?? "outline"}>{statusLabel[job.status] ?? job.status}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/students/import/${job.id}`}>ดูรายละเอียด</Link>
                  </Button>
                  {(job.status === "completed" || job.status === "completed_with_errors") && (
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={rollingBackId === job.id}
                      onClick={() => handleRollback(job.id)}
                    >
                      ยกเลิกการนำเข้า
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

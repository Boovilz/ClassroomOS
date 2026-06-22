import Link from "next/link";
import { notFound } from "next/navigation";
import { getImportJob, getImportJobRows } from "@/lib/queries/import-jobs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

const actionLabel: Record<string, string> = {
  created: "สร้างใหม่",
  updated: "อัปเดต",
  merged: "ผสานข้อมูล",
  skipped: "ข้าม",
  failed: "ล้มเหลว",
};

const actionVariant: Record<string, "success" | "secondary" | "destructive" | "outline"> = {
  created: "success",
  updated: "secondary",
  merged: "secondary",
  skipped: "outline",
  failed: "destructive",
};

export default async function ImportJobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = await getImportJob(jobId);
  if (!job) notFound();

  const rows = await getImportJobRows(jobId);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/students/import">
          <ArrowLeft className="mr-2 h-4 w-4" />
          กลับไปหน้านำเข้านักเรียน
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold">รายละเอียดการนำเข้า</h1>
        <p className="text-sm text-muted-foreground">
          {job.file_name ?? "(ไม่มีไฟล์)"} · {new Date(job.created_at).toLocaleString("th-TH")} · ทั้งหมด {job.total_rows} แถว
        </p>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>แถวที่</TableHead>
              <TableHead>ผลลัพธ์</TableHead>
              <TableHead>ข้อผิดพลาด</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  ไม่มีข้อมูล
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.row_number}</TableCell>
                  <TableCell>
                    <Badge variant={actionVariant[row.action] ?? "outline"}>{actionLabel[row.action] ?? row.action}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-destructive">{row.error_message ?? "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

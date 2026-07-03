import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateSupervisionDialog } from "./create-supervision-dialog";

const statusLabel: Record<string, string> = {
  draft: "ร่าง",
  completed: "เสร็จสิ้น",
  acknowledged: "รับทราบแล้ว",
};

const statusVariant: Record<string, "secondary" | "default" | "outline"> = {
  draft: "secondary",
  completed: "default",
  acknowledged: "outline",
};

export default async function SupervisionPage() {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase
        .from("users")
        .select("id, school_id")
        .eq("id", auth.user.id)
        .single()
    : { data: null };

  type SupervisionRow = {
    id: string;
    supervised_at: string;
    subject: string | null;
    classroom: string | null;
    total_score: number | null;
    status: string;
    teacher_name: string | null;
  };

  const { data: records } = profile?.school_id
    ? await supabase
        .from("supervision_records")
        .select("id, supervised_at, subject, classroom, total_score, status, teacher_name")
        .eq("school_id", profile.school_id)
        .order("supervised_at", { ascending: false })
        .returns<SupervisionRow[]>()
    : { data: [] as SupervisionRow[] };

  const rows = records ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">บันทึกการนิเทศการสอน</h1>
          <p className="text-sm text-muted-foreground">
            ติดตามและบันทึกผลการนิเทศการสอนของครูในโรงเรียน
          </p>
        </div>
        {profile?.school_id && (
          <CreateSupervisionDialog schoolId={profile.school_id} supervisorId={profile.id} />
        )}
      </div>

      {rows.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex h-40 items-center justify-center">
            <p className="text-muted-foreground">
              ยังไม่มีบันทึกการนิเทศ กดปุ่ม &quot;บันทึกการนิเทศใหม่&quot; เพื่อเริ่มต้น
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead>ครูผู้สอน</TableHead>
                  <TableHead>วิชา</TableHead>
                  <TableHead>ห้องเรียน</TableHead>
                  <TableHead className="text-center">คะแนนรวม</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">รายละเอียด</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      {new Date(row.supervised_at).toLocaleDateString("th-TH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell>{row.teacher_name ?? "-"}</TableCell>
                    <TableCell>{row.subject ?? "-"}</TableCell>
                    <TableCell>{row.classroom ?? "-"}</TableCell>
                    <TableCell className="text-center font-semibold">
                      {row.total_score ?? "-"}
                      <span className="text-xs text-muted-foreground">/25</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[row.status] ?? "secondary"}>
                        {statusLabel[row.status] ?? row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/supervision/${row.id}`}>ดูรายละเอียด</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

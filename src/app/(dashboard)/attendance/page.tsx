import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusLabel: Record<string, string> = {
  present: "มาเรียน",
  late: "มาสาย",
  sick: "ลาป่วย",
  personal_leave: "ลากิจ",
  absent: "ขาดเรียน",
};

const statusVariant: Record<string, "secondary" | "destructive" | "outline"> = {
  present: "secondary",
  late: "outline",
  sick: "outline",
  personal_leave: "outline",
  absent: "destructive",
};

export default async function AttendancePage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: records } = await supabase
    .from("attendance")
    .select("id, status, check_in_time, students(full_name, student_code, classroom)")
    .eq("date", today)
    .order("check_in_time", { ascending: true })
    .returns<
      {
        id: string;
        status: string;
        check_in_time: string | null;
        students: { full_name: string; student_code: string; classroom: string | null } | null;
      }[]
    >();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">การเข้าเรียน</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/attendance/qr">เช็คอินด้วย QR</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/attendance/kiosk">โหมดคีออส</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายชื่อวันนี้ ({today})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>รหัสนักเรียน</TableHead>
                <TableHead>ชื่อ-นามสกุล</TableHead>
                <TableHead>ห้องเรียน</TableHead>
                <TableHead>เวลาเช็คอิน</TableHead>
                <TableHead>สถานะ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records && records.length > 0 ? (
                records.map((r) => {
                  const student = Array.isArray(r.students) ? r.students[0] : r.students;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{student?.student_code}</TableCell>
                      <TableCell>{student?.full_name}</TableCell>
                      <TableCell>{student?.classroom ?? "-"}</TableCell>
                      <TableCell>
                        {r.check_in_time
                          ? new Date(r.check_in_time).toLocaleTimeString("th-TH")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[r.status] ?? "outline"}>
                          {statusLabel[r.status] ?? r.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    ยังไม่มีข้อมูลการเช็คชื่อวันนี้
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

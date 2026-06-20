import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getFoodSafetyLogs } from "@/lib/queries/lunch";
import { FoodSafetyLogFormDialog } from "./food-safety-log-form-dialog";

const logTypeLabel: Record<string, string> = {
  inspection: "ตรวจสอบ",
  hygiene: "สุขลักษณะ",
  equipment_maintenance: "บำรุงอุปกรณ์",
  temperature: "ควบคุมอุณหภูมิ",
  cleaning_schedule: "ตารางทำความสะอาด",
};

const resultLabel: Record<string, string> = {
  pass: "ผ่าน",
  fail: "ไม่ผ่าน",
  needs_attention: "ต้องติดตาม",
};

export default async function LunchFoodSafetyPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id").eq("id", auth.user.id).single()
    : { data: null };
  const schoolId = profile?.school_id ?? null;

  const logs = schoolId ? await getFoodSafetyLogs(schoolId) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ความปลอดภัยอาหาร</h1>
          <p className="text-sm text-muted-foreground">บันทึกการตรวจสอบ สุขลักษณะ อุณหภูมิ และตารางทำความสะอาด</p>
        </div>
        {schoolId && <FoodSafetyLogFormDialog schoolId={schoolId} />}
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>บันทึกความปลอดภัยอาหาร</CardTitle>
          <CardDescription>ประวัติการตรวจสอบและบันทึกความปลอดภัยอาหารทั้งหมด</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>วันที่</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead>หัวข้อ</TableHead>
                <TableHead>ผลลัพธ์</TableHead>
                <TableHead>อุณหภูมิ (°C)</TableHead>
                <TableHead>หมายเหตุ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    ยังไม่มีบันทึกความปลอดภัยอาหาร
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{new Date(log.log_date).toLocaleDateString("th-TH")}</TableCell>
                    <TableCell>{logTypeLabel[log.log_type] ?? log.log_type}</TableCell>
                    <TableCell>{log.subject}</TableCell>
                    <TableCell>
                      {log.result ? (
                        <Badge variant={log.result === "fail" ? "destructive" : log.result === "needs_attention" ? "secondary" : "success"}>
                          {resultLabel[log.result] ?? log.result}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{log.temperature_celsius ?? "-"}</TableCell>
                    <TableCell>{log.notes ?? "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

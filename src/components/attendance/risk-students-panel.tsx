import { getRiskStudents } from "@/lib/queries/attendance";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const riskVariant = {
  high: "destructive" as const,
  medium: "outline" as const,
  low: "secondary" as const,
};

const riskLabel = {
  high: "ความเสี่ยงสูง",
  medium: "ความเสี่ยงปานกลาง",
  low: "ปกติ",
};

/** Rule-based risk detection panel — server component, no external AI calls. */
export async function RiskStudentsPanel() {
  const riskStudents = await getRiskStudents();

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>นักเรียนกลุ่มเสี่ยง</CardTitle>
        <CardDescription>วิเคราะห์จากการขาด/มาสายต่อเนื่อง 30 วันล่าสุด (อิงตามกฎที่ตั้งไว้ ไม่ใช้ AI ภายนอก)</CardDescription>
      </CardHeader>
      <CardContent>
        {riskStudents.length === 0 ? (
          <p className="text-sm text-muted-foreground">ไม่พบนักเรียนกลุ่มเสี่ยงในขณะนี้</p>
        ) : (
          <ul className="space-y-3">
            {riskStudents.map((s) => (
              <li key={s.student_id} className="flex items-start justify-between gap-3 rounded-xl border border-border/60 p-3">
                <div>
                  <p className="font-medium">
                    {s.full_name} <span className="text-xs text-muted-foreground">({s.student_code})</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{s.classroom ?? "-"}</p>
                  <p className="mt-1 text-sm">{s.reason}</p>
                  <p className="text-xs text-muted-foreground">อัตราการเข้าเรียน {s.attendance_rate_percent}%</p>
                </div>
                <Badge variant={riskVariant[s.risk_level]}>{riskLabel[s.risk_level]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

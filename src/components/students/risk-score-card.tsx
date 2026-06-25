import { Badge } from "@/components/ui/badge";
import type { StudentRiskScore } from "@/lib/queries/risk-score";

const bandLabel: Record<StudentRiskScore["band"], string> = { low: "ต่ำ", medium: "ปานกลาง", high: "สูง" };
const bandVariant: Record<StudentRiskScore["band"], "success" | "secondary" | "destructive"> = {
  low: "success",
  medium: "secondary",
  high: "destructive",
};

export function RiskScoreCard({ riskScore }: { riskScore: StudentRiskScore }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div>
          <p className="text-3xl font-bold">{riskScore.totalScore}</p>
          <p className="text-xs text-muted-foreground">คะแนนความเสี่ยงรวม (0-100)</p>
        </div>
        <Badge variant={bandVariant[riskScore.band]}>ระดับความเสี่ยง: {bandLabel[riskScore.band]}</Badge>
      </div>
      <div className="space-y-2">
        {riskScore.factors.map((f) => (
          <div key={f.key} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {f.label} <span className="text-muted-foreground">(น้ำหนัก {Math.round(f.weight * 100)}%)</span>
              </span>
              <span className="text-muted-foreground">{Math.round(f.score)}/100</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${f.score >= 60 ? "bg-destructive" : f.score >= 30 ? "bg-warning" : "bg-success"}`}
                style={{ width: `${Math.min(100, Math.max(0, f.score))}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{f.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

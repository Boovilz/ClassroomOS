import { Sparkles, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AiInsight } from "@/lib/queries/dashboard";

const SEVERITY_VARIANT: Record<AiInsight["severity"], "secondary" | "accent" | "destructive"> = {
  low: "secondary",
  medium: "secondary",
  high: "accent",
  critical: "destructive",
};

const SEVERITY_LABEL: Record<AiInsight["severity"], string> = {
  low: "ทั่วไป",
  medium: "ปานกลาง",
  high: "เฝ้าระวัง",
  critical: "วิกฤต",
};

export function AiInsightsPanel({ insights }: { insights: AiInsight[] }) {
  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
        <Sparkles className="h-8 w-8" />
        <p className="text-sm">ไม่พบความเสี่ยงที่ต้องติดตามในขณะนี้</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {insights.map((insight) => (
        <div key={insight.id} className="space-y-1.5 rounded-xl border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-accent" />
              <p className="text-sm font-medium">{insight.title}</p>
            </div>
            <Badge variant={SEVERITY_VARIANT[insight.severity]}>{SEVERITY_LABEL[insight.severity]}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{insight.recommendation}</p>
        </div>
      ))}
    </div>
  );
}

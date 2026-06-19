import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_LABELS: Record<string, string> = {
  achieved: "บรรลุมาตรฐาน",
  partially_achieved: "บรรลุบางส่วน",
  needs_improvement: "ต้องปรับปรุง",
};

const STATUS_VARIANTS: Record<string, "success" | "secondary" | "destructive"> = {
  achieved: "success",
  partially_achieved: "secondary",
  needs_improvement: "destructive",
};

export interface LearningOutcomeItem {
  code: string;
  description: string;
  status: string;
}

export function LearningOutcomesTracker({ outcomes }: { outcomes: LearningOutcomeItem[] }) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-base">ผลการเรียนรู้ตามมาตรฐาน</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {outcomes.length > 0 ? (
          outcomes.map((o, i) => (
            <div key={i} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
              <div>
                <p className="font-medium">{o.code}</p>
                <p className="text-muted-foreground">{o.description}</p>
              </div>
              <Badge variant={STATUS_VARIANTS[o.status] ?? "outline"}>{STATUS_LABELS[o.status] ?? o.status}</Badge>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">ยังไม่มีการประเมินผลการเรียนรู้</p>
        )}
      </CardContent>
    </Card>
  );
}

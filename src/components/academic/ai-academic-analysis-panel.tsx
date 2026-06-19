import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export function AiAcademicAnalysisPanel({ insights }: { insights: string[] }) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          วิเคราะห์ผลการเรียนโดย AI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {insights.length > 0 ? (
          insights.map((insight, i) => (
            <p key={i} className="rounded-lg border border-border/60 p-3">
              {insight}
            </p>
          ))
        ) : (
          <p className="text-muted-foreground">ยังไม่มีข้อมูลเพียงพอสำหรับการวิเคราะห์</p>
        )}
      </CardContent>
    </Card>
  );
}

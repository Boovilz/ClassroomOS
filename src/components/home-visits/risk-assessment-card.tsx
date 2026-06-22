"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActivitySquare } from "lucide-react";
import { riskLevelLabel, type RiskLevel } from "@/lib/queries/welfare-constants";

const riskVariant: Record<RiskLevel, "default" | "success" | "secondary" | "destructive"> = {
  low: "success",
  moderate: "secondary",
  high: "default",
  critical: "destructive",
};

export function RiskAssessmentCard({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{
    riskLevel: RiskLevel;
    riskScore: number;
    factors: { domain: string; detail: string }[];
    recommendations: string[];
  } | null>(null);

  async function handleRun() {
    setIsRunning(true);
    const res = await fetch("/api/risk-assessment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId }),
    });
    const json = await res.json();
    setIsRunning(false);
    if (!json.success) {
      toast.error("ประเมินความเสี่ยงไม่สำเร็จ", { description: json.message });
      return;
    }
    setResult(json.result);
    toast.success("ประเมินความเสี่ยงสำเร็จ");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <Button size="sm" variant="outline" className="gap-2" onClick={handleRun} disabled={isRunning}>
        <ActivitySquare className="h-4 w-4" />
        {isRunning ? "กำลังประเมิน..." : "ประเมินความเสี่ยงด้วย AI"}
      </Button>
      {result && (
        <div className="space-y-2 rounded-md border p-3">
          <div className="flex items-center gap-2">
            <Badge variant={riskVariant[result.riskLevel]}>{riskLevelLabel[result.riskLevel]}</Badge>
            <span className="text-sm">คะแนนความเสี่ยง: {result.riskScore}/100</span>
          </div>
          {result.factors.length > 0 && (
            <div className="space-y-1 text-sm">
              <p className="font-medium">ปัจจัยความเสี่ยง</p>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                {result.factors.map((f, idx) => (
                  <li key={idx}>
                    <span className="font-medium">{f.domain}:</span> {f.detail}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="space-y-1 text-sm">
            <p className="font-medium">คำแนะนำ</p>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              {result.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

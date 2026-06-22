"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";

const eligibilityLabel: Record<string, string> = {
  eligible: "เข้าเกณฑ์ช่วยเหลือ",
  not_eligible: "ไม่เข้าเกณฑ์",
  pending_review: "รอพิจารณา",
};

const eligibilityVariant: Record<string, "default" | "success" | "secondary" | "destructive"> = {
  eligible: "destructive",
  not_eligible: "success",
  pending_review: "secondary",
};

export function PovertyScreeningCard({
  studentId,
  currentScore,
}: {
  studentId: string;
  currentScore: number | null;
}) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{
    povertyRiskScore: number;
    eligibilityStatus: string;
    recommendations: string[];
  } | null>(null);

  async function handleRun() {
    setIsRunning(true);
    const res = await fetch(`/api/households/${studentId}`, { method: "POST" });
    const json = await res.json();
    setIsRunning(false);
    if (!json.success) {
      toast.error("คัดกรองไม่สำเร็จ", { description: json.message });
      return;
    }
    setResult(json.result);
    toast.success("คัดกรองนักเรียนยากจนสำเร็จ");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          คะแนนความเสี่ยงความยากจนล่าสุด: <span className="font-semibold">{currentScore ?? "ยังไม่ประเมิน"}</span>
        </div>
        <Button size="sm" variant="outline" className="gap-2" onClick={handleRun} disabled={isRunning}>
          <ShieldAlert className="h-4 w-4" />
          {isRunning ? "กำลังคัดกรอง..." : "คัดกรองนักเรียนยากจน"}
        </Button>
      </div>
      {result && (
        <div className="space-y-2 rounded-md border p-3">
          <div className="flex items-center gap-2">
            <Badge variant={eligibilityVariant[result.eligibilityStatus] ?? "default"}>
              {eligibilityLabel[result.eligibilityStatus] ?? result.eligibilityStatus}
            </Badge>
            <span className="text-sm">คะแนน: {result.povertyRiskScore}/100</span>
          </div>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {result.recommendations.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

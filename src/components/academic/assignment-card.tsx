import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const METHOD_LABELS: Record<string, string> = {
  quiz: "ทดสอบย่อย",
  exam: "สอบ",
  project: "โครงงาน",
  observation: "สังเกตการณ์",
  portfolio: "แฟ้มสะสมงาน",
  performance_task: "ภาระงาน",
  homework: "การบ้าน",
};

const ASSESSMENT_TYPE_LABELS: Record<string, string> = {
  knowledge: "ความรู้ (K)",
  process: "กระบวนการ (P)",
  attitude: "เจตคติ (A)",
  competency: "สมรรถนะ",
  characteristic: "คุณลักษณะ",
};

export interface AssignmentCardData {
  id: string;
  title: string;
  description: string | null;
  max_score: number;
  due_date: string | null;
  assessment_type: string | null;
  method: string | null;
  subjects?: { name: string } | null;
}

export function AssignmentCard({ assignment }: { assignment: AssignmentCardData }) {
  const overdue = assignment.due_date ? new Date(assignment.due_date) < new Date() : false;

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{assignment.title}</CardTitle>
          {assignment.due_date && (
            <Badge variant={overdue ? "destructive" : "outline"}>กำหนดส่ง {assignment.due_date}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {assignment.subjects?.name && <p className="text-muted-foreground">วิชา: {assignment.subjects.name}</p>}
        {assignment.description && <p>{assignment.description}</p>}
        <p className="text-muted-foreground">คะแนนเต็ม: {assignment.max_score}</p>
        <div className="flex flex-wrap gap-2">
          {assignment.assessment_type && <Badge variant="secondary">{ASSESSMENT_TYPE_LABELS[assignment.assessment_type] ?? assignment.assessment_type}</Badge>}
          {assignment.method && <Badge variant="outline">{METHOD_LABELS[assignment.method] ?? assignment.method}</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EqAssessmentForm } from "@/components/eq/eq-assessment-form";
import { EqHistoryList } from "@/components/eq/eq-history-list";
import { ArrowLeft, Printer } from "lucide-react";

export default async function EqPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, school_id")
    .eq("id", id)
    .single();

  if (!student) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/students/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">ประเมินความฉลาดทางอารมณ์ (EQ)</h1>
          <p className="text-sm text-muted-foreground">{student.full_name}</p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href={`/students/${id}/eq/print`}>
            <Printer className="h-4 w-4" />
            พิมพ์รายงาน EQ
          </Link>
        </Button>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>แบบประเมิน EQ</CardTitle>
        </CardHeader>
        <CardContent>
          <EqAssessmentForm studentId={id} schoolId={student.school_id} />
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>ประวัติการประเมิน EQ</CardTitle>
        </CardHeader>
        <CardContent>
          <EqHistoryList studentId={id} />
        </CardContent>
      </Card>
    </div>
  );
}

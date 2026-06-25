import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listDocumentTemplates } from "@/lib/queries/document-templates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { TemplateUploadDialog } from "./template-upload-dialog";
import { GenerateDocumentDialog } from "./generate-document-dialog";

const categoryLabel: Record<string, string> = {
  attendance: "การเข้าเรียน",
  milk: "นม",
  lunch: "อาหารกลางวัน",
  academic: "วิชาการ",
  behavior: "พฤติกรรม",
  health: "สุขภาพ",
  bmi: "BMI",
  home_visit: "เยี่ยมบ้าน",
  sdq: "SDQ",
  finance: "การเงิน",
  savings: "เงินฝาก",
  certificate: "ใบประกาศ",
  report_card: "สมุดพก",
  pta_meeting: "ประชุมผู้ปกครอง",
  official_letter: "หนังสือราชการ",
  government_form: "แบบฟอร์มราชการ",
  custom: "อื่นๆ",
};

export default async function DocumentTemplatesPage() {
  const supabase = await createClient();
  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, student_code")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("full_name");

  const templates = await listDocumentTemplates();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/documents" className="gap-1">
                <ArrowLeft className="h-4 w-4" /> เอกสาร
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-bold">เทมเพลตเอกสาร</h1>
          <p className="text-sm text-muted-foreground">อัปโหลดเทมเพลต Word (.docx) และสร้างเอกสารสำหรับนักเรียนรายบุคคล</p>
        </div>
        <TemplateUploadDialog />
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>เทมเพลตทั้งหมด</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อเทมเพลต</TableHead>
                <TableHead>หมวดหมู่</TableHead>
                <TableHead>ฟิลด์ที่ตรวจพบ</TableHead>
                <TableHead>วันที่อัปโหลด</TableHead>
                <TableHead className="text-right">การดำเนินการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length > 0 ? (
                templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      {t.name}
                      {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{categoryLabel[t.category] ?? t.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(t.fields as string[]).slice(0, 6).map((f) => (
                          <Badge key={f} variant="outline" className="font-mono text-xs">
                            {`{{${f}}}`}
                          </Badge>
                        ))}
                        {(t.fields as string[]).length > 6 && (
                          <span className="text-xs text-muted-foreground">+{(t.fields as string[]).length - 6}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(t.created_at).toLocaleDateString("th-TH")}</TableCell>
                    <TableCell className="text-right">
                      <GenerateDocumentDialog templateId={t.id} templateName={t.name} students={students ?? []} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    ยังไม่มีเทมเพลต
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCertificates } from "@/lib/queries/academic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CertificateIssueDialog } from "@/components/academic/certificate-issue-dialog";

const TEMPLATE_LABELS: Record<string, string> = {
  graduation: "วุฒิบัตรจบการศึกษา",
  honor_roll: "เกียรติบัตรผลการเรียนดีเยี่ยม",
  perfect_attendance: "เกียรติบัตรมาเรียนสมบูรณ์",
  subject_excellence: "เกียรติบัตรความเป็นเลิศทางวิชาการ",
  completion: "วุฒิบัตรผ่านการอบรม/กิจกรรม",
  other: "อื่นๆ",
};

export default async function CertificatesPage() {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id").eq("id", auth.user.id).single()
    : { data: null };

  const [certificates, { data: students }] = await Promise.all([
    getCertificates(),
    supabase.from("students").select("id, full_name, student_code").eq("is_active", true).order("full_name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">เกียรติบัตร / วุฒิบัตร</h1>
          <p className="text-sm text-muted-foreground">{certificates.length} ใบที่ออกแล้ว</p>
        </div>
        {profile?.school_id && <CertificateIssueDialog schoolId={profile.school_id} students={students ?? []} />}
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>เกียรติบัตรที่ออกแล้ว</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>นักเรียน</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead>หัวข้อ</TableHead>
                <TableHead>วันที่ออก</TableHead>
                <TableHead className="text-right">การจัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {certificates.length > 0 ? (
                certificates.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      {c.students?.student_code} - {c.students?.full_name}
                    </TableCell>
                    <TableCell>{TEMPLATE_LABELS[c.template_type] ?? c.template_type}</TableCell>
                    <TableCell>{c.title}</TableCell>
                    <TableCell>{new Date(c.issued_at).toLocaleDateString("th-TH")}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/academic/certificates/${c.id}`}>ดู/พิมพ์</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    ยังไม่มีเกียรติบัตรที่ออก
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

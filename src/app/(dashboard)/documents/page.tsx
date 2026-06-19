import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { DocumentFormDialog } from "./document-form-dialog";

export default async function DocumentsPage() {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id").eq("id", auth.user.id).single()
    : { data: null };

  const [{ data: students }, { data: documents }] = await Promise.all([
    supabase.from("students").select("id, full_name, student_code").eq("is_active", true).order("full_name"),
    supabase
      .from("documents")
      .select("id, title, category, file_url, created_at, students(full_name, student_code)")
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<
        {
          id: string;
          title: string;
          category: string | null;
          file_url: string | null;
          created_at: string;
          students: { full_name: string; student_code: string } | null;
        }[]
      >(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ศูนย์เอกสาร</h1>
          <p className="text-sm text-muted-foreground">จัดเก็บและเข้าถึงเอกสารของนักเรียนและโรงเรียน</p>
        </div>
        {profile?.school_id && <DocumentFormDialog schoolId={profile.school_id} students={students ?? []} />}
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>เอกสารล่าสุด</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อเอกสาร</TableHead>
                <TableHead>หมวดหมู่</TableHead>
                <TableHead>นักเรียน</TableHead>
                <TableHead>วันที่</TableHead>
                <TableHead className="text-right">ไฟล์</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents && documents.length > 0 ? (
                documents.map((d) => {
                  const student = Array.isArray(d.students) ? d.students[0] : d.students;
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.title}</TableCell>
                      <TableCell>{d.category ?? "-"}</TableCell>
                      <TableCell>{student ? `${student.full_name} (${student.student_code})` : "-"}</TableCell>
                      <TableCell>{new Date(d.created_at).toLocaleDateString("th-TH")}</TableCell>
                      <TableCell className="text-right">
                        {d.file_url ? (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="gap-1">
                              เปิดไฟล์ <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    ยังไม่มีเอกสาร
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

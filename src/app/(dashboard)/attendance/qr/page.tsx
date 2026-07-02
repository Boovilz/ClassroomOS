import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCardsGrid } from "./qr-cards-grid";

export default async function AttendanceQrPage() {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  let schoolName = "";
  if (auth?.user) {
    const { data: profile } = await supabase.from("users").select("school_id").eq("id", auth.user.id).single();
    if (profile?.school_id) {
      const { data: school } = await supabase.from("schools").select("name").eq("id", profile.school_id).single();
      schoolName = school?.name ?? "";
    }
  }
  const academicYear = String(new Date().getFullYear() + 543);

  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, student_code, classroom, avatar_url")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("student_code");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold">บัตร QR เช็คชื่อนักเรียน</h1>
          <p className="text-sm text-muted-foreground">สร้างและพิมพ์บัตร QR สำหรับนักเรียนแต่ละคน ใช้สแกนที่หน้าเครื่องสแกน/คีออส</p>
        </div>
      </div>

      <Card className="glass-card print:hidden">
        <CardHeader>
          <CardTitle>คำแนะนำ</CardTitle>
          <CardDescription>
            QR แต่ละใบมีอายุการใช้งานจำกัด (ค่าเริ่มต้น 5 นาที) ตามการตั้งค่าของโรงเรียน ระบบจะออก QR ใหม่ให้อัตโนมัติเมื่อหมดอายุ
            กดปุ่ม &quot;พิมพ์&quot; ของเบราว์เซอร์เพื่อพิมพ์บัตรทั้งหมด
          </CardDescription>
        </CardHeader>
      </Card>

      <QrCardsGrid students={students ?? []} schoolName={schoolName} academicYear={academicYear} />
    </div>
  );
}

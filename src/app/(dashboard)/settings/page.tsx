import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SchoolSettingsForm } from "./school-settings-form";

const roleLabel: Record<string, string> = {
  super_admin: "ผู้ดูแลระบบสูงสุด",
  school_admin: "ผู้ดูแลโรงเรียน",
  teacher: "ครู",
  parent: "ผู้ปกครอง",
  student: "นักเรียน",
};

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id, role").eq("id", auth.user.id).single()
    : { data: null };

  const { data: school } = profile?.school_id
    ? await supabase.from("schools").select("*").eq("id", profile.school_id).single()
    : { data: null };

  const { data: users } = profile?.school_id
    ? await supabase
        .from("users")
        .select("id, full_name, email, role, is_active")
        .eq("school_id", profile.school_id)
        .order("full_name")
    : { data: null };

  const canEditSchool = profile?.role === "school_admin" || profile?.role === "super_admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ตั้งค่า</h1>
        <p className="text-sm text-muted-foreground">จัดการข้อมูลโรงเรียน ผู้ใช้งาน และการตั้งค่าระบบ</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>ข้อมูลโรงเรียน</CardTitle>
          <CardDescription>
            {canEditSchool ? "แก้ไขข้อมูลพื้นฐานของโรงเรียน" : "เฉพาะผู้ดูแลโรงเรียนเท่านั้นที่แก้ไขได้"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {school ? (
            <SchoolSettingsForm school={school} readOnly={!canEditSchool} />
          ) : (
            <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลโรงเรียน</p>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>ผู้ใช้งานในโรงเรียน</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อ-นามสกุล</TableHead>
                <TableHead>อีเมล</TableHead>
                <TableHead>บทบาท</TableHead>
                <TableHead>สถานะ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users && users.length > 0 ? (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.full_name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{roleLabel[u.role] ?? u.role}</TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? "success" : "secondary"}>
                        {u.is_active ? "ใช้งานอยู่" : "ปิดใช้งาน"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    ยังไม่มีผู้ใช้งาน
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

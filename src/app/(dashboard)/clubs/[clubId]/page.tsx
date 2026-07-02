import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, BookOpen, Calendar } from "lucide-react";
import { getClubWithMembers } from "@/lib/queries/clubs";
import { AddMemberDialog } from "./add-member-dialog";
import { ClubMemberListPrint } from "@/components/clubs/club-member-list-print";

export default async function ClubDetailPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("id, school_id").eq("id", auth.user.id).single()
    : { data: null };

  const { data: school } = profile?.school_id
    ? await supabase.from("schools").select("name").eq("id", profile.school_id).single()
    : { data: null };

  const result = await getClubWithMembers(clubId);
  if (!result) notFound();

  const { club, members } = result;

  const memberStatusLabel: Record<string, string> = {
    active: "กำลังเรียน",
    inactive: "ไม่ใช้งาน",
    dropped: "ถอนตัว",
  };

  const schoolName = school?.name ?? "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{club.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {club.academic_year && (
              <Badge variant="secondary" className="gap-1">
                <Calendar className="h-3 w-3" />
                ปีการศึกษา {club.academic_year}
                {club.semester ? ` เทอม ${club.semester}` : ""}
              </Badge>
            )}
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              {members.length} คน{club.max_members ? ` / ${club.max_members} คน` : ""}
            </Badge>
          </div>
          {club.description && (
            <p className="mt-2 text-sm text-muted-foreground">{club.description}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {profile?.school_id && (
            <AddMemberDialog clubId={clubId} schoolId={profile.school_id} />
          )}
          <ClubMemberListPrint club={club} members={members} schoolName={schoolName} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">สมาชิกทั้งหมด</p>
              <p className="text-xl font-bold">{members.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <BookOpen className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-xs text-muted-foreground">สมาชิกที่กำลังเรียน</p>
              <p className="text-xl font-bold">{members.filter((m) => m.status === "active").length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <Calendar className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-xs text-muted-foreground">รับสมาชิกสูงสุด</p>
              <p className="text-xl font-bold">{club.max_members ?? "ไม่จำกัด"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>รายชื่อสมาชิก</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>รหัสนักเรียน</TableHead>
                <TableHead>ชื่อ-สกุล</TableHead>
                <TableHead>ระดับชั้น/ห้อง</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">จำนวนครั้งที่เข้าร่วม</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length > 0 ? (
                members.map((member, index) => (
                  <TableRow key={member.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{member.student_code}</TableCell>
                    <TableCell>{member.student_name}</TableCell>
                    <TableCell>{member.classroom ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={member.status === "active" ? "success" : "secondary"}>
                        {memberStatusLabel[member.status] ?? member.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{member.attendance_count}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    ยังไม่มีสมาชิก กดปุ่ม &ldquo;เพิ่มสมาชิก&rdquo; เพื่อเริ่มต้น
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

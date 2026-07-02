import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { listClubs } from "@/lib/queries/clubs";
import { CreateClubDialog } from "./create-club-dialog";

export default async function ClubsPage() {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("id, school_id").eq("id", auth.user.id).single()
    : { data: null };

  const clubs = profile?.school_id ? await listClubs(profile.school_id) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">ชุมนุม / กิจกรรมพิเศษ</h1>
          <p className="text-sm text-muted-foreground">จัดการชุมนุมและกิจกรรมพิเศษของโรงเรียน</p>
        </div>
        {profile?.school_id && (
          <CreateClubDialog schoolId={profile.school_id} />
        )}
      </div>

      {clubs.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex h-40 items-center justify-center">
            <p className="text-muted-foreground">ยังไม่มีชุมนุม กดปุ่ม &ldquo;สร้างชุมนุมใหม่&rdquo; เพื่อเริ่มต้น</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((club) => (
            <Link key={club.id} href={`/clubs/${club.id}`}>
              <Card className="glass-card h-full transition-colors hover:border-primary/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{club.name}</CardTitle>
                  {club.academic_year && (
                    <div className="flex gap-2">
                      <Badge variant="secondary">ปีการศึกษา {club.academic_year}</Badge>
                      {club.semester && <Badge variant="outline">เทอม {club.semester}</Badge>}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  {club.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{club.description}</p>
                  )}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>
                      {club.member_count} คน
                      {club.max_members ? ` / ${club.max_members} คน` : ""}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

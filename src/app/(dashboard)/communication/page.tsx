import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnnouncementFormDialog } from "./announcement-form-dialog";

const audienceLabel: Record<string, string> = {
  all: "ทุกคน",
  teachers: "ครู",
  parents: "ผู้ปกครอง",
  students: "นักเรียน",
};

export default async function CommunicationPage() {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id").eq("id", auth.user.id).single()
    : { data: null };

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, body, audience, published_at, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">สื่อสารผู้ปกครอง</h1>
          <p className="text-sm text-muted-foreground">ส่งประกาศและข้อความถึงผู้ปกครองนักเรียน</p>
        </div>
        {profile?.school_id && <AnnouncementFormDialog schoolId={profile.school_id} />}
      </div>

      <div className="space-y-3">
        {announcements && announcements.length > 0 ? (
          announcements.map((a) => (
            <Card key={a.id} className="glass-card">
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                <div>
                  <CardTitle className="text-base">{a.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString("th-TH")}
                  </p>
                </div>
                <Badge variant="secondary">{audienceLabel[a.audience] ?? a.audience}</Badge>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{a.body}</p>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="glass-card">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              ยังไม่มีประกาศ
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

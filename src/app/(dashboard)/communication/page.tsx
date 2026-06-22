import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnnouncementFormDialog } from "./announcement-form-dialog";
import { CommunicationDashboardStatsGrid } from "@/components/communication/dashboard-stats";
import { NotificationTrendChart, DeliveryRateChart } from "@/components/communication/analytics-charts";
import { LineOaPanel } from "@/components/communication/line-oa-panel";
import { EventsPanel } from "@/components/communication/events-panel";
import { SurveysPanel } from "@/components/communication/surveys-panel";
import { ChatPanel } from "@/components/communication/chat-panel";
import { TemplatesPanel } from "@/components/communication/templates-panel";
import {
  getCommunicationDashboard,
  getCommunicationAnalytics,
  getLineUsersList,
  getEvents,
  getSurveys,
  getThreadsForCurrentUser,
  getThreadMessages,
  getNotificationTemplates,
} from "@/lib/queries/communication";

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

  const schoolId = profile?.school_id ?? null;

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, body, audience, published_at, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  const [dashboard, analytics, lineUsersResult, parentsWithoutLineResult, events, surveys, threads, templates] = schoolId
    ? await Promise.all([
        getCommunicationDashboard(),
        getCommunicationAnalytics(schoolId),
        getLineUsersList(schoolId),
        supabase.from("parents").select("id, full_name").eq("school_id", schoolId),
        getEvents(schoolId),
        getSurveys(schoolId),
        getThreadsForCurrentUser(),
        getNotificationTemplates(schoolId),
      ])
    : [null, null, [], { data: [] }, [], [], [], []];

  const lineUsers = lineUsersResult ?? [];
  const linkedParentIds = new Set(lineUsers.map((u: { parent_id: string }) => u.parent_id));
  const parentsWithoutLink = (parentsWithoutLineResult?.data ?? []).filter((p) => !linkedParentIds.has(p.id));

  const firstThreadId = threads.length > 0 ? threads[0].id : null;
  const initialMessages = firstThreadId ? await getThreadMessages(firstThreadId) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">สื่อสารผู้ปกครอง</h1>
          <p className="text-sm text-muted-foreground">
            ส่งประกาศ ข้อความ และจัดการการเชื่อมต่อ LINE OA (จำลอง) กับผู้ปกครองนักเรียน
          </p>
        </div>
        {schoolId && <AnnouncementFormDialog schoolId={schoolId} />}
      </div>

      {dashboard && <CommunicationDashboardStatsGrid stats={dashboard} />}

      <Tabs defaultValue="announcements" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="announcements">ประกาศ</TabsTrigger>
          <TabsTrigger value="line">LINE OA</TabsTrigger>
          <TabsTrigger value="chat">แชท</TabsTrigger>
          <TabsTrigger value="events">กิจกรรม</TabsTrigger>
          <TabsTrigger value="surveys">แบบสำรวจ</TabsTrigger>
          <TabsTrigger value="templates">เทมเพลต/ผู้ช่วยร่างข้อความ</TabsTrigger>
          <TabsTrigger value="analytics">วิเคราะห์</TabsTrigger>
        </TabsList>

        <TabsContent value="announcements" className="space-y-3">
          {announcements && announcements.length > 0 ? (
            announcements.map((a) => (
              <Card key={a.id} className="glass-card">
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                  <div>
                    <CardTitle className="text-base">{a.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("th-TH")}</p>
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
              <CardContent className="py-10 text-center text-sm text-muted-foreground">ยังไม่มีประกาศ</CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="line">
          {schoolId && <LineOaPanel schoolId={schoolId} lineUsers={lineUsers} parentsWithoutLink={parentsWithoutLink} />}
        </TabsContent>

        <TabsContent value="chat">
          {schoolId && (
            <ChatPanel
              schoolId={schoolId}
              userId={auth?.user?.id}
              threads={threads}
              initialMessages={initialMessages}
              initialThreadId={firstThreadId}
            />
          )}
        </TabsContent>

        <TabsContent value="events">{schoolId && <EventsPanel schoolId={schoolId} events={events} />}</TabsContent>

        <TabsContent value="surveys">{schoolId && <SurveysPanel schoolId={schoolId} surveys={surveys} />}</TabsContent>

        <TabsContent value="templates">
          <TemplatesPanel templates={templates} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {analytics && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-base">แนวโน้มการสื่อสาร (14 วันล่าสุด)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <NotificationTrendChart data={analytics.notificationTrend} />
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-base">อัตราการส่งสำเร็จตามช่องทาง</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DeliveryRateChart data={analytics.deliveryRateByChannel} />
                  </CardContent>
                </Card>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="glass-card">
                  <CardContent className="py-4 text-sm">
                    อัตราการอ่านประกาศ: <span className="font-bold">{analytics.readRate}%</span>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="py-4 text-sm">
                    อัตราการตอบรับ/รับทราบ: <span className="font-bold">{analytics.responseRate}%</span>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MapPin, Sparkles } from "lucide-react";
import {
  getHomeVisitDetail,
  getAiHomeVisitAnalysis,
  getHouseholdProfile,
  getStudentTimeline,
} from "@/lib/queries/welfare";
import { VisitAssessmentForm } from "@/components/home-visits/visit-assessment-form";
import { AddPhotoDialog } from "@/components/home-visits/add-photo-dialog";
import { AddDocumentDialog } from "@/components/home-visits/add-document-dialog";
import { HouseholdProfileForm } from "@/components/home-visits/household-profile-form";
import { PovertyScreeningCard } from "@/components/home-visits/poverty-screening-card";
import { RiskAssessmentCard } from "@/components/home-visits/risk-assessment-card";
import { CsvExportButton, PrintButton } from "@/components/health/export-buttons";

const statusLabel: Record<string, string> = {
  scheduled: "นัดหมายแล้ว",
  completed: "เยี่ยมแล้ว",
  cancelled: "ยกเลิก",
  rescheduled: "เลื่อนนัด",
};
const statusVariant: Record<string, "default" | "success" | "secondary" | "destructive"> = {
  scheduled: "default",
  completed: "success",
  cancelled: "destructive",
  rescheduled: "secondary",
};

export default async function HomeVisitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("id, school_id").eq("id", auth.user.id).single()
    : { data: null };

  const { visit, photos, documents } = await getHomeVisitDetail(id);
  if (!visit) {
    notFound();
  }

  const [insights, household, timeline] = await Promise.all([
    getAiHomeVisitAnalysis(id),
    getHouseholdProfile(visit.student_id),
    getStudentTimeline(visit.student_id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/home-visits">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            กลับ
          </Button>
        </Link>
        <div className="flex gap-2">
          <PrintButton label="พิมพ์รายงานการเยี่ยมบ้าน" />
          <CsvExportButton
            filename={`home-visit-${id}.csv`}
            headers={["หัวข้อ", "ค่า"]}
            rows={[
              ["นักเรียน", visit.students?.full_name ?? ""],
              ["วันที่เยี่ยม", visit.visit_date],
              ["สถานะ", statusLabel[visit.status] ?? visit.status],
              ["ผลการเยี่ยมบ้าน", visit.outcome ?? ""],
              ["สถานะเศรษฐกิจ", visit.economic_status ?? ""],
              ["การสนับสนุนจากครอบครัว", visit.family_support ?? ""],
            ]}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            เยี่ยมบ้าน: {visit.students?.full_name} ({visit.students?.student_code})
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date(visit.visit_date).toLocaleDateString("th-TH")}
            {visit.visit_time ? ` เวลา ${visit.visit_time.slice(0, 5)}` : ""} · {visit.students?.classroom ?? "-"}
          </p>
        </div>
        <div className="flex gap-2">
          {visit.follow_up_required && <Badge variant="destructive">ต้องติดตามต่อ</Badge>}
          <Badge variant={statusVariant[visit.status] ?? "default"}>{statusLabel[visit.status] ?? visit.status}</Badge>
        </div>
      </div>

      {visit.latitude !== null && visit.longitude !== null && (
        <Card className="glass-card">
          <CardContent className="flex items-center justify-between gap-3 pt-6">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-primary" />
              ละติจูด {visit.latitude}, ลองจิจูด {visit.longitude}
            </div>
            {visit.maps_url && (
              <a href={visit.maps_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-2">
                  <MapPin className="h-4 w-4" />
                  เปิดใน Google Maps
                </Button>
              </a>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            ผลการวิเคราะห์การเยี่ยมบ้าน (AI)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1 text-sm">
            {insights.map((insight, idx) => (
              <li key={idx}>{insight}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Tabs defaultValue="assessment" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="assessment">การประเมิน</TabsTrigger>
          <TabsTrigger value="household">ข้อมูลครัวเรือน</TabsTrigger>
          <TabsTrigger value="risk">ความเสี่ยง/ความยากจน</TabsTrigger>
          <TabsTrigger value="media">รูปภาพ/เอกสาร</TabsTrigger>
          <TabsTrigger value="timeline">ประวัติ</TabsTrigger>
        </TabsList>

        <TabsContent value="assessment">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>แบบประเมินการเยี่ยมบ้าน</CardTitle>
            </CardHeader>
            <CardContent>
              <VisitAssessmentForm
                visitId={id}
                initial={{
                  status: visit.status,
                  outcome: visit.outcome,
                  duration_minutes: visit.duration_minutes,
                  follow_up_required: visit.follow_up_required,
                  latitude: visit.latitude,
                  longitude: visit.longitude,
                  economic_status: visit.economic_status,
                  educational_support: visit.educational_support,
                  family_support: visit.family_support,
                  health_status_note: visit.health_status_note,
                  behavior_concerns: visit.behavior_concerns,
                  attendance_concerns: visit.attendance_concerns,
                  academic_concerns: visit.academic_concerns,
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="household">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>ข้อมูลครัวเรือนและการประเมินสภาพความเป็นอยู่</CardTitle>
            </CardHeader>
            <CardContent>
              {profile?.school_id && (
                <HouseholdProfileForm schoolId={profile.school_id} studentId={visit.student_id} initial={household.profile} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>คัดกรองนักเรียนยากจน</CardTitle>
            </CardHeader>
            <CardContent>
              <PovertyScreeningCard studentId={visit.student_id} currentScore={null} />
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>ประเมินความเสี่ยงนักเรียน (AI)</CardTitle>
            </CardHeader>
            <CardContent>
              <RiskAssessmentCard studentId={visit.student_id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media" className="space-y-4">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>รูปภาพการเยี่ยมบ้าน</CardTitle>
              {profile?.school_id && <AddPhotoDialog visitId={id} schoolId={profile.school_id} />}
            </CardHeader>
            <CardContent>
              {photos.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {photos.map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <a key={p.id} href={p.photo_url} target="_blank" rel="noopener noreferrer" className="block">
                      <img src={p.photo_url} alt={p.caption ?? ""} className="aspect-square w-full rounded-md object-cover" />
                      <p className="mt-1 text-xs text-muted-foreground">{p.caption}</p>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">ยังไม่มีรูปภาพ</p>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>เอกสารประกอบ</CardTitle>
              {profile?.school_id && <AddDocumentDialog visitId={id} schoolId={profile.school_id} studentId={visit.student_id} />}
            </CardHeader>
            <CardContent className="space-y-2">
              {documents.length > 0 ? (
                documents.map((d) => (
                  <a
                    key={d.id}
                    href={d.file_url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-md border p-2 text-sm hover:bg-accent/40"
                  >
                    {d.title}
                  </a>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">ยังไม่มีเอกสาร</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>ประวัติการติดตามนักเรียน</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {timeline.length > 0 ? (
                timeline.map((event) => (
                  <div key={`${event.type}-${event.id}`} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{event.title}</span>
                      <span className="text-xs text-muted-foreground">{new Date(event.date).toLocaleDateString("th-TH")}</span>
                    </div>
                    {event.detail && <p className="mt-1 text-muted-foreground">{event.detail}</p>}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">ยังไม่มีประวัติ</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

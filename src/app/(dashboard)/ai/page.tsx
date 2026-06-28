import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, AlertTriangle, Lightbulb, FileText, Zap } from "lucide-react";
import { isAiConfigured } from "@/lib/ai/client";
import { getAiCommandCenterDashboard } from "@/lib/queries/ai";
import { AiChatPanel } from "@/components/ai/ai-chat-panel";
import { AiNotConfiguredBanner } from "@/components/ai/ai-not-configured-banner";
import { AiWorkflowsPanel } from "@/components/ai/ai-workflows-panel";
import { AiLessonAssistant } from "@/components/ai/ai-lesson-assistant";
import { AiKnowledgeBasePanel } from "@/components/ai/ai-knowledge-base-panel";
import { AiVoiceHint } from "@/components/ai/ai-voice-hint";

export default async function AiAssistantPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id, role").eq("id", auth.user.id).single()
    : { data: null };

  const schoolId = profile?.school_id ?? null;
  const aiConfigured = await isAiConfigured(schoolId);
  const dashboard = schoolId ? await getAiCommandCenterDashboard(schoolId) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI ผู้ช่วยอัจฉริยะ
          </h1>
          <p className="text-sm text-muted-foreground">ผู้ช่วย AI สำหรับครู ขับเคลื่อนโดย Claude (Anthropic) — รองรับเฉพาะ Claude เท่านั้น ไม่รองรับ GPT/Gemini/Ollama</p>
        </div>
        <Badge variant={aiConfigured ? "default" : "destructive"}>{aiConfigured ? "AI พร้อมใช้งาน" : "AI ไม่พร้อมใช้งาน"}</Badge>
      </div>

      {!aiConfigured && <AiNotConfiguredBanner />}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> นักเรียนกลุ่มเสี่ยง</CardDescription>
            <CardTitle className="text-3xl">{dashboard?.riskStudentsCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><Lightbulb className="h-4 w-4" /> ข้อมูลเชิงลึกล่าสุด</CardDescription>
            <CardTitle className="text-3xl">{dashboard?.recentInsights.length ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><FileText className="h-4 w-4" /> รายงานที่สร้างแล้ว</CardDescription>
            <CardTitle className="text-3xl">{dashboard?.recentReports.length ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><Zap className="h-4 w-4" /> โทเค็นที่ใช้วันนี้</CardDescription>
            <CardTitle className="text-3xl">{dashboard?.tokensUsedToday ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="chat">แชทผู้ช่วย AI</TabsTrigger>
          <TabsTrigger value="insights">ข้อมูลเชิงลึก</TabsTrigger>
          <TabsTrigger value="lesson">ผู้ช่วยออกแบบการสอน</TabsTrigger>
          <TabsTrigger value="workflows">เวิร์กโฟลว์อัตโนมัติ</TabsTrigger>
          <TabsTrigger value="knowledge">ฐานความรู้ (RAG)</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4 space-y-4">
          <AiVoiceHint />
          <AiChatPanel />
        </TabsContent>

        <TabsContent value="insights" className="mt-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ข้อมูลเชิงลึกล่าสุด</CardTitle>
                <CardDescription>สังเคราะห์โดย Claude จากข้อมูลเชิงโครงสร้างของแต่ละโมดูล</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {(dashboard?.recentInsights ?? []).length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลเชิงลึก ลองวิเคราะห์นักเรียนรายบุคคลที่หน้านักเรียน</p>}
                {(dashboard?.recentInsights ?? []).map((row) => (
                  <div key={row.id} className="rounded-lg border border-border/60 p-3 text-sm">
                    <p className="font-medium">{row.title}</p>
                    <p className="text-muted-foreground mt-1 line-clamp-3">{row.content}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">รายงาน/เอกสารที่สร้างล่าสุด</CardTitle>
                <CardDescription>ใช้ประกอบ ปพ.5/ปพ.6 หรือรายงานเยี่ยมบ้านที่มีอยู่</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {(dashboard?.recentReports ?? []).length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีรายงานที่สร้างโดย AI</p>}
                {(dashboard?.recentReports ?? []).map((row) => (
                  <div key={row.id} className="rounded-lg border border-border/60 p-3 text-sm">
                    <p className="font-medium">{row.title}</p>
                    <p className="text-muted-foreground mt-1 line-clamp-3">{row.content}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="lesson" className="mt-4">
          <AiLessonAssistant />
        </TabsContent>

        <TabsContent value="workflows" className="mt-4">
          <AiWorkflowsPanel />
        </TabsContent>

        <TabsContent value="knowledge" className="mt-4">
          <AiKnowledgeBasePanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

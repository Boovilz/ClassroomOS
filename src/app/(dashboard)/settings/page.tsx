import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SchoolSettingsForm } from "./school-settings-form";
import { SettingsCategoryForm } from "./settings-category-form";
import { UserManagementTab } from "./user-management-tab";
import { RolesMatrixTab } from "./roles-matrix-tab";
import { AuditLogTab } from "./audit-log-tab";
import { BackupTab } from "./backup-tab";
import { ThemeTab } from "./theme-tab";
import { SecurityTab } from "./security-tab";
import { SubscriptionTab } from "./subscription-tab";

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id, role").eq("id", auth.user.id).single()
    : { data: null };

  const { data: school } = profile?.school_id
    ? await supabase.from("schools").select("*").eq("id", profile.school_id).single()
    : { data: null };

  const [{ count: studentCount }, { count: teacherCount }] = profile?.school_id
    ? await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", profile.school_id).is("deleted_at", null),
        supabase.from("teachers").select("id", { count: "exact", head: true }).eq("school_id", profile.school_id),
      ])
    : [{ count: 0 }, { count: 0 }];

  const canEditSchool = profile?.role === "school_admin" || profile?.role === "super_admin";
  const isSuperAdmin = profile?.role === "super_admin";

  if (!canEditSchool || !profile?.school_id) {
    // teacher/parent/student fallback - keep the page functional but read-only/minimal.
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">ตั้งค่า</h1>
          <p className="text-sm text-muted-foreground">เฉพาะผู้ดูแลโรงเรียนเท่านั้นที่จัดการการตั้งค่าได้</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ตั้งค่า</h1>
        <p className="text-sm text-muted-foreground">จัดการข้อมูลโรงเรียน ผู้ใช้งาน บทบาท และการตั้งค่าระบบทั้งหมด</p>
      </div>

      <Tabs defaultValue="school" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="school">ข้อมูลโรงเรียน</TabsTrigger>
          <TabsTrigger value="users">ผู้ใช้งาน</TabsTrigger>
          <TabsTrigger value="roles">บทบาท & สิทธิ์</TabsTrigger>
          <TabsTrigger value="academic">วิชาการ</TabsTrigger>
          <TabsTrigger value="attendance">การเช็คชื่อ</TabsTrigger>
          <TabsTrigger value="behavior">พฤติกรรม/XP</TabsTrigger>
          <TabsTrigger value="finance">การเงิน</TabsTrigger>
          <TabsTrigger value="health">สุขภาพ</TabsTrigger>
          <TabsTrigger value="communication">การสื่อสาร</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="theme">ธีม/แบรนด์</TabsTrigger>
          <TabsTrigger value="security">ความปลอดภัย</TabsTrigger>
          <TabsTrigger value="backup">สำรองข้อมูล</TabsTrigger>
          <TabsTrigger value="audit">บันทึกการใช้งาน</TabsTrigger>
          <TabsTrigger value="subscription">แพ็กเกจ</TabsTrigger>
        </TabsList>

        <TabsContent value="school">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>ข้อมูลโรงเรียน</CardTitle>
              <CardDescription>แก้ไขข้อมูลพื้นฐานของโรงเรียน</CardDescription>
            </CardHeader>
            <CardContent>
              {school ? <SchoolSettingsForm school={school} readOnly={false} /> : <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลโรงเรียน</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>จัดการผู้ใช้งาน</CardTitle>
              <CardDescription>เพิ่ม แก้ไข ระงับ หรือรีเซ็ตรหัสผ่านผู้ใช้งานในโรงเรียน</CardDescription>
            </CardHeader>
            <CardContent>
              <UserManagementTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>เมทริกซ์บทบาทและสิทธิ์</CardTitle>
              <CardDescription>กำหนดสิทธิ์การเข้าถึงของแต่ละบทบาท</CardDescription>
            </CardHeader>
            <CardContent>
              <RolesMatrixTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academic">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>การตั้งค่าวิชาการ</CardTitle>
            </CardHeader>
            <CardContent>
              <SettingsCategoryForm
                category="academic"
                readOnly={false}
                fields={[
                  { key: "current_academic_year", label: "ปีการศึกษาปัจจุบัน", placeholder: "2568" },
                  { key: "current_semester", label: "ภาคเรียนปัจจุบัน", placeholder: "1" },
                  { key: "passing_gpa", label: "เกณฑ์ GPA ผ่าน", type: "number", placeholder: "1.0" },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>การตั้งค่าการเช็คชื่อ</CardTitle>
            </CardHeader>
            <CardContent>
              <SettingsCategoryForm
                category="attendance"
                readOnly={false}
                fields={[
                  { key: "checkin_time", label: "เวลาเช็คชื่อเข้าเรียน", type: "time" },
                  { key: "late_after_time", label: "ถือว่ามาสายหลังเวลา", type: "time" },
                  { key: "leave_types", label: "ประเภทการลา (คั่นด้วย ,)", placeholder: "ลาป่วย, ลากิจ, ลาคลอด" },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>การตั้งค่าพฤติกรรม / XP / เหรียญ</CardTitle>
            </CardHeader>
            <CardContent>
              <SettingsCategoryForm
                category="behavior"
                readOnly={false}
                fields={[
                  { key: "xp_per_good_behavior", label: "XP ต่อพฤติกรรมดี", type: "number", placeholder: "10" },
                  { key: "coins_per_xp_level", label: "เหรียญต่อการเลื่อนระดับ", type: "number", placeholder: "50" },
                  { key: "badge_threshold", label: "เกณฑ์รับเหรียญตรา (XP)", type: "number", placeholder: "500" },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>การตั้งค่าการเงิน</CardTitle>
            </CardHeader>
            <CardContent>
              <SettingsCategoryForm
                category="finance"
                readOnly={false}
                fields={[
                  { key: "savings_account_types", label: "ประเภทบัญชีออมทรัพย์ (คั่นด้วย ,)", placeholder: "บัญชีออมทรัพย์, บัญชีกองทุน" },
                  { key: "min_deposit", label: "เงินฝากขั้นต่ำ (บาท)", type: "number", placeholder: "10" },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>การตั้งค่าสุขภาพ / มาตรฐาน BMI</CardTitle>
            </CardHeader>
            <CardContent>
              <SettingsCategoryForm
                category="health"
                readOnly={false}
                fields={[
                  { key: "bmi_underweight_max", label: "BMI ผอม (สูงสุด)", type: "number", placeholder: "18.5" },
                  { key: "bmi_overweight_min", label: "BMI อ้วน (ต่ำสุด)", type: "number", placeholder: "25" },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communication">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>การตั้งค่าการสื่อสาร / SMTP / SMS</CardTitle>
              <CardDescription>
                การส่งอีเมล/SMS จริงต้องตั้งค่า SMTP_HOST/SMTP_USER/SMTP_PASSWORD และ SMS_GATEWAY_WEBHOOK_URL/SMS_GATEWAY_API_KEY ในไฟล์ .env ของเซิร์ฟเวอร์ — LINE ยังเป็นการจำลองเท่านั้น
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsCategoryForm
                category="communication"
                readOnly={false}
                fields={[
                  { key: "notify_email", label: "อีเมลสำหรับแจ้งเตือนผู้ดูแล", placeholder: "admin@school.ac.th" },
                  { key: "sms_sender_name", label: "ชื่อผู้ส่ง SMS", placeholder: "ClassroomOS" },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>การตั้งค่า AI</CardTitle>
              <CardDescription>ใช้ Claude (Anthropic) เท่านั้น — ไม่รองรับ GPT/Gemini/Ollama ในระบบนี้</CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsCategoryForm
                category="ai"
                readOnly={false}
                fields={[{ key: "ai_tone", label: "น้ำเสียงของ AI", placeholder: "เป็นกันเอง กระชับ" }]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>ธีมและแบรนด์</CardTitle>
              <CardDescription>โลโก้ สี และพื้นหลังหน้าเข้าสู่ระบบของโรงเรียน</CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>ความปลอดภัย</CardTitle>
              <CardDescription>การยืนยันตัวตนสองชั้นและการตรวจสอบการเข้าสู่ระบบ</CardDescription>
            </CardHeader>
            <CardContent>
              <SecurityTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>สำรองและกู้คืนข้อมูล</CardTitle>
              <CardDescription>
                สำรองข้อมูลแบบ Manual เป็นไฟล์ JSON — ระบบสำรองข้อมูลอัตโนมัติบนคลาวด์/cron ยังไม่พร้อมใช้งานในสภาพแวดล้อมนี้
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BackupTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>บันทึกการใช้งานระบบ (Audit Log)</CardTitle>
            </CardHeader>
            <CardContent>
              <AuditLogTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>แพ็กเกจการใช้งาน</CardTitle>
            </CardHeader>
            <CardContent>
              <SubscriptionTab
                schoolId={profile.school_id}
                isSuperAdmin={isSuperAdmin}
                studentCount={studentCount ?? 0}
                teacherCount={teacherCount ?? 0}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

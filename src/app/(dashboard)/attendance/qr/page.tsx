import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AttendanceQrPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id").eq("id", auth.user.id).single()
    : { data: null };

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const { data: token } = profile?.school_id
    ? await supabase
        .from("qr_tokens")
        .insert({
          school_id: profile.school_id,
          token: crypto.randomUUID(),
          purpose: "kiosk_session",
          expires_at: expiresAt,
        })
        .select("token")
        .single()
    : { data: null };

  const kioskUrl = token
    ? `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/attendance/kiosk?token=${token.token}`
    : "";
  const qrImageUrl = kioskUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(kioskUrl)}`
    : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">สร้าง QR เช็คชื่อ</h1>
        <p className="text-sm text-muted-foreground">
          ให้นักเรียนสแกน QR นี้เพื่อไปยังหน้าเช็คชื่อด้วยตนเอง (โหมดคีออส)
        </p>
      </div>

      <Card className="glass-card mx-auto max-w-md">
        <CardHeader>
          <CardTitle>QR สำหรับเช็คชื่อวันนี้</CardTitle>
          <CardDescription>QR นี้จะหมดอายุภายใน 5 นาที กรุณารีเฟรชหน้าเพื่อสร้างใหม่</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {qrImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrImageUrl} alt="QR เช็คชื่อ" className="rounded-xl border border-border/60 p-2" />
          ) : (
            <p className="text-sm text-muted-foreground">ไม่สามารถสร้าง QR ได้ กรุณาลองใหม่</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

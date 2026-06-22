"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import QRCode from "qrcode";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface LineUserRow {
  id: string;
  parent_id: string;
  linking_code: string;
  verification_status: "pending" | "verified" | "revoked";
  display_name: string | null;
  linked_at: string | null;
  parents: { full_name: string; students: { full_name: string; student_code: string; classroom: string | null } | null } | null;
}

const statusLabel: Record<string, string> = { pending: "รอยืนยัน", verified: "เชื่อมต่อแล้ว", revoked: "ยกเลิกแล้ว" };
const statusVariant: Record<string, "secondary" | "success" | "destructive"> = {
  pending: "secondary",
  verified: "success",
  revoked: "destructive",
};

export function LineOaPanel({
  schoolId,
  lineUsers,
  parentsWithoutLink,
}: {
  schoolId: string;
  lineUsers: LineUserRow[];
  parentsWithoutLink: { id: string; full_name: string }[];
}) {
  return (
    <div className="space-y-4">
      <Card className="glass-card border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="py-4 text-sm">
          <p className="font-semibold text-amber-700 dark:text-amber-400">โหมดทดลอง / จำลองการทำงาน (Demo Mode)</p>
          <p className="mt-1 text-muted-foreground">
            ระบบนี้ยังไม่ได้เชื่อมต่อกับ LINE Official Account จริง การ &quot;เชื่อมต่อ LINE&quot; ในหน้านี้เป็นการจำลองขั้นตอนที่ผู้ปกครองจริงจะสแกน QR
            และเข้าสู่ระบบผ่าน LINE Login เท่านั้น การส่งข้อความผ่าน LINE จะถูกบันทึกในระบบเป็นสถานะ &quot;จำลองการส่ง (simulated)&quot;
            โดยไม่มีการเรียก LINE API จริงแต่อย่างใด ฟีเจอร์ Rich Menu, Webhook, และ LINE Login จริงอยู่นอกขอบเขตของระบบทดลองนี้
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">สร้างคำขอเชื่อมต่อ LINE สำหรับผู้ปกครอง</CardTitle>
        </CardHeader>
        <CardContent>
          <GenerateLinkSection schoolId={schoolId} parents={parentsWithoutLink} />
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">รายชื่อผู้ปกครองที่เชื่อมต่อ LINE OA (จำลอง)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {lineUsers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มีผู้ปกครองเชื่อมต่อ</p>
          ) : (
            lineUsers.map((lu) => (
              <div key={lu.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <div>
                  <p className="text-sm font-medium">{lu.parents?.full_name ?? "-"}</p>
                  <p className="text-xs text-muted-foreground">
                    นักเรียน: {lu.parents?.students?.full_name ?? "-"} ({lu.parents?.students?.classroom ?? "-"})
                  </p>
                  <p className="text-xs text-muted-foreground">รหัสเชื่อมต่อ: {lu.linking_code}</p>
                </div>
                <Badge variant={statusVariant[lu.verification_status]}>{statusLabel[lu.verification_status]}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function GenerateLinkSection({ schoolId, parents }: { schoolId: string; parents: { id: string; full_name: string }[] }) {
  const router = useRouter();
  const [parentId, setParentId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generated, setGenerated] = useState<{ linkingCode: string; parentId: string } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!generated) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(`classroomos-line-link:${generated.linkingCode}`, { width: 200, margin: 1 }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [generated]);

  async function handleGenerate() {
    if (!parentId) {
      toast.error("กรุณาเลือกผู้ปกครอง");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/communication/line-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, parentId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setGenerated({ linkingCode: json.linkUser.linking_code, parentId });
      toast.success("สร้างรหัสเชื่อมต่อสำเร็จ (จำลอง QR สำหรับสแกนใน LINE)");
    } catch (err) {
      toast.error("สร้างรหัสไม่สำเร็จ", { description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
        >
          <option value="">เลือกผู้ปกครอง...</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
        <Button onClick={handleGenerate} disabled={submitting}>
          {submitting ? "กำลังสร้าง..." : "สร้าง QR / รหัสเชื่อมต่อ (จำลอง)"}
        </Button>
      </div>

      {generated && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border/60 p-4">
          <p className="text-sm text-muted-foreground">
            จำลองการสแกน QR ด้วยแอป LINE - ในระบบจริงผู้ปกครองจะสแกนรหัสนี้ในแอป LINE จากนั้นยืนยันตัวตน
          </p>
          {qrDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="QR เชื่อมต่อ LINE (จำลอง)" className="h-40 w-40" />
          )}
          <p className="text-lg font-bold">{generated.linkingCode}</p>
          <ConfirmLinkDialog parentId={generated.parentId} linkingCode={generated.linkingCode} onConfirmed={() => router.refresh()} />
        </div>
      )}
    </div>
  );
}

function ConfirmLinkDialog({ parentId, linkingCode, onConfirmed }: { parentId: string; linkingCode: string; onConfirmed: () => void }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/communication/line-link", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId, linkingCode: code, simulatedLineUserId: `U${Math.random().toString(36).slice(2, 10)}` }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast.success("ยืนยันการเชื่อมต่อ LINE สำเร็จ (จำลอง)");
      setOpen(false);
      onConfirmed();
    } catch (err) {
      toast.error("ยืนยันไม่สำเร็จ", { description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={() => setCode(linkingCode)}>
          จำลองการยืนยันจากฝั่งผู้ปกครอง (LINE Login simulation)
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>จำลองการยืนยันบัญชี LINE</DialogTitle>
          <DialogDescription>
            แบบฟอร์มนี้จำลองหน้าจอที่ผู้ปกครองจะเห็นหลัง LINE Login จริง (ซึ่งยังไม่ได้เชื่อมต่อในระบบทดลองนี้) กรอกรหัสเพื่อยืนยันการเชื่อมต่อ
          </DialogDescription>
        </DialogHeader>
        <Input placeholder="รหัสเชื่อมต่อ" value={code} onChange={(e) => setCode(e.target.value)} />
        <DialogFooter>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? "กำลังยืนยัน..." : "ยืนยันการเชื่อมต่อ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

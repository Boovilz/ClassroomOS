"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface LoginLogRow {
  id: string;
  success: boolean;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  users: { full_name: string; email: string } | null;
}

export function SecurityTab() {
  const [enabled, setEnabled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [logs, setLogs] = useState<LoginLogRow[]>([]);

  useEffect(() => {
    fetch("/api/admin/security/2fa")
      .then((r) => r.json())
      .then((b) => setEnabled(!!b.enabled));
    fetch("/api/admin/security/login-logs")
      .then((r) => r.json())
      .then((b) => setLogs(b.logs ?? []));
  }, []);

  async function handleEnroll() {
    setEnrolling(true);
    const res = await fetch("/api/admin/security/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "enroll" }),
    });
    const body = await res.json().catch(() => ({}));
    setEnrolling(false);
    if (!res.ok) {
      toast.error("เริ่มลงทะเบียน 2FA ไม่สำเร็จ", { description: body.error });
      return;
    }
    setSecret(body.secret);
    setUri(body.uri);
  }

  async function handleVerify() {
    const res = await fetch("/api/admin/security/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", code }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error("ยืนยันรหัสไม่สำเร็จ", { description: body.error });
      return;
    }
    toast.success("เปิดใช้งาน 2FA สำเร็จ");
    setEnabled(true);
    setSecret(null);
    setUri(null);
    setCode("");
  }

  async function handleDisable() {
    const res = await fetch("/api/admin/security/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disable" }),
    });
    if (res.ok) {
      toast.success("ปิดใช้งาน 2FA แล้ว");
      setEnabled(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-2">การยืนยันตัวตนสองชั้น (2FA)</h3>
        {enabled ? (
          <div className="flex items-center gap-3">
            <Badge variant="success">เปิดใช้งานแล้ว</Badge>
            <Button size="sm" variant="outline" onClick={handleDisable}>
              ปิดใช้งาน 2FA
            </Button>
          </div>
        ) : secret ? (
          <div className="space-y-3 max-w-sm">
            <p className="text-xs text-muted-foreground">
              เปิดแอป Authenticator (เช่น Google Authenticator) แล้วสแกน URI ด้านล่าง หรือกรอกรหัสลับด้วยตนเอง
            </p>
            <Input readOnly value={uri ?? ""} className="text-xs font-mono" />
            <p className="text-xs">รหัสลับ: <span className="font-mono">{secret}</span></p>
            <div className="flex gap-2">
              <Input placeholder="กรอกรหัส 6 หลัก" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} />
              <Button onClick={handleVerify}>ยืนยัน</Button>
            </div>
          </div>
        ) : (
          <Button onClick={handleEnroll} disabled={enrolling} size="sm">
            {enrolling ? "กำลังเริ่ม..." : "เริ่มลงทะเบียน 2FA"}
          </Button>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">การตรวจสอบการเข้าสู่ระบบ</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>เวลา</TableHead>
              <TableHead>ผู้ใช้</TableHead>
              <TableHead>อุปกรณ์</TableHead>
              <TableHead>ผลลัพธ์</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">ยังไม่มีประวัติการเข้าสู่ระบบ</TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs">{new Date(log.created_at).toLocaleString("th-TH")}</TableCell>
                  <TableCell>{log.users?.full_name ?? "-"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[240px]">{log.user_agent ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={log.success ? "success" : "destructive"}>{log.success ? "สำเร็จ" : "ไม่สำเร็จ"}</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

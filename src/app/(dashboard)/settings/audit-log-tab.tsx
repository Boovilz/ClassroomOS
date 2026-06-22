"use client";

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface AuditLogRow {
  id: string;
  action: string;
  entity_table: string | null;
  entity_id: string | null;
  created_at: string;
  users: { full_name: string; email: string } | null;
}

const ACTION_LABEL_TH: Record<string, string> = {
  create: "สร้าง",
  update: "แก้ไข",
  delete: "ลบ",
  restore: "กู้คืน",
  login: "เข้าสู่ระบบ",
  export: "ส่งออก",
  print: "พิมพ์",
};

export function AuditLogTab() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [tableFilter, setTableFilter] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (actionFilter) params.set("action", actionFilter);
    if (tableFilter) params.set("entityTable", tableFilter);
    setLoading(true);
    fetch(`/api/admin/audit-logs?${params}`)
      .then((r) => r.json())
      .then((body) => setLogs(body.logs ?? []))
      .finally(() => setLoading(false));
  }, [actionFilter, tableFilter]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input placeholder="กรองตามการกระทำ (create/update/...)" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="max-w-xs" />
        <Input placeholder="กรองตามตาราง (students/users/...)" value={tableFilter} onChange={(e) => setTableFilter(e.target.value)} className="max-w-xs" />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>เวลา</TableHead>
            <TableHead>ผู้ดำเนินการ</TableHead>
            <TableHead>การกระทำ</TableHead>
            <TableHead>ตาราง/Entity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">กำลังโหลด...</TableCell>
            </TableRow>
          ) : logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">ไม่พบประวัติการใช้งาน</TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-xs">{new Date(log.created_at).toLocaleString("th-TH")}</TableCell>
                <TableCell>{log.users?.full_name ?? "ระบบ"}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{ACTION_LABEL_TH[log.action] ?? log.action}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{log.entity_table ?? "-"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

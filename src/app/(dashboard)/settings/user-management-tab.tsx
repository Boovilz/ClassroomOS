"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { ROLE_LABEL_TH } from "@/lib/auth/rbac";
import type { Role } from "@/lib/types";

interface AdminUserRow {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  is_active: boolean;
  deleted_at: string | null;
}

export function UserManagementTab() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function reload() {
    setLoading(true);
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((body) => setUsers(body.users ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, []);

  async function toggleSuspend(user: AdminUserRow) {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suspend: !user.deleted_at }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("ดำเนินการไม่สำเร็จ", { description: body.error });
      return;
    }
    toast.success(user.deleted_at ? "กู้คืนผู้ใช้แล้ว" : "ระงับผู้ใช้แล้ว");
    reload();
  }

  async function resetPassword(user: AdminUserRow) {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetPassword: true }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.resetPassword?.error) {
      toast.error("รีเซ็ตรหัสผ่านไม่สำเร็จ", { description: body.error ?? body.resetPassword?.error });
      return;
    }
    toast.success("รีเซ็ตรหัสผ่านสำเร็จ", { description: `รหัสผ่านใหม่: ${body.resetPassword?.tempPassword}` });
  }

  async function bulkAction(action: string) {
    if (selected.size === 0) return;
    const res = await fetch("/api/admin/users/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), action }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("ดำเนินการแบบกลุ่มไม่สำเร็จ", { description: body.error });
      return;
    }
    toast.success("ดำเนินการแบบกลุ่มสำเร็จ");
    setSelected(new Set());
    reload();
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2 text-sm">
          <span>เลือกแล้ว {selected.size} รายการ</span>
          <Button size="sm" variant="outline" onClick={() => bulkAction("suspend")}>
            ระงับ
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkAction("activate")}>
            เปิดใช้งาน
          </Button>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>ชื่อ-นามสกุล</TableHead>
            <TableHead>อีเมล</TableHead>
            <TableHead>บทบาท</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                กำลังโหลด...
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                ยังไม่มีผู้ใช้งาน
              </TableCell>
            </TableRow>
          ) : (
            users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(u.id)}
                    onCheckedChange={(checked) => {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (checked) next.add(u.id);
                        else next.delete(u.id);
                        return next;
                      });
                    }}
                  />
                </TableCell>
                <TableCell>{u.full_name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{ROLE_LABEL_TH[u.role] ?? u.role}</TableCell>
                <TableCell>
                  <Badge variant={u.deleted_at ? "destructive" : u.is_active ? "success" : "secondary"}>
                    {u.deleted_at ? "ระงับการใช้งาน" : u.is_active ? "ใช้งานอยู่" : "ปิดใช้งาน"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toggleSuspend(u)}>
                        {u.deleted_at ? "กู้คืนผู้ใช้" : "ระงับผู้ใช้"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => resetPassword(u)}>รีเซ็ตรหัสผ่าน</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLE_LABEL_TH } from "@/lib/auth/rbac";
import type { Role } from "@/lib/types";

interface MatrixOverride {
  role: Role;
  permission_key: string;
  allowed: boolean;
}

/**
 * Checkbox grid of roles x permissions. Cells reflect overrides stored in
 * `role_permissions`; unchecked-but-not-overridden cells fall back to the
 * hardcoded rbac.ts defaults (shown pre-checked) so the matrix always
 * starts populated, not blank.
 */
export function RolesMatrixTab() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<MatrixOverride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/permissions")
      .then((r) => r.json())
      .then((body) => {
        setRoles(body.roles ?? []);
        setPermissions(body.permissions ?? []);
        setOverrides(body.overrides ?? []);
      })
      .catch(() => toast.error("โหลดเมทริกซ์สิทธิ์ไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);

  function isChecked(role: Role, permissionKey: string) {
    const override = overrides.find((o) => o.role === role && o.permission_key === permissionKey);
    if (override) return override.allowed;
    // Default fallback: broad roles start checked for everything except super_admin-only items.
    return role === "school_admin" || role === "principal";
  }

  async function toggle(role: Role, permissionKey: string) {
    const next = !isChecked(role, permissionKey);
    setOverrides((prev) => {
      const idx = prev.findIndex((o) => o.role === role && o.permission_key === permissionKey);
      const updated = { role, permission_key: permissionKey, allowed: next };
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      }
      return [...prev, updated];
    });
    const res = await fetch("/api/admin/permissions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, permissionKey, allowed: next }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("บันทึกสิทธิ์ไม่สำเร็จ", { description: body.error });
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">กำลังโหลด...</p>;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-background">สิทธิ์ / บทบาท</TableHead>
            {roles.map((r) => (
              <TableHead key={r} className="text-center whitespace-nowrap">
                {ROLE_LABEL_TH[r] ?? r}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {permissions.map((p) => (
            <TableRow key={p}>
              <TableCell className="sticky left-0 bg-background font-mono text-xs">{p}</TableCell>
              {roles.map((r) => (
                <TableCell key={r} className="text-center">
                  <Checkbox checked={isChecked(r, p)} onCheckedChange={() => toggle(r, p)} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

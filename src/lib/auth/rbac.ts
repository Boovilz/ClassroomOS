import type { Role } from "@/lib/types";

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  super_admin: ["*"],
  school_admin: [
    "students:*",
    "teachers:*",
    "attendance:*",
    "behavior:*",
    "academic:*",
    "health:*",
    "finance:*",
    "documents:*",
    "communication:*",
    "reports:*",
    "settings:school",
    "admin:users",
    "admin:roles",
    "admin:audit",
    "admin:backup",
    "admin:theme",
    "admin:security",
    "admin:subscription",
  ],
  teacher: [
    "students:read",
    "students:update",
    "attendance:*",
    "behavior:*",
    "academic:*",
    "health:read",
    "health:create",
    "communication:*",
    "documents:read",
    "documents:create",
  ],
  parent: [
    "students:read:own",
    "attendance:read:own",
    "behavior:read:own",
    "academic:read:own",
    "health:read:own",
    "finance:read:own",
    "communication:read",
  ],
  student: [
    "students:read:self",
    "attendance:read:self",
    "behavior:read:self",
    "academic:read:self",
    "leaderboard:read",
    "reward-shop:read",
  ],
  // ---- New roles added for the Admin Settings & Super Admin module ----
  // These reuse school_admin's broad operational access pattern, scoped
  // down to the slice of the app each job title actually owns. None of
  // them receive "settings:school" or any "admin:*" permission - those
  // stay school_admin/super_admin-only.
  principal: [
    "students:*",
    "teachers:*",
    "attendance:*",
    "behavior:*",
    "academic:*",
    "health:read",
    "finance:read",
    "documents:*",
    "communication:*",
    "reports:*",
  ],
  homeroom_teacher: [
    "students:read",
    "students:update",
    "attendance:*",
    "behavior:*",
    "academic:*",
    "health:read",
    "health:create",
    "communication:*",
    "documents:read",
    "documents:create",
  ],
  finance_officer: ["students:read", "finance:*", "reports:read", "documents:read"],
  health_officer: ["students:read", "health:*", "reports:read", "documents:read"],
  guidance_teacher: [
    "students:read",
    "behavior:*",
    "academic:read",
    "health:read",
    "communication:*",
    "documents:read",
    "reports:read",
  ],
};

export function can(role: Role, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (perms.includes("*")) return true;
  if (perms.includes(permission)) return true;

  const [resource] = permission.split(":");
  return perms.includes(`${resource}:*`);
}

/** All permission keys known to the system, used to render the Role & Permission Matrix UI. */
export const ALL_PERMISSION_KEYS = Array.from(
  new Set(Object.values(ROLE_PERMISSIONS).flat().filter((p) => p !== "*"))
).sort();

/** All roles a school_admin/super_admin can assign via User Management (super_admin itself is assigned out-of-band). */
export const ASSIGNABLE_ROLES: Role[] = [
  "school_admin",
  "principal",
  "homeroom_teacher",
  "teacher",
  "finance_officer",
  "health_officer",
  "guidance_teacher",
  "parent",
  "student",
];

export const ROLE_LABEL_TH: Record<Role, string> = {
  super_admin: "ผู้ดูแลระบบสูงสุด",
  school_admin: "ผู้ดูแลโรงเรียน",
  principal: "ผู้อำนวยการ",
  homeroom_teacher: "ครูประจำชั้น",
  teacher: "ครู",
  finance_officer: "เจ้าหน้าที่การเงิน",
  health_officer: "เจ้าหน้าที่อนามัย",
  guidance_teacher: "ครูแนะแนว",
  parent: "ผู้ปกครอง",
  student: "นักเรียน",
};

export const ROUTE_ROLES: Record<string, Role[]> = {
  "/dashboard": ["super_admin", "school_admin", "teacher", "parent", "student", "principal", "homeroom_teacher", "finance_officer", "health_officer", "guidance_teacher"],
  "/students": ["super_admin", "school_admin", "teacher", "principal", "homeroom_teacher"],
  "/attendance": ["super_admin", "school_admin", "teacher", "principal", "homeroom_teacher"],
  "/attendance/kiosk": ["super_admin", "school_admin", "teacher", "homeroom_teacher"],
  "/behavior": ["super_admin", "school_admin", "teacher", "principal", "homeroom_teacher", "guidance_teacher"],
  "/leaderboard": ["super_admin", "school_admin", "teacher", "parent", "student"],
  "/reward-shop": ["super_admin", "school_admin", "teacher", "parent", "student"],
  "/academic": ["super_admin", "school_admin", "teacher", "parent", "student", "principal", "homeroom_teacher"],
  "/health": ["super_admin", "school_admin", "teacher", "health_officer", "guidance_teacher"],
  "/finance": ["super_admin", "school_admin", "teacher", "finance_officer", "principal"],
  "/settings": ["super_admin", "school_admin"],
  "/admin": ["super_admin"],
};

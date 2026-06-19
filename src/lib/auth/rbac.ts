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
};

export function can(role: Role, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (perms.includes("*")) return true;
  if (perms.includes(permission)) return true;

  const [resource] = permission.split(":");
  return perms.includes(`${resource}:*`);
}

export const ROUTE_ROLES: Record<string, Role[]> = {
  "/dashboard": ["super_admin", "school_admin", "teacher", "parent", "student"],
  "/students": ["super_admin", "school_admin", "teacher"],
  "/attendance": ["super_admin", "school_admin", "teacher"],
  "/attendance/kiosk": ["super_admin", "school_admin", "teacher"],
  "/behavior": ["super_admin", "school_admin", "teacher"],
  "/leaderboard": ["super_admin", "school_admin", "teacher", "parent", "student"],
  "/reward-shop": ["super_admin", "school_admin", "teacher", "parent", "student"],
  "/academic": ["super_admin", "school_admin", "teacher", "parent", "student"],
  "/health": ["super_admin", "school_admin", "teacher"],
  "/finance": ["super_admin", "school_admin", "teacher"],
  "/settings": ["super_admin", "school_admin"],
};

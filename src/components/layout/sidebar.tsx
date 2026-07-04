"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  CheckSquare,
  Star,
  BookOpen,
  Wallet,
  HeartPulse,
  Home,
  FileText,
  MessageCircle,
  Settings,
  Trophy,
  Gift,
  Utensils,
  ClipboardList,
  BarChart3,
  Users,
  Sparkles,
  ShieldCheck,
  ClipboardCheck,
  Bell,
  CalendarDays,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

const NAV_ITEMS = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/students", label: "นักเรียน", icon: GraduationCap },
  { href: "/attendance", label: "การเช็คชื่อ", icon: CheckSquare },
  { href: "/behavior", label: "พฤติกรรม & XP", icon: Star },
  { href: "/leaderboard", label: "กระดานผู้นำ", icon: Trophy },
  { href: "/reward-shop", label: "ร้านค้ารางวัล", icon: Gift },
  { href: "/academic", label: "ผลการเรียน", icon: BookOpen },
  { href: "/finance", label: "การเงินห้องเรียน", icon: Wallet },
  { href: "/health", label: "สุขภาพนักเรียน", icon: HeartPulse },
  { href: "/lunch", label: "อาหารกลางวัน", icon: Utensils },
  { href: "/home-visits", label: "เยี่ยมบ้าน", icon: Home },
  { href: "/clubs", label: "ชุมนุม", icon: Users },
  { href: "/supervision", label: "นิเทศการสอน", icon: ClipboardCheck },
  { href: "/sdq", label: "ประเมิน SDQ", icon: ClipboardList },
  { href: "/documents", label: "เอกสาร", icon: FileText },
  { href: "/communication", label: "สื่อสารผู้ปกครอง", icon: MessageCircle },
  { href: "/ai", label: "AI ผู้ช่วยอัจฉริยะ", icon: Sparkles },
  { href: "/parent-portal", label: "พอร์ทัลผู้ปกครอง", icon: Users },
  { href: "/calendar", label: "ปฏิทินกลาง", icon: CalendarDays },
  { href: "/automation", label: "Workflow Automation", icon: Zap },
  { href: "/notifications", label: "การแจ้งเตือน", icon: Bell },
  { href: "/reports", label: "รายงาน", icon: BarChart3 },
  { href: "/settings", label: "ตั้งค่า", icon: Settings },
];

const SUPER_ADMIN_NAV_ITEM = { href: "/admin", label: "ผู้ดูแลระบบสูงสุด", icon: ShieldCheck };

export function Sidebar({ role }: { role?: Role | null }) {
  const pathname = usePathname();
  const items = role === "super_admin" ? [...NAV_ITEMS, SUPER_ADMIN_NAV_ITEM] : NAV_ITEMS;

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col border-r border-border bg-card/60 backdrop-blur-xl px-4 py-6">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold">
          T
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Teacher</p>
          <p className="text-sm font-semibold leading-tight">Classroom OS</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

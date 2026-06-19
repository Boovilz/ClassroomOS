"use client";

import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DashboardNotification } from "@/lib/queries/dashboard";

const PRIORITY_LABEL: Record<DashboardNotification["priority"], string> = {
  low: "ทั่วไป",
  medium: "ปานกลาง",
  high: "สำคัญ",
  critical: "วิกฤต",
};

const PRIORITY_VARIANT: Record<DashboardNotification["priority"], "secondary" | "accent" | "destructive"> = {
  low: "secondary",
  medium: "secondary",
  high: "accent",
  critical: "destructive",
};

export function NotificationPanel({ notifications }: { notifications: DashboardNotification[] }) {
  const router = useRouter();

  async function markAsRead(id: string) {
    const supabase = createClient();
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    router.refresh();
  }

  return (
    <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
      {notifications.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
          <Bell className="h-8 w-8" />
          <p className="text-sm">ยังไม่มีการแจ้งเตือน</p>
        </div>
      )}
      {notifications.map((n) => (
        <button
          key={n.id}
          onClick={() => !n.read_at && markAsRead(n.id)}
          className={cn(
            "flex w-full flex-col gap-1 rounded-xl border border-border p-3 text-left transition-colors hover:bg-muted",
            !n.read_at && "bg-primary/5"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{n.title}</p>
            <Badge variant={PRIORITY_VARIANT[n.priority]}>{PRIORITY_LABEL[n.priority]}</Badge>
          </div>
          {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
          <p className="text-[11px] text-muted-foreground">
            {new Date(n.created_at).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
        </button>
      ))}
    </div>
  );
}

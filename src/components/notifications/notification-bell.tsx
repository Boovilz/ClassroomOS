"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NotificationDrawer } from "./notification-drawer";

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchUnread = useCallback(async () => {
    const res = await fetch("/api/notifications?filter=unread&limit=1");
    if (res.ok) {
      const json = await res.json();
      setUnreadCount(json.unreadCount ?? 0);
    }
  }, []);

  useEffect(() => {
    fetchUnread();
    const supabase = createClient();
    const channel = supabase
      .channel("notifications-bell")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        fetchUnread();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchUnread]);

  return (
    <>
      <button
        className="relative rounded-full p-2 hover:bg-muted transition-colors"
        onClick={() => setDrawerOpen(true)}
        aria-label="การแจ้งเตือน"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      <NotificationDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onUnreadChange={setUnreadCount}
      />
    </>
  );
}

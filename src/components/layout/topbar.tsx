"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { SearchTrigger } from "@/components/search/search-trigger";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  return (
    <header className="flex h-16 items-center justify-between gap-2 border-b border-border bg-card/60 backdrop-blur-xl px-4 md:px-6">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="md:hidden rounded-lg p-1.5 text-muted-foreground hover:bg-muted shrink-0"
          aria-label="เปิดเมนู"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="w-full max-w-md">
          <SearchTrigger />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        <ThemeToggle />
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button>
              <Avatar>
                <AvatarFallback>คร</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>บัญชีของฉัน</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">ตั้งค่า</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/login">ออกจากระบบ</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

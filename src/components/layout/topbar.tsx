"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notifications/notification-bell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Topbar() {
  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-card/60 backdrop-blur-xl px-6">
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="ค้นหานักเรียน, เอกสาร, รายงาน..." className="pl-9" />
      </div>

      <div className="flex items-center gap-4">
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

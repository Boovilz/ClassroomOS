"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "classroomos_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(STORAGE_KEY, "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Cookie className="h-6 w-6 text-primary shrink-0 mt-0.5 sm:mt-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">คุกกี้และความเป็นส่วนตัว</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            เราใช้คุกกี้เพื่อยืนยันตัวตนและปรับปรุงประสบการณ์การใช้งาน ข้อมูลของคุณถูกจัดเก็บอย่างปลอดภัยตาม{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-primary transition-colors">
              นโยบายความเป็นส่วนตัว
            </Link>
            {" "}และ{" "}
            <Link href="/terms" className="underline underline-offset-2 hover:text-primary transition-colors">
              ข้อกำหนดการใช้งาน
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={decline} className="flex-1 sm:flex-none gap-1.5">
            <X className="h-3.5 w-3.5" /> ปฏิเสธ
          </Button>
          <Button size="sm" onClick={accept} className="flex-1 sm:flex-none">
            ยอมรับทั้งหมด
          </Button>
        </div>
      </div>
    </div>
  );
}

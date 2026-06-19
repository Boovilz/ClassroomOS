"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { QrCard, type QrCardData } from "@/components/attendance/qr-card";
import { Printer } from "lucide-react";

interface StudentLite {
  id: string;
  full_name: string;
  student_code: string;
  classroom: string | null;
  avatar_url: string | null;
}

/**
 * Fetches a fresh signed QR token per student (via /api/attendance/checkin)
 * and renders a printable grid of QrCard components.
 */
export function QrCardsGrid({ students }: { students: StudentLite[] }) {
  const [cards, setCards] = useState<QrCardData[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTokens() {
      const results = await Promise.all(
        students.map(async (s) => {
          try {
            const res = await fetch("/api/attendance/checkin", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ studentId: s.id }),
            });
            const data = await res.json();
            return {
              studentId: s.id,
              fullName: s.full_name,
              studentCode: s.student_code,
              classroom: s.classroom,
              avatarUrl: s.avatar_url,
              qrValue: data.success ? data.token : s.student_code,
            };
          } catch {
            return {
              studentId: s.id,
              fullName: s.full_name,
              studentCode: s.student_code,
              classroom: s.classroom,
              avatarUrl: s.avatar_url,
              qrValue: s.student_code,
            };
          }
        })
      );
      if (!cancelled) setCards(results);
    }

    loadTokens();
    return () => {
      cancelled = true;
    };
  }, [students]);

  if (!cards) {
    return <p className="text-sm text-muted-foreground">กำลังสร้าง QR...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end print:hidden">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> พิมพ์บัตรทั้งหมด
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3">
        {cards.map((c) => (
          <QrCard key={c.studentId} data={c} />
        ))}
      </div>
    </div>
  );
}

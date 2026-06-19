"use client";

import { useEffect, useState } from "react";

/** Large fullscreen-friendly live clock for the kiosk display. */
export function KioskClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center">
      <p className="text-5xl font-bold tabular-nums sm:text-7xl">
        {now ? now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {now
          ? now.toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
          : ""}
      </p>
    </div>
  );
}

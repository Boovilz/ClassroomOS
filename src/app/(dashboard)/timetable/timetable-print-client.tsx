"use client";
import { Printer } from "lucide-react";

export function TimetablePrintClient() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm"
    >
      <Printer className="h-4 w-4" />
      พิมพ์ตาราง
    </button>
  );
}

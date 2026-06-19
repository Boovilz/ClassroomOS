"use client";

import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";

function toCsvValue(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCsv(filename: string, headers: string[], rows: (string | number | null)[][]) {
  const lines = [headers.map(toCsvValue).join(","), ...rows.map((row) => row.map(toCsvValue).join(","))];
  // Prefix with BOM so Thai characters render correctly in Excel.
  const csvContent = "﻿" + lines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function CsvExportButton({
  filename,
  headers,
  rows,
  label = "ดาวน์โหลด CSV",
}: {
  filename: string;
  headers: string[];
  rows: (string | number | null)[][];
  label?: string;
}) {
  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={() => exportToCsv(filename, headers, rows)}>
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}

export function PrintButton({ label = "พิมพ์ / บันทึก PDF" }: { label?: string }) {
  return (
    <Button variant="outline" size="sm" className="gap-2 print:hidden" onClick={() => window.print()}>
      <Printer className="h-4 w-4" />
      {label}
    </Button>
  );
}

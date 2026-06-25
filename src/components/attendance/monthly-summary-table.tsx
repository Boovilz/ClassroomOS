"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import type { AttendanceReportRow } from "@/lib/queries/attendance";

const STATUS_LEGEND: { key: keyof Pick<AttendanceReportRow, "present" | "late" | "sick" | "personalLeave" | "absent">; abbr: string; label: string }[] = [
  { key: "present", abbr: "ม", label: "มาเรียน" },
  { key: "late", abbr: "สาย", label: "มาสาย" },
  { key: "sick", abbr: "ลาป่วย", label: "ลาป่วย" },
  { key: "personalLeave", abbr: "ลากิจ", label: "ลากิจ" },
  { key: "absent", abbr: "ขก", label: "ขาดเรียน" },
];

export function MonthlySummaryTable({ data, month }: { data: AttendanceReportRow[]; month: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    if (!filter.trim()) return data;
    const q = filter.trim().toLowerCase();
    return data.filter((r) => r.full_name.toLowerCase().includes(q) || r.student_code.toLowerCase().includes(q));
  }, [data, filter]);

  function changeMonth(value: string) {
    if (!value) return;
    router.push(`${pathname}?month=${value}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input type="month" value={month} onChange={(e) => changeMonth(e.target.value)} className="w-40" />
        <Input placeholder="ค้นหาชื่อหรือรหัสนักเรียน..." value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs" />
      </div>

      <div className="flex flex-wrap gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
        <span className="font-medium text-muted-foreground">เกณฑ์:</span>
        {STATUS_LEGEND.map((s) => (
          <span key={s.key} className="text-muted-foreground">
            <span className="font-semibold text-foreground">{s.abbr}</span> = {s.label}
          </span>
        ))}
        <span className="text-muted-foreground">
          <span className="font-semibold text-foreground">รวม</span> = จำนวนวันที่บันทึก
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium">รหัสนักเรียน</th>
              <th className="px-3 py-2 text-left font-medium">ชื่อ-นามสกุล</th>
              <th className="px-3 py-2 text-left font-medium">ห้องเรียน</th>
              {STATUS_LEGEND.map((s) => (
                <th key={s.key} className="px-3 py-2 text-center font-medium">
                  {s.abbr}
                </th>
              ))}
              <th className="px-3 py-2 text-center font-medium">รวม</th>
              <th className="px-3 py-2 text-center font-medium">อัตรา%</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((r) => (
                <tr key={r.student_id} className="border-b last:border-0">
                  <td className="px-3 py-2">{r.student_code}</td>
                  <td className="px-3 py-2">{r.full_name}</td>
                  <td className="px-3 py-2">{r.classroom ?? "-"}</td>
                  {STATUS_LEGEND.map((s) => (
                    <td key={s.key} className="px-3 py-2 text-center">
                      {r[s.key]}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center font-medium">{r.totalDays}</td>
                  <td className="px-3 py-2 text-center">{r.attendanceRatePercent}%</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="h-24 text-center text-muted-foreground">
                  ไม่พบข้อมูลการเข้าเรียน
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Area, AreaChart, Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AttendanceAnalytics } from "@/lib/queries/dashboard";

const chartConfig: ChartConfig = {
  present: { label: "มาเรียน", color: "hsl(160 84% 39%)" },
  late: { label: "มาสาย", color: "hsl(24 94% 53%)" },
  absent: { label: "ขาดเรียน", color: "hsl(0 84% 60%)" },
};

type Period = "daily" | "weekly" | "monthly";
type ChartType = "area" | "line";

export function AttendanceAnalyticsChart({ data }: { data: AttendanceAnalytics }) {
  const [period, setPeriod] = useState<Period>("daily");
  const [chartType, setChartType] = useState<ChartType>("area");
  const points = data[period];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="daily">รายวัน</TabsTrigger>
            <TabsTrigger value="weekly">รายสัปดาห์</TabsTrigger>
            <TabsTrigger value="monthly">รายเดือน</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
          <TabsList>
            <TabsTrigger value="area">พื้นที่</TabsTrigger>
            <TabsTrigger value="line">เส้น</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ChartContainer config={chartConfig} className="h-[260px] w-full">
        {chartType === "area" ? (
          <AreaChart data={points} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={24} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="present" stroke="var(--color-present)" fill="var(--color-present)" fillOpacity={0.2} />
            <Area type="monotone" dataKey="late" stroke="var(--color-late)" fill="var(--color-late)" fillOpacity={0.2} />
            <Area type="monotone" dataKey="absent" stroke="var(--color-absent)" fill="var(--color-absent)" fillOpacity={0.2} />
          </AreaChart>
        ) : (
          <LineChart data={points} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={24} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="present" stroke="var(--color-present)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="late" stroke="var(--color-late)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="absent" stroke="var(--color-absent)" strokeWidth={2} dot={false} />
          </LineChart>
        )}
      </ChartContainer>
    </div>
  );
}

"use client";

import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { AttendanceTrendPoint } from "@/lib/queries/dashboard";

const chartConfig: ChartConfig = {
  present: { label: "มาเรียน", color: "hsl(160 84% 39%)" },
  late: { label: "มาสาย", color: "hsl(24 94% 53%)" },
  absent: { label: "ขาดเรียน", color: "hsl(0 84% 60%)" },
};

export function AttendanceTrendChart({ data }: { data: AttendanceTrendPoint[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-[260px] w-full">
      <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => new Date(value).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
        />
        <YAxis tickLine={false} axisLine={false} width={24} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line type="monotone" dataKey="present" stroke="var(--color-present)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="late" stroke="var(--color-late)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="absent" stroke="var(--color-absent)" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartContainer>
  );
}

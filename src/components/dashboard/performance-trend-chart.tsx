"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { PerformanceTrendPoint } from "@/lib/queries/dashboard";

const chartConfig: ChartConfig = {
  averageScore: { label: "คะแนนเฉลี่ย (%)", color: "hsl(221 83% 53%)" },
};

export function PerformanceTrendChart({ data }: { data: PerformanceTrendPoint[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-[260px] w-full">
      <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="term" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="averageScore" fill="var(--color-averageScore)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

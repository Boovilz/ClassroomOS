"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { BehaviorAnalyticsPoint } from "@/lib/queries/dashboard";

const chartConfig: ChartConfig = {
  positive: { label: "คะแนนเชิงบวก", color: "hsl(160 84% 39%)" },
  negative: { label: "คะแนนเชิงลบ", color: "hsl(0 84% 60%)" },
};

export function BehaviorAnalyticsChart({ data }: { data: BehaviorAnalyticsPoint[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-[260px] w-full">
      <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={24} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="positive" stackId="a" fill="var(--color-positive)" radius={[6, 6, 0, 0]} />
        <Bar dataKey="negative" stackId="a" fill="var(--color-negative)" radius={[0, 0, 6, 6]} />
      </BarChart>
    </ChartContainer>
  );
}

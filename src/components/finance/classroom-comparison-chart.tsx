"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const chartConfig: ChartConfig = {
  totalSavings: { label: "เงินออมรวม", color: "hsl(217 91% 60%)" },
};

export function ClassroomComparisonChart({
  data,
}: {
  data: { classroom: string; totalSavings: number; accountCount: number; average: number }[];
}) {
  return (
    <ChartContainer config={chartConfig} className="h-[260px] w-full">
      <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="classroom" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={48} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="totalSavings" fill="var(--color-totalSavings)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

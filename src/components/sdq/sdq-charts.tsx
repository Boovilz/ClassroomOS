"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { SdqDashboardStats, SdqClassroomComparisonRow } from "@/lib/queries/sdq";

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#7f1d1d"];

const chartConfig: ChartConfig = {
  count: { label: "จำนวนนักเรียน", color: "hsl(217 91% 60%)" },
  averageTotalDifficulties: { label: "คะแนนเฉลี่ย", color: "hsl(217 91% 60%)" },
};

export function SdqRiskDistributionChart({ data }: { data: SdqDashboardStats["riskDistribution"] }) {
  return (
    <ChartContainer config={chartConfig} className="h-[260px] w-full">
      <PieChart margin={{ top: 8, bottom: 8 }}>
        <ChartTooltip content={<ChartTooltipContent />} />
        <Pie data={data} dataKey="count" nameKey="label" innerRadius={50} outerRadius={90} paddingAngle={2}>
          {data.map((_, idx) => (
            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

export function SdqClassroomComparisonChart({ data }: { data: SdqClassroomComparisonRow[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-[280px] w-full">
      <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="classroom" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="averageTotalDifficulties" fill="var(--color-averageTotalDifficulties)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

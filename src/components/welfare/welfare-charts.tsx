"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type {
  VisitCompletionPoint,
  RiskDistributionPoint,
  IncomeDistributionPoint,
  WelfareStatusPoint,
} from "@/lib/queries/welfare";

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7"];

const chartConfig: ChartConfig = {
  count: { label: "จำนวนนักเรียน", color: "hsl(217 91% 60%)" },
};

export function VisitCompletionChart({ data }: { data: VisitCompletionPoint[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-[260px] w-full">
      <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export function RiskDistributionChart({ data }: { data: RiskDistributionPoint[] }) {
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

export function IncomeDistributionChart({ data }: { data: IncomeDistributionPoint[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-[260px] w-full">
      <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="bracket" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export function WelfareStatusChart({ data }: { data: WelfareStatusPoint[] }) {
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

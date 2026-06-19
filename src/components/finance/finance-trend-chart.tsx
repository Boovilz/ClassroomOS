"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { MonthlyTrendPoint } from "@/lib/queries/finance";

const chartConfig: ChartConfig = {
  deposits: { label: "ยอดฝาก", color: "hsl(160 84% 39%)" },
  withdrawals: { label: "ยอดถอน", color: "hsl(0 84% 60%)" },
};

export function FinanceTrendChart({ data }: { data: MonthlyTrendPoint[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-[280px] w-full">
      <AreaChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={40} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area type="monotone" dataKey="deposits" stroke="var(--color-deposits)" fill="var(--color-deposits)" fillOpacity={0.25} strokeWidth={2} />
        <Area type="monotone" dataKey="withdrawals" stroke="var(--color-withdrawals)" fill="var(--color-withdrawals)" fillOpacity={0.25} strokeWidth={2} />
      </AreaChart>
    </ChartContainer>
  );
}

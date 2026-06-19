"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { VaccinationCoveragePoint } from "@/lib/queries/health";

const chartConfig: ChartConfig = {
  rate: { label: "ความครอบคลุม (%)", color: "hsl(160 84% 39%)" },
};

export function VaccinationCoverageChart({ data }: { data: VaccinationCoveragePoint[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-[280px] w-full">
      <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="vaccineName" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} width={32} domain={[0, 100]} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="rate" fill="var(--color-rate)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

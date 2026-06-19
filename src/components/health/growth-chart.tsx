"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { GrowthPoint } from "@/lib/queries/health";

const chartConfig: ChartConfig = {
  height_cm: { label: "ส่วนสูง (ซม.)", color: "hsl(217 91% 60%)" },
  weight_kg: { label: "น้ำหนัก (กก.)", color: "hsl(24 95% 53%)" },
};

export function GrowthChart({ data }: { data: GrowthPoint[] }) {
  const chartData = data.map((d) => ({
    date: new Date(d.recorded_at).toLocaleDateString("th-TH", { month: "short", year: "2-digit" }),
    height_cm: d.height_cm,
    weight_kg: d.weight_kg,
  }));

  return (
    <ChartContainer config={chartConfig} className="h-[280px] w-full">
      <LineChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line type="monotone" dataKey="height_cm" stroke="var(--color-height_cm)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="weight_kg" stroke="var(--color-weight_kg)" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartContainer>
  );
}

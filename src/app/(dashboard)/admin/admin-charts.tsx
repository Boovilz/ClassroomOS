"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const growthConfig: ChartConfig = {
  count: { label: "ผู้ใช้ใหม่", color: "hsl(217 91% 60%)" },
};

const loginConfig: ChartConfig = {
  count: { label: "การเข้าสู่ระบบ", color: "hsl(142 71% 45%)" },
};

export function UserGrowthChart({ data }: { data: { date: string; count: number }[] }) {
  return (
    <ChartContainer config={growthConfig} className="h-[260px] w-full">
      <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartContainer>
  );
}

export function LoginStatsChart({ data }: { data: { date: string; count: number }[] }) {
  return (
    <ChartContainer config={loginConfig} className="h-[260px] w-full">
      <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

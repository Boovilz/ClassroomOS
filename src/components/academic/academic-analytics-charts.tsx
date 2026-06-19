"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, PolarGrid, PolarAngleAxis, Radar, RadarChart, Line, LineChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AcademicAnalyticsPoint } from "@/lib/queries/dashboard";

const chartConfig: ChartConfig = {
  averageScore: { label: "คะแนนเฉลี่ย (%)", color: "hsl(217 91% 60%)" },
};

export function AcademicAnalyticsCharts({ data }: { data: AcademicAnalyticsPoint[] }) {
  const [chartType, setChartType] = useState<"bar" | "radar" | "line">("bar");

  return (
    <div className="space-y-3">
      <Tabs value={chartType} onValueChange={(v) => setChartType(v as "bar" | "radar" | "line")}>
        <TabsList>
          <TabsTrigger value="bar">แท่ง</TabsTrigger>
          <TabsTrigger value="radar">เรดาร์</TabsTrigger>
          <TabsTrigger value="line">เส้น</TabsTrigger>
        </TabsList>
      </Tabs>

      <ChartContainer config={chartConfig} className="h-[280px] w-full">
        {chartType === "bar" ? (
          <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="subject" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={24} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="averageScore" fill="var(--color-averageScore)" radius={6} />
          </BarChart>
        ) : chartType === "radar" ? (
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Radar dataKey="averageScore" stroke="var(--color-averageScore)" fill="var(--color-averageScore)" fillOpacity={0.3} />
          </RadarChart>
        ) : (
          <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="subject" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={24} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="averageScore" stroke="var(--color-averageScore)" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        )}
      </ChartContainer>
    </div>
  );
}

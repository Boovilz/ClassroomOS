"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FinanceAnalyticsPoint } from "@/lib/queries/dashboard";

const chartConfig: ChartConfig = {
  deposits: { label: "รับเข้า", color: "hsl(160 84% 39%)" },
  withdrawals: { label: "จ่ายออก", color: "hsl(0 84% 60%)" },
};

const PIE_COLORS = ["hsl(160 84% 39%)", "hsl(0 84% 60%)"];

export function FinanceAnalyticsChart({ trend, balance }: { trend: FinanceAnalyticsPoint[]; balance: number }) {
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");
  const totalDeposits = trend.reduce((s, p) => s + p.deposits, 0);
  const totalWithdrawals = trend.reduce((s, p) => s + p.withdrawals, 0);
  const pieData = [
    { name: "รับเข้า", value: totalDeposits },
    { name: "จ่ายออก", value: totalWithdrawals },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          คงเหลือสุทธิ: <span className="font-semibold text-foreground">{balance.toLocaleString()} บาท</span>
        </p>
        <Tabs value={chartType} onValueChange={(v) => setChartType(v as "bar" | "pie")}>
          <TabsList>
            <TabsTrigger value="bar">แท่ง</TabsTrigger>
            <TabsTrigger value="pie">วงกลม</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ChartContainer config={chartConfig} className="h-[260px] w-full">
        {chartType === "bar" ? (
          <BarChart data={trend} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={32} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="deposits" fill="var(--color-deposits)" radius={4} />
            <Bar dataKey="withdrawals" fill="var(--color-withdrawals)" radius={4} />
          </BarChart>
        ) : (
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
              {pieData.map((entry, i) => (
                <Cell key={entry.name} fill={PIE_COLORS[i]} />
              ))}
            </Pie>
          </PieChart>
        )}
      </ChartContainer>
    </div>
  );
}

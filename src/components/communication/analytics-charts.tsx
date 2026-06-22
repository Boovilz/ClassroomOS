"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { CommunicationAnalytics } from "@/lib/queries/communication";

const trendConfig: ChartConfig = {
  count: { label: "จำนวนการสื่อสาร", color: "hsl(217 91% 60%)" },
};

const deliveryConfig: ChartConfig = {
  rate: { label: "อัตราการส่งสำเร็จ (%)", color: "hsl(142 71% 45%)" },
};

export function NotificationTrendChart({ data }: { data: CommunicationAnalytics["notificationTrend"] }) {
  return (
    <ChartContainer config={trendConfig} className="h-[260px] w-full">
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

export function DeliveryRateChart({ data }: { data: CommunicationAnalytics["deliveryRateByChannel"] }) {
  return (
    <ChartContainer config={deliveryConfig} className="h-[260px] w-full">
      <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="channel" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="rate" fill="var(--color-rate)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

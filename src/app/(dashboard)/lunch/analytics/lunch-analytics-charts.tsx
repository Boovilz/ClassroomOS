"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ParticipationPoint {
  date: string;
  served: number;
  absent: number;
}

interface ClassroomComparisonRow {
  classroom: string;
  studentCount: number;
  servedCount: number;
  participationRate: number;
}

const nutritionStatusLabelTh: Record<string, string> = {
  severely_underweight: "ผอมมาก",
  underweight: "ผอม",
  normal: "ปกติ",
  overweight: "น้ำหนักเกิน",
  obese: "อ้วน",
  unknown: "ไม่ทราบ",
};

export function LunchAnalyticsCharts({
  participationTrend,
  nutritionBreakdown,
  classroomComparison,
}: {
  participationTrend: ParticipationPoint[];
  nutritionBreakdown: Record<string, number>;
  classroomComparison: ClassroomComparisonRow[];
}) {
  const nutritionData = Object.entries(nutritionBreakdown).map(([status, count]) => ({
    status: nutritionStatusLabelTh[status] ?? status,
    count,
  }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>แนวโน้มการรับอาหารกลางวัน (14 วัน)</CardTitle>
          <CardDescription>จำนวนนักเรียนที่ได้รับอาหารและขาดรับในแต่ละวัน</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={participationTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="served" name="ได้รับ" stroke="#16a34a" strokeWidth={2} />
              <Line type="monotone" dataKey="absent" name="ขาดรับ" stroke="#dc2626" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>สถานะโภชนาการของนักเรียน</CardTitle>
          <CardDescription>จำแนกตามสถานะโภชนาการล่าสุดของนักเรียนแต่ละคน</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={nutritionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" name="จำนวนนักเรียน" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="glass-card lg:col-span-2">
        <CardHeader>
          <CardTitle>เปรียบเทียบการรับอาหารตามห้องเรียน</CardTitle>
          <CardDescription>อัตราการรับอาหารกลางวันของแต่ละห้องเรียนวันนี้</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={classroomComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="classroom" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip />
              <Bar dataKey="participationRate" name="อัตราการรับอาหาร (%)" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

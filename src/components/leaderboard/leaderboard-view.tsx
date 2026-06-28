"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeaderboardTable, type LeaderboardRow } from "@/components/leaderboard/leaderboard-table";
import { LeaderboardCards } from "@/components/leaderboard/leaderboard-cards";

export function LeaderboardView({ data }: { data: LeaderboardRow[] }) {
  return (
    <Tabs defaultValue="cards">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="cards">การ์ด</TabsTrigger>
          <TabsTrigger value="table">ตาราง</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="cards" className="mt-4">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>อันดับนักเรียนทั้งหมด</CardTitle>
            <CardDescription>เรียงลำดับตาม XP มากไปน้อย แสดงรูปนักเรียนในแต่ละการ์ด</CardDescription>
          </CardHeader>
          <CardContent>
            <LeaderboardCards data={data} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="table" className="mt-4">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>อันดับนักเรียนทั้งหมด</CardTitle>
            <CardDescription>เรียงลำดับตาม XP มากไปน้อย คลิกชื่อคอลัมน์เพื่อจัดเรียงใหม่</CardDescription>
          </CardHeader>
          <CardContent>
            <LeaderboardTable data={data} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

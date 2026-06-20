"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { generateAiMenuSuggestion } from "@/lib/lunch/ai-menu-planner";

/**
 * Rule-based AI Menu Planner — runs entirely client-side using the same
 * deterministic generator as the server (no external LLM call), so it can
 * give an instant preview before a teacher commits to creating real menus.
 */
export function AiMenuPlanner() {
  const [days, setDays] = useState(5);
  const [budget, setBudget] = useState(20);
  const [result, setResult] = useState<ReturnType<typeof generateAiMenuSuggestion> | null>(null);

  function handleGenerate() {
    setResult(generateAiMenuSuggestion({ days, budgetPerStudent: budget }));
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>ผู้ช่วยวางแผนเมนู (AI Menu Planner)</CardTitle>
        <CardDescription>สร้างข้อเสนอเมนูแบบหมุนวนตามงบประมาณต่อนักเรียน (วิเคราะห์ด้วยกฎเกณฑ์ ไม่ใช่การเรียก AI ภายนอก)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground">จำนวนวัน</label>
            <Input type="number" min={1} max={30} value={days} onChange={(e) => setDays(Number(e.target.value) || 1)} className="w-24" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">งบประมาณต่อนักเรียน (บาท)</label>
            <Input type="number" min={1} value={budget} onChange={(e) => setBudget(Number(e.target.value) || 1)} className="w-32" />
          </div>
          <Button onClick={handleGenerate}>สร้างข้อเสนอเมนู</Button>
        </div>

        {result && (
          <div className="space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วัน</TableHead>
                  <TableHead>อาหารจานหลัก</TableHead>
                  <TableHead>ซุป/แกง</TableHead>
                  <TableHead>ผลไม้/นม</TableHead>
                  <TableHead>แคลอรี่</TableHead>
                  <TableHead>ต้นทุน/คน</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.suggestions.map((s) => (
                  <TableRow key={s.day}>
                    <TableCell>วันที่ {s.day}</TableCell>
                    <TableCell>{s.rice}</TableCell>
                    <TableCell>{s.soup}</TableCell>
                    <TableCell>
                      {s.fruit} / {s.milk}
                    </TableCell>
                    <TableCell>{s.estimatedCalories} kcal</TableCell>
                    <TableCell>{s.estimatedCost} บาท</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {result.notes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

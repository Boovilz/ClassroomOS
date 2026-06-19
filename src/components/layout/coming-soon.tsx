import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function ComingSoon({
  title,
  description,
  icon: Icon,
  plannedFeatures,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  plannedFeatures: string[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>กำลังพัฒนา</CardTitle>
              <CardDescription>โมดูลนี้อยู่ระหว่างการพัฒนา จะเปิดให้ใช้งานในเร็ว ๆ นี้</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-2 text-sm font-medium">แผนการพัฒนา:</p>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {plannedFeatures.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

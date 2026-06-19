import { Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BadgeRow {
  awarded_at: string;
  achievements: { id: string; title: string; description: string | null; icon: string | null } | null;
}

export function BadgeShowcase({ badges }: { badges: BadgeRow[] }) {
  if (badges.length === 0) {
    return <p className="text-sm text-muted-foreground">ยังไม่มีเหรียญตรา</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {badges.map((b, i) => (
        <div key={i} className="flex flex-col items-center gap-1 rounded-xl border border-border p-3 text-center">
          <Award className="h-6 w-6 text-accent" />
          <p className="text-xs font-medium">{b.achievements?.title}</p>
          <Badge variant="outline" className="text-[10px]">
            {new Date(b.awarded_at).toLocaleDateString("th-TH")}
          </Badge>
        </div>
      ))}
    </div>
  );
}

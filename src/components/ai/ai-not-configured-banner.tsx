import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Shown everywhere AI features are used while `ANTHROPIC_API_KEY` is
 * unset. Friendly Thai message, no crash, no broken UI - the user just
 * sees this instead of a chat response/analysis result.
 */
export function AiNotConfiguredBanner() {
  return (
    <Card className="border-amber-400/60 bg-amber-50 dark:bg-amber-950/30">
      <CardContent className="flex items-start gap-3 p-4">
        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-amber-800 dark:text-amber-300">ยังไม่ได้ตั้งค่า AI Provider</p>
          <p className="text-amber-700 dark:text-amber-400 mt-1">
            โปรดเพิ่ม <code className="rounded bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 font-mono text-xs">ANTHROPIC_API_KEY</code> ในไฟล์ .env ของเซิร์ฟเวอร์
            แล้วรีสตาร์ตแอปพลิเคชัน ฟีเจอร์ AI ทั้งหมด (แชท วิเคราะห์ ร่างเอกสาร) จะเริ่มทำงานได้ทันทีหลังตั้งค่า
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

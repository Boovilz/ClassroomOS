import { Utensils } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function LunchPage() {
  return (
    <ComingSoon
      title="ระบบอาหารกลางวัน"
      description="จัดการเมนูอาหาร บันทึกการรับอาหาร และเบิกจ่ายกองทุนอาหารกลางวัน"
      icon={Utensils}
      plannedFeatures={[
        "บันทึกเมนูอาหารประจำวัน/สัปดาห์",
        "เช็คชื่อนักเรียนที่รับอาหารกลางวัน (เชื่อมกับ meal_records)",
        "เชื่อมต่อกับกองทุนอาหารกลางวัน (finance_accounts ประเภท lunch_fund)",
        "รายงานสรุปค่าใช้จ่ายต่อเดือน",
      ]}
    />
  );
}

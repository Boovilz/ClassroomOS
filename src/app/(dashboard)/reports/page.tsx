import { BarChart3 } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function ReportsPage() {
  return (
    <ComingSoon
      title="รายงาน"
      description="รายงานสรุปข้อมูลภาพรวมของโรงเรียนในรูปแบบที่พิมพ์/ส่งออกได้"
      icon={BarChart3}
      plannedFeatures={[
        "รายงานสรุปการเข้าเรียนรายเดือน/รายภาคเรียน",
        "รายงานผลการเรียนเทียบรายห้อง",
        "รายงานพฤติกรรมและ XP สะสม",
        "ส่งออกรายงานเป็น PDF/Excel",
      ]}
    />
  );
}

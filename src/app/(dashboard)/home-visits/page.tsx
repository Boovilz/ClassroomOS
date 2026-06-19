import { Home } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function HomeVisitsPage() {
  return (
    <ComingSoon
      title="ระบบเยี่ยมบ้าน"
      description="บันทึกข้อมูลการเยี่ยมบ้านนักเรียนและสภาพแวดล้อมความเป็นอยู่"
      icon={Home}
      plannedFeatures={[
        "บันทึกการเยี่ยมบ้าน พร้อมรูปถ่ายและพิกัด (home_visits)",
        "แบบประเมินสภาพความเป็นอยู่และความเสี่ยง",
        "ประวัติการเยี่ยมบ้านย้อนหลังต่อนักเรียน",
        "แจ้งเตือนนักเรียนที่ควรได้รับการเยี่ยมบ้าน",
      ]}
    />
  );
}

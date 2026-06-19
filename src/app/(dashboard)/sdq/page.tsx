import { Brain } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function SdqPage() {
  return (
    <ComingSoon
      title="ระบบประเมิน SDQ"
      description="แบบประเมินพฤติกรรมและจุดแข็ง-จุดอ่อนของนักเรียน (Strengths and Difficulties Questionnaire)"
      icon={Brain}
      plannedFeatures={[
        "แบบประเมิน SDQ ออนไลน์สำหรับครู/ผู้ปกครอง",
        "คำนวณคะแนนรายด้าน (sdq_assessments)",
        "กราฟแสดงแนวโน้มผลประเมินรายบุคคล",
        "รายงานนักเรียนกลุ่มเสี่ยงให้ฝ่ายแนะแนว",
      ]}
    />
  );
}

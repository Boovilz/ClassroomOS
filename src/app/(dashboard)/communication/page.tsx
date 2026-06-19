import { MessageCircle } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function CommunicationPage() {
  return (
    <ComingSoon
      title="สื่อสารผู้ปกครอง"
      description="ส่งประกาศและข้อความถึงผู้ปกครองนักเรียน"
      icon={MessageCircle}
      plannedFeatures={[
        "ประกาศข่าวสารถึงผู้ปกครองทั้งโรงเรียน/ห้องเรียน (announcements)",
        "ส่งการแจ้งเตือนรายบุคคล (notifications)",
        "ประวัติการสื่อสารย้อนหลัง",
        "เชื่อมต่อ LINE Notify / อีเมลในอนาคต",
      ]}
    />
  );
}

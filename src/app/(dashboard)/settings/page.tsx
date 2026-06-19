import { Settings as SettingsIcon } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function SettingsPage() {
  return (
    <ComingSoon
      title="ตั้งค่า"
      description="จัดการข้อมูลโรงเรียน ผู้ใช้งาน และการตั้งค่าระบบ"
      icon={SettingsIcon}
      plannedFeatures={[
        "จัดการข้อมูลโรงเรียน (schools) และโลโก้",
        "จัดการผู้ใช้งานและบทบาท (users, RBAC)",
        "ตั้งค่าการแจ้งเตือนและอีเมล",
        "ตั้งค่าธีมสี/โลโก้สำหรับแต่ละโรงเรียน",
      ]}
    />
  );
}

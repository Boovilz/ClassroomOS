import { FileText } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function DocumentsPage() {
  return (
    <ComingSoon
      title="ศูนย์เอกสาร"
      description="จัดเก็บและจัดการเอกสารของโรงเรียน ห้องเรียน และนักเรียน"
      icon={FileText}
      plannedFeatures={[
        "อัปโหลด/ดาวน์โหลดเอกสาร (documents) ผ่าน Supabase Storage",
        "จัดหมวดหมู่เอกสารตามประเภท เช่น ใบลา ใบรับรอง",
        "กำหนดสิทธิ์การเข้าถึงเอกสารตามบทบาท",
        "ค้นหาเอกสารด้วยชื่อนักเรียนหรือคำสำคัญ",
      ]}
    />
  );
}

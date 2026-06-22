import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ImportWizard } from "@/app/(dashboard)/students/import/wizard/wizard-client";

export default function ImportWizardPage() {
  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/students/import">
          <ArrowLeft className="mr-2 h-4 w-4" />
          กลับไปหน้านำเข้านักเรียน
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-bold">ตัวช่วยนำเข้านักเรียน</h1>
        <p className="text-sm text-muted-foreground">นำเข้านักเรียนจาก Excel, CSV, API หรือ QR</p>
      </div>
      <ImportWizard />
    </div>
  );
}

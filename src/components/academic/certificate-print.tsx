"use client";

import { Button } from "@/components/ui/button";
import { Printer, Award } from "lucide-react";

export interface CertificateData {
  title: string;
  description: string | null;
  studentName: string;
  studentCode: string;
  schoolName: string;
  issuedAt: string;
}

export function CertificatePrint({ certificate }: { certificate: CertificateData }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end print:hidden">
        <Button variant="outline" onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          พิมพ์ / บันทึก PDF
        </Button>
      </div>

      <div className="print-page mx-auto flex max-w-3xl flex-col items-center gap-6 rounded-2xl border-4 border-double border-primary/60 bg-card p-12 text-center print:rounded-none">
        <Award className="h-16 w-16 text-amber-500" />
        <p className="text-sm uppercase tracking-widest text-muted-foreground">เกียรติบัตร / ประกาศเกียรติคุณ</p>
        <h1 className="text-2xl font-bold">{certificate.schoolName}</h1>
        <p className="text-lg">มอบให้เพื่อแสดงว่า</p>
        <h2 className="text-3xl font-bold text-primary">{certificate.studentName}</h2>
        <p className="text-sm text-muted-foreground">รหัสนักเรียน {certificate.studentCode}</p>
        <p className="text-lg font-semibold">{certificate.title}</p>
        {certificate.description && <p className="max-w-md text-sm text-muted-foreground">{certificate.description}</p>}
        <p className="text-sm text-muted-foreground">
          ออกให้ ณ วันที่ {new Date(certificate.issuedAt).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <div className="mt-8 grid w-full grid-cols-2 gap-12 text-center text-sm">
          <div>
            <div className="mb-1 border-b border-dashed border-foreground/40 pb-8" />
            <p>ลงชื่อ ครูประจำชั้น</p>
          </div>
          <div>
            <div className="mb-1 border-b border-dashed border-foreground/40 pb-8" />
            <p>ลงชื่อ ผู้อำนวยการ</p>
          </div>
        </div>
      </div>
    </div>
  );
}

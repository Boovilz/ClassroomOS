"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { User } from "lucide-react";

export interface CardConfig {
  theme: "indigo" | "blue" | "emerald" | "rose" | "slate";
  showPhoto: boolean;
  showClassroom: boolean;
  showGender: boolean;
  showBloodType: boolean;
  showBarcode: boolean;
  showBirthDate: boolean;
  showNationalId: boolean;
  showGuardianName: boolean;
  showSchoolAddress: boolean;
}

export interface StudentCardPreviewProps {
  student: {
    full_name: string;
    student_code: string;
    grade: string;
    classroom: string;
    gender?: string | null;
    blood_type?: string | null;
    birth_date?: string | null;
    citizen_id?: string | null;
    profile_picture_url?: string | null;
    parent_full_name?: string | null;
  };
  school: {
    name: string;
    address?: string | null;
  };
  config: CardConfig;
}

const themeHeaderClass: Record<CardConfig["theme"], string> = {
  indigo: "bg-indigo-700 text-white",
  blue: "bg-blue-700 text-white",
  emerald: "bg-emerald-700 text-white",
  rose: "bg-rose-700 text-white",
  slate: "bg-slate-700 text-white",
};

const themeAccentClass: Record<CardConfig["theme"], string> = {
  indigo: "border-indigo-700",
  blue: "border-blue-700",
  emerald: "border-emerald-700",
  rose: "border-rose-700",
  slate: "border-slate-700",
};

function formatBirthDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear() + 543; // Convert to Buddhist Era
  return `${day}/${month}/${year}`;
}

function maskNationalId(id: string | null | undefined): string {
  if (!id) return "-";
  const digits = id.replace(/\D/g, "");
  if (digits.length !== 13) return id;
  // Mask all except last digit: X-XXXX-XXXXX-XX-X (keep last)
  return `X-XXXX-XXXXX-XX-${digits[12]}`;
}

function GenderLabel({ gender }: { gender?: string | null }) {
  if (!gender) return <span>-</span>;
  const lower = gender.toLowerCase();
  if (lower === "male" || lower === "ชาย" || lower === "m") return <span>ชาย</span>;
  if (lower === "female" || lower === "หญิง" || lower === "f") return <span>หญิง</span>;
  return <span>{gender}</span>;
}

function QRCodeCanvas({ code }: { code: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, code, {
      width: 56,
      margin: 1,
      color: { dark: "#111111", light: "#ffffff" },
    });
  }, [code]);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <canvas ref={canvasRef} width={56} height={56} />
      <span className="text-[8px] tracking-widest text-gray-700 font-mono">{code}</span>
    </div>
  );
}

function BarcodeStripes({ code }: { code: string }) {
  // Use inline style (not Tailwind bg class) so print doesn't strip background colors
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-end gap-px h-8">
        {Array.from({ length: 30 }).map((_, i) => {
          const charCode = code.charCodeAt(i % code.length) + i;
          const height = 16 + (charCode % 16);
          const width = i % 3 === 0 ? 2 : 1;
          return (
            <div
              key={i}
              style={{ width: `${width}px`, height: `${height}px`, backgroundColor: "#111111" }}
            />
          );
        })}
      </div>
      <span className="text-[8px] tracking-widest text-gray-700 font-mono">{code}</span>
    </div>
  );
}

export function StudentCardPreview({ student, school, config }: StudentCardPreviewProps) {
  const header = themeHeaderClass[config.theme];
  const accent = themeAccentClass[config.theme];

  return (
    <div className="flex flex-col sm:flex-row gap-4 print:flex-row print:gap-3">
      {/* Front of card */}
      <div
        className={`w-[338px] min-h-[213px] rounded-xl border-2 ${accent} shadow-md overflow-hidden bg-white flex flex-col print:shadow-none print:rounded-lg`}
        style={{ aspectRatio: "3.375 / 2.125" }}
      >
        {/* Header */}
        <div className={`${header} px-3 py-2 flex items-center gap-2`}>
          <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">ร.ร.</span>
          </div>
          <span className="text-xs font-semibold leading-tight line-clamp-2">{school.name}</span>
        </div>

        {/* Body */}
        <div className="flex flex-1 gap-2 p-2">
          {/* Photo */}
          {config.showPhoto && (
            <div className="flex-shrink-0">
              {student.profile_picture_url ? (
                <img
                  src={student.profile_picture_url}
                  alt={student.full_name}
                  className="w-16 h-20 object-cover rounded border border-gray-200"
                />
              ) : (
                <div className="w-16 h-20 bg-gray-100 border border-gray-200 rounded flex items-center justify-center">
                  <User className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>
          )}

          {/* Info */}
          <div className="flex flex-col justify-between flex-1 min-w-0">
            <div>
              <p className="font-bold text-sm leading-tight text-gray-900 line-clamp-2">
                {student.full_name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">รหัส: {student.student_code}</p>

              {config.showClassroom && (
                <p className="text-xs text-gray-700 mt-0.5">
                  {student.grade}
                  {student.classroom ? `/${student.classroom}` : ""}
                </p>
              )}

              {config.showGender && (
                <p className="text-xs text-gray-700 mt-0.5">
                  เพศ: <GenderLabel gender={student.gender} />
                </p>
              )}

              {config.showBloodType && (
                <p className="text-xs text-gray-700 mt-0.5">
                  หมู่เลือด: {student.blood_type ?? "-"}
                </p>
              )}
            </div>

            {/* QR Code */}
            {config.showBarcode && (
              <div className="mt-1">
                <QRCodeCanvas code={student.student_code} />
              </div>
            )}
          </div>
        </div>

        {/* Footer stripe */}
        <div className={`h-1 ${header}`} />
      </div>

      {/* Back of card */}
      <div
        className={`w-[338px] min-h-[213px] rounded-xl border-2 ${accent} shadow-md overflow-hidden bg-white flex flex-col print:shadow-none print:rounded-lg`}
        style={{ aspectRatio: "3.375 / 2.125" }}
      >
        {/* Header */}
        <div className={`${header} px-3 py-2`}>
          <span className="text-xs font-semibold">บัตรนักเรียน — ข้อมูลเพิ่มเติม</span>
        </div>

        {/* Body */}
        <div className="flex flex-col flex-1 p-3 gap-1.5 text-xs text-gray-700">
          <p className="font-semibold text-gray-900 text-[11px] border-b pb-1 mb-0.5">
            {student.full_name}
          </p>

          {config.showBirthDate && (
            <div className="flex gap-1">
              <span className="text-gray-500 flex-shrink-0">วันเกิด:</span>
              <span>{formatBirthDate(student.birth_date)}</span>
            </div>
          )}

          {config.showNationalId && (
            <div className="flex gap-1">
              <span className="text-gray-500 flex-shrink-0">เลขบัตรประชาชน:</span>
              <span className="font-mono">{maskNationalId(student.citizen_id)}</span>
            </div>
          )}

          {config.showGuardianName && (
            <div className="flex gap-1">
              <span className="text-gray-500 flex-shrink-0">ผู้ปกครอง:</span>
              <span>{student.parent_full_name ?? "-"}</span>
            </div>
          )}

          {config.showSchoolAddress && school.address && (
            <div className="flex gap-1">
              <span className="text-gray-500 flex-shrink-0">ที่อยู่:</span>
              <span className="line-clamp-2">{school.address}</span>
            </div>
          )}

          <div className="mt-auto pt-2 border-t border-dashed border-gray-300">
            <p className="text-gray-500">ลายมือชื่อ _______________________</p>
          </div>
        </div>

        {/* Footer stripe */}
        <div className={`h-1 ${header}`} />
      </div>
    </div>
  );
}

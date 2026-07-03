"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import type { Club } from "@/lib/queries/clubs";

interface Member {
  id: string;
  student_id: string;
  student_name: string;
  student_code: string;
  classroom: string | null;
  status: string;
  attendance_count: number;
}

interface ClubMemberListPrintProps {
  club: Club;
  members: Member[];
  schoolName: string;
  advisorName?: string;
  presidentName?: string;
}

export function ClubMemberListPrint({ club, members, schoolName, advisorName, presidentName }: ClubMemberListPrintProps) {
  function handlePrint() {
    const activeMembers = members.filter((m) => m.status !== "dropped");
    const semesterDisplay = club.academic_year
      ? `${club.semester ?? 1}/${club.academic_year}`
      : "";

    const rows = activeMembers
      .map(
        (member, index) => `
      <tr>
        <td style="text-align:center;padding:6px 8px;border:1px solid #000">${index + 1}</td>
        <td style="text-align:center;padding:6px 8px;border:1px solid #000">${member.student_code}</td>
        <td style="padding:6px 8px;border:1px solid #000">${member.student_name}</td>
        <td style="text-align:center;padding:6px 8px;border:1px solid #000">${member.classroom ?? "-"}</td>
        <td style="text-align:center;padding:6px 8px;border:1px solid #000"></td>
        <td style="padding:6px 8px;border:1px solid #000"></td>
      </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <title>แบบรายงานรายชื่อสมาชิกชุมนุม ${club.name}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Sarabun', 'TH Sarabun New', sans-serif; font-size: 14pt; color: #000; }
    h1 { font-size: 16pt; text-align: center; margin-bottom: 8px; font-weight: bold; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin-bottom: 12px; font-size: 13pt; }
    .info-item { display: flex; gap: 4px; }
    .info-label { font-weight: bold; white-space: nowrap; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #f0f0f0; padding: 6px 8px; border: 1px solid #000; text-align: center; font-size: 13pt; }
    td { font-size: 13pt; }
    .footer { margin-top: 32px; display: flex; justify-content: flex-end; }
    .sign-block { text-align: center; width: 240px; }
    .sign-line { border-bottom: 1px solid #000; margin: 40px auto 4px; width: 200px; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <h1>แบบรายงานรายชื่อสมาชิกชุมนุม</h1>
  <div class="info-grid">
    <div class="info-item"><span class="info-label">ชุมนุม :</span><span>${club.name}</span></div>
    <div class="info-item"><span class="info-label">ภาคเรียนที่ :</span><span>${semesterDisplay}</span></div>
    <div class="info-item"><span class="info-label">ครูที่ปรึกษา :</span><span>${advisorName ?? "................................................"}</span></div>
    <div class="info-item"><span class="info-label">ประธานชุมนุม :</span><span>${presidentName ?? "................................................"}</span></div>
    <div class="info-item" style="grid-column:1/-1"><span class="info-label">จำนวนสมาชิกปัจจุบัน :</span><span>${activeMembers.length} / ${club.max_members ?? "ไม่จำกัด"} คน</span></div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:48px">ลำดับ</th>
        <th style="width:110px">รหัส</th>
        <th>ชื่อ-นามสกุล</th>
        <th style="width:90px">ชั้น/ห้อง</th>
        <th style="width:60px">เลขที่</th>
        <th style="width:110px">หมายเหตุ</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="6" style="text-align:center;padding:12px;border:1px solid #000">ไม่มีสมาชิก</td></tr>'}
    </tbody>
  </table>
  <div class="footer">
    <div class="sign-block">
      <div class="sign-line"></div>
      <p>(${advisorName ?? "................................"})</p>
      <p>ครูที่ปรึกษาชุมนุม</p>
    </div>
  </div>
</body>
</html>`;

    const win = window.open("", "_blank", "width=794,height=1123");
    if (!win) {
      alert("กรุณาอนุญาตให้เปิด popup เพื่อพิมพ์");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }

  return (
    <Button variant="outline" className="gap-2" onClick={handlePrint}>
      <Printer className="h-4 w-4" />
      พิมพ์รายชื่อสมาชิก
    </Button>
  );
}

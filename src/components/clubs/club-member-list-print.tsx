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
}

export function ClubMemberListPrint({ club, members, schoolName }: ClubMemberListPrintProps) {
  function handlePrint() {
    const activeMembers = members.filter((m) => m.status !== "dropped");

    const rows = activeMembers
      .map(
        (member, index) => `
      <tr>
        <td style="text-align:center;padding:6px 8px;border:1px solid #000">${index + 1}</td>
        <td style="text-align:center;padding:6px 8px;border:1px solid #000">${member.student_code}</td>
        <td style="padding:6px 8px;border:1px solid #000">${member.student_name}</td>
        <td style="text-align:center;padding:6px 8px;border:1px solid #000">${member.classroom ?? "-"}</td>
        <td style="padding:6px 8px;border:1px solid #000"></td>
      </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <title>รายชื่อสมาชิกชุมนุม ${club.name}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Sarabun', 'TH Sarabun New', sans-serif; font-size: 14pt; color: #000; }
    h1 { font-size: 18pt; text-align: center; margin-bottom: 4px; }
    .subtitle { text-align: center; font-size: 14pt; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #f0f0f0; padding: 8px; border: 1px solid #000; text-align: center; }
    tr:nth-child(even) { background: #fafafa; }
    .footer { margin-top: 32px; display: flex; justify-content: flex-end; }
    .sign-block { text-align: center; width: 200px; }
    .sign-line { border-bottom: 1px solid #000; margin: 40px auto 4px; width: 160px; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <h1>${schoolName || "โรงเรียน"}</h1>
  <p class="subtitle">
    รายชื่อสมาชิกชุมนุม <strong>${club.name}</strong>
    ${club.academic_year ? `ปีการศึกษา ${club.academic_year}${club.semester ? ` ภาคเรียนที่ ${club.semester}` : ""}` : ""}
  </p>
  <p>จำนวนสมาชิกทั้งหมด: <strong>${activeMembers.length} คน</strong>${club.max_members ? ` (รับสูงสุด ${club.max_members} คน)` : ""}</p>
  <table>
    <thead>
      <tr>
        <th style="width:48px">ลำดับ</th>
        <th style="width:120px">รหัสนักเรียน</th>
        <th>ชื่อ-สกุล</th>
        <th style="width:100px">ระดับชั้น/ห้อง</th>
        <th style="width:120px">หมายเหตุ</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="5" style="text-align:center;padding:12px;border:1px solid #000">ไม่มีสมาชิก</td></tr>'}
    </tbody>
  </table>
  <div class="footer">
    <div class="sign-block">
      <div class="sign-line"></div>
      <p>ครูที่ปรึกษาชุมนุม</p>
      <p>วันที่ ............/............/............</p>
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

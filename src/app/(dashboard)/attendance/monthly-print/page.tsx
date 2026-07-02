import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const THAI_MONTHS: Record<number, string> = {
  1: "มกราคม", 2: "กุมภาพันธ์", 3: "มีนาคม", 4: "เมษายน",
  5: "พฤษภาคม", 6: "มิถุนายน", 7: "กรกฎาคม", 8: "สิงหาคม",
  9: "กันยายน", 10: "ตุลาคม", 11: "พฤศจิกายน", 12: "ธันวาคม",
};

function thaiYear(date: Date) { return date.getFullYear() + 543; }

export default async function AttendanceMonthlyPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string; classroom?: string; month?: string; year?: string }>;
}) {
  const { grade, classroom, month, year } = await searchParams;
  if (!grade || !classroom || !month || !year) notFound();

  const monthNum = parseInt(month);
  const yearNum = parseInt(year); // gregorian

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) notFound();

  const { data: profile } = await supabase
    .from("users")
    .select("school_id, full_name")
    .eq("id", auth.user.id)
    .single();
  if (!profile?.school_id) notFound();

  const { data: school } = await supabase
    .from("schools")
    .select("name")
    .eq("id", profile.school_id)
    .single();

  const schoolName = school?.name ?? "";

  // Students in this classroom
  const { data: students } = await supabase
    .from("students")
    .select("id, student_code, full_name")
    .eq("school_id", profile.school_id)
    .eq("grade", grade)
    .eq("classroom", classroom)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("student_code");

  const studentList = students ?? [];
  const studentIds = studentList.map((s) => s.id);

  const daysCount = new Date(yearNum, monthNum, 0).getDate();
  const startDate = `${yearNum}-${String(monthNum).padStart(2, "0")}-01`;
  const endDate = `${yearNum}-${String(monthNum).padStart(2, "0")}-${String(daysCount).padStart(2, "0")}`;

  // Fetch attendance records
  const { data: records } = studentIds.length
    ? await supabase
        .from("attendance")
        .select("student_id, date, status")
        .in("student_id", studentIds)
        .gte("date", startDate)
        .lte("date", endDate)
    : { data: [] };

  // Map: studentId -> day -> status
  type AttStatus = "present" | "absent" | "leave" | "late";
  const byStudent = new Map<string, Map<number, AttStatus>>();
  for (const s of studentList) byStudent.set(s.id, new Map());

  for (const r of records ?? []) {
    const dayMap = byStudent.get(r.student_id);
    if (!dayMap) continue;
    const day = parseInt(r.date.split("-")[2]);
    let st: AttStatus = "present";
    const status = r.status as string;
    if (status === "absent") st = "absent";
    else if (status === "sick" || status === "personal_leave") st = "leave";
    else if (status === "late") st = "late";
    dayMap.set(day, st);
  }

  const days = Array.from({ length: daysCount }, (_, i) => i + 1);

  const symbolMap: Record<AttStatus, string> = {
    present: "/",
    absent: "ข",
    leave: "ล",
    late: "ส",
  };

  return (
    <div className="bg-white min-h-screen font-[sans-serif] text-xs print:text-[10px]">
      <style>{`@media print { @page { size: A4 landscape; margin: 10mm; } }`}</style>

      {/* Print button (hidden when printing) */}
      <div className="print:hidden flex justify-end gap-2 p-4 border-b">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
        >
          พิมพ์
        </button>
      </div>

      <div className="p-4 print:p-0">
        {/* Header */}
        <div className="text-center mb-3">
          <p className="font-bold text-sm">รายงานสรุปการมาเรียนประจำเดือน</p>
          <p className="text-sm">
            ชั้น {grade}/{classroom} | ประจำเดือน {THAI_MONTHS[monthNum]} {thaiYear(new Date(yearNum, monthNum - 1, 1))}
          </p>
          {schoolName && <p className="text-gray-600">{schoolName}</p>}
        </div>

        <div className="overflow-x-auto">
          <table className="border-collapse w-full" style={{ fontSize: "10px" }}>
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-1 py-1 text-center w-8">เลขที่</th>
                <th className="border border-gray-400 px-1 py-1 text-left min-w-[120px]">ชื่อ-นามสกุล</th>
                {days.map((d) => (
                  <th key={d} className="border border-gray-400 px-0 py-1 text-center w-5">{d}</th>
                ))}
                <th className="border border-gray-400 px-1 py-1 text-center w-10">มา</th>
                <th className="border border-gray-400 px-1 py-1 text-center w-10">ขาด</th>
                <th className="border border-gray-400 px-1 py-1 text-center w-10">ลา</th>
                <th className="border border-gray-400 px-1 py-1 text-center w-10">สาย</th>
              </tr>
            </thead>
            <tbody>
              {studentList.map((s, idx) => {
                const dayMap = byStudent.get(s.id) ?? new Map();
                let present = 0, absent = 0, leave = 0, late = 0;
                for (const [, st] of dayMap) {
                  if (st === "present") present++;
                  else if (st === "absent") absent++;
                  else if (st === "leave") leave++;
                  else if (st === "late") late++;
                }
                return (
                  <tr key={s.id} className={idx % 2 === 0 ? "" : "bg-gray-50"}>
                    <td className="border border-gray-400 px-1 py-1 text-center">{idx + 1}</td>
                    <td className="border border-gray-400 px-1 py-1">{s.full_name}</td>
                    {days.map((d) => {
                      const st = dayMap.get(d) as AttStatus | undefined;
                      return (
                        <td key={d} className="border border-gray-400 px-0 py-1 text-center">
                          {st ? symbolMap[st] : ""}
                        </td>
                      );
                    })}
                    <td className="border border-gray-400 px-1 py-1 text-center">{present || ""}</td>
                    <td className="border border-gray-400 px-1 py-1 text-center">{absent || ""}</td>
                    <td className="border border-gray-400 px-1 py-1 text-center">{leave || ""}</td>
                    <td className="border border-gray-400 px-1 py-1 text-center">{late || ""}</td>
                  </tr>
                );
              })}
              {/* Pad empty rows if fewer than 20 students */}
              {studentList.length < 20 &&
                Array.from({ length: 20 - studentList.length }).map((_, i) => (
                  <tr key={`empty-${i}`}>
                    <td className="border border-gray-400 px-1 py-1 text-center">{studentList.length + i + 1}</td>
                    <td className="border border-gray-400 px-1 py-1" colSpan={daysCount + 4}>&nbsp;</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="mt-2 text-xs text-gray-600">
          สัญลักษณ์: / = มาเรียนปกติ, ข = ขาด, ล = ลา, ส = สาย
        </div>

        {/* Signatures */}
        <div className="mt-6 grid grid-cols-2 gap-16 text-sm">
          <div className="text-center">
            <div className="mb-6 border-b border-dashed" />
            <p>ลงชื่อ..........................................................ผู้รายงาน</p>
            <p className="text-gray-500">(ครูประจำชั้น / ผู้รับผิดชอบ)</p>
          </div>
          <div className="text-center">
            <div className="mb-6 border-b border-dashed" />
            <p>ลงชื่อ.......................................................ผู้อำนวยการ</p>
            <p className="text-gray-500">( )</p>
          </div>
        </div>
      </div>
    </div>
  );
}

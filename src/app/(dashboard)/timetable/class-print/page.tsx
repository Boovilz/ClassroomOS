import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TimetablePrintClient } from "../timetable-print-client";

const DAYS = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์"];
const DEFAULT_PERIODS = [
  { period: 1, start: "08.30", end: "09.30" },
  { period: 2, start: "09.30", end: "10.30" },
  { period: 3, start: "10.30", end: "11.30" },
  { period: 4, start: "11.30", end: "12.30" },
  { period: 5, start: "12.30", end: "13.30" },
  { period: 6, start: "13.30", end: "14.30" },
  { period: 7, start: "14.30", end: "15.30" },
  { period: 8, start: "15.30", end: "16.30" },
];

export default async function ClassTimetablePrintPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string; classroom?: string; semester?: string; year?: string }>;
}) {
  const { grade, classroom, semester, year } = await searchParams;
  if (!grade || !classroom) notFound();

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) notFound();

  const { data: profile } = await supabase
    .from("users")
    .select("school_id")
    .eq("id", auth.user.id)
    .single();
  if (!profile?.school_id) notFound();

  const { data: school } = await supabase
    .from("schools")
    .select("name")
    .eq("id", profile.school_id)
    .single();

  // Homeroom teacher
  const { data: homeroomTeacher } = await supabase
    .from("teachers")
    .select("user_id")
    .eq("school_id", profile.school_id)
    .eq("homeroom_classroom", `${grade}/${classroom}`)
    .maybeSingle();

  let homeroomName = "-";
  if (homeroomTeacher?.user_id) {
    const { data: u } = await supabase.from("users").select("full_name").eq("id", homeroomTeacher.user_id).single();
    homeroomName = u?.full_name ?? "-";
  }

  const sem = parseInt(semester ?? "1");
  const beYear = parseInt(year ?? String(new Date().getFullYear() + 543));
  const classStr = `${grade}/${classroom}`;

  const { data: entries } = await (supabase as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (k: string, v: unknown) => {
          eq: (k: string, v: unknown) => {
            eq: (k: string, v: unknown) => Promise<{ data: Array<{
              day_of_week: number;
              period: number;
              subject_code: string | null;
              subject_name: string;
              teacher_name: string | null;
              start_time: string | null;
              end_time: string | null;
            }> | null }>;
          };
        };
      };
    };
  })
    .from("timetable_entries")
    .select("day_of_week, period, subject_code, subject_name, teacher_name, start_time, end_time")
    .eq("school_id", profile.school_id)
    .eq("classroom", classStr)
    .eq("semester", sem);

  type Entry = { subjectCode: string | null; subjectName: string; teacherName: string | null };
  const grid = new Map<number, Map<number, Entry>>();
  for (let d = 1; d <= 5; d++) grid.set(d, new Map());
  for (const e of entries ?? []) {
    grid.get(e.day_of_week)?.set(e.period, {
      subjectCode: e.subject_code,
      subjectName: e.subject_name,
      teacherName: e.teacher_name,
    });
  }

  const totalHours = (entries ?? []).length;

  return (
    <div className="bg-white min-h-screen font-[sans-serif]">
      <style>{`@media print { @page { size: A4 landscape; margin: 10mm; } }`}</style>
      <div className="print:hidden flex justify-end gap-2 p-4 border-b">
        <TimetablePrintClient />
      </div>
      <div className="p-6 print:p-4">
        <div className="text-center mb-4">
          <p className="font-bold text-base">{school?.name ?? ""}</p>
          <p className="font-bold">ตารางเรียน ชั้น {grade}/{classroom}</p>
          <p className="text-sm">ครูประจำชั้น: {homeroomName}</p>
          <p className="text-sm">ภาคเรียนที่ {sem}/{beYear}</p>
        </div>

        <table className="border-collapse w-full text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-2 py-1 text-center">วัน/เวลา</th>
              {DEFAULT_PERIODS.map((p) => (
                <th key={p.period} className="border border-gray-400 px-1 py-1 text-center">
                  <div className="font-bold">{p.period}</div>
                  <div className="font-normal text-[10px]">{p.start}-{p.end}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day, di) => {
              const dayGrid = grid.get(di + 1) ?? new Map();
              return (
                <tr key={day}>
                  <td className="border border-gray-400 px-2 py-2 font-medium text-center bg-gray-50">{day}</td>
                  {DEFAULT_PERIODS.map((p) => {
                    const entry = dayGrid.get(p.period);
                    return (
                      <td key={p.period} className="border border-gray-400 px-1 py-1 text-center align-middle min-w-[80px]">
                        {entry ? (
                          <div>
                            {entry.subjectCode && <div className="font-mono text-[9px] text-gray-500">{entry.subjectCode}</div>}
                            <div className="font-medium leading-tight">{entry.subjectName}</div>
                            {entry.teacherName && <div className="text-[9px] text-gray-600">{entry.teacherName}</div>}
                          </div>
                        ) : ""}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        <p className="mt-3 text-sm">รวมเวลาเรียนทั้งหมด {totalHours} ชั่วโมง/สัปดาห์</p>

        <div className="mt-8 grid grid-cols-2 gap-16 text-sm">
          <div className="text-center">
            <div className="mb-6 border-b border-dashed" />
            <p>ลงชื่อ....................................................</p>
            <p className="text-gray-500">(..................................)</p>
            <p className="text-gray-500">หัวหน้ากลุ่มบริหารงานวิชาการ</p>
          </div>
          <div className="text-center">
            <div className="mb-6 border-b border-dashed" />
            <p>ลงชื่อ....................................................</p>
            <p className="text-gray-500">(..................................)</p>
            <p className="text-gray-500">ผู้อำนวยการโรงเรียน</p>
          </div>
        </div>
      </div>
    </div>
  );
}

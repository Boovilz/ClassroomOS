import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";

function classifyGrade(grade: string): "ปฐมวัย" | "ประถมศึกษา" | "มัธยมต้น" | "มัธยมปลาย" | "อื่นๆ" {
  if (/อ\.|K|อนุบาล|บ\./.test(grade)) return "ปฐมวัย";
  if (/ป\./.test(grade)) return "ประถมศึกษา";
  if (/ม\.1|ม\.2|ม\.3/.test(grade)) return "มัธยมต้น";
  if (/ม\.4|ม\.5|ม\.6/.test(grade)) return "มัธยมปลาย";
  return "อื่นๆ";
}

const LEVEL_ORDER = ["ปฐมวัย", "ประถมศึกษา", "มัธยมต้น", "มัธยมปลาย", "อื่นๆ"] as const;

const LEVEL_LABEL: Record<string, string> = {
  ปฐมวัย: "ระดับปฐมวัย",
  ประถมศึกษา: "ระดับชั้นประถมศึกษา",
  มัธยมต้น: "ระดับชั้นมัธยมศึกษาตอนต้น",
  มัธยมปลาย: "ระดับชั้นมัธยมศึกษาตอนปลาย",
  อื่นๆ: "ระดับอื่นๆ",
};

function gradeFullName(grade: string): string {
  const match = grade.match(/^([ปมอ])\.([1-9])$/);
  if (!match) return grade;
  const [, prefix, num] = match;
  const names: Record<string, string> = {
    ป: "ชั้นประถมศึกษาปีที่",
    ม: "ชั้นมัธยมศึกษาปีที่",
    อ: "ชั้นอนุบาลปีที่",
  };
  return `${names[prefix] ?? grade} ${num}`;
}

function gradeSort(grade: string): number {
  const match = grade.match(/^[ปมอ]\.([1-9])$/);
  return match ? parseInt(match[1]) : 99;
}

interface StudentRow {
  grade: string;
  classroom: string;
  gender: string;
}

interface ClassroomStat {
  grade: string;
  classroom: string;
  male: number;
  female: number;
}

export default async function StudentStatsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  let schoolId: string | null = null;
  if (auth.user) {
    const { data: profile } = await supabase
      .from("users")
      .select("school_id")
      .eq("id", auth.user.id)
      .single();
    schoolId = profile?.school_id ?? null;
  }

  const { data: school } = schoolId
    ? await supabase.from("schools").select("name").eq("id", schoolId).single()
    : { data: null };

  const schoolName = school?.name ?? "";
  const academicYear = new Date().getFullYear() + 543;

  let students: StudentRow[] = [];
  if (schoolId) {
    const { data } = await supabase
      .from("students")
      .select("grade, classroom, gender")
      .eq("school_id", schoolId)
      .is("deleted_at", null)
      .eq("is_archived", false);
    students = (data as StudentRow[]) ?? [];
  }

  // Aggregate per grade+classroom
  const classroomMap = new Map<string, ClassroomStat>();
  for (const s of students) {
    const key = `${s.grade ?? ""}__${s.classroom ?? ""}`;
    if (!classroomMap.has(key)) {
      classroomMap.set(key, { grade: s.grade ?? "", classroom: s.classroom ?? "", male: 0, female: 0 });
    }
    const stat = classroomMap.get(key)!;
    const g = (s.gender ?? "").toLowerCase();
    if (g === "male" || g === "ชาย" || g === "m") stat.male++;
    else if (g === "female" || g === "หญิง" || g === "f") stat.female++;
  }

  // Group by level
  const levelGroups = new Map<string, ClassroomStat[]>();
  for (const level of LEVEL_ORDER) {
    levelGroups.set(level, []);
  }
  for (const stat of classroomMap.values()) {
    const level = classifyGrade(stat.grade);
    levelGroups.get(level)!.push(stat);
  }

  // Sort within each level: by grade number, then classroom
  for (const stats of levelGroups.values()) {
    stats.sort((a, b) => {
      const gDiff = gradeSort(a.grade) - gradeSort(b.grade);
      if (gDiff !== 0) return gDiff;
      return a.classroom.localeCompare(b.classroom, "th");
    });
  }

  // Build rows with running sequence number
  let seq = 0;
  const grandMale = Array.from(classroomMap.values()).reduce((s, r) => s + r.male, 0);
  const grandFemale = Array.from(classroomMap.values()).reduce((s, r) => s + r.female, 0);
  const grandTotal = grandMale + grandFemale;

  const printDate = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="container mx-auto px-4 py-6 print:px-2 print:py-2">
      {/* Screen nav */}
      <div className="flex items-center justify-between mb-6 no-print">
        <div className="flex items-center gap-3">
          <Link href="/students">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              กลับ
            </Button>
          </Link>
          <h1 className="text-xl font-bold">รายงานสถิติจำนวนนักเรียน</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" />
          พิมพ์
        </Button>
      </div>

      {/* Report */}
      <div className="max-w-4xl mx-auto print:max-w-full">
        {/* Report title */}
        <div className="text-center mb-4">
          <h1 className="text-lg font-bold">รายงานสถิติจำนวนนักเรียน (สถานะปกติ)</h1>
          <p className="text-sm mt-1">
            โรงเรียน{schoolName}&nbsp;&nbsp;&nbsp;ปีการศึกษา {academicYear}
          </p>
        </div>

        {/* Table */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-2 py-1 text-center w-12">ลำดับ</th>
              <th className="border border-gray-400 px-2 py-1 text-left">ระดับชั้น</th>
              <th className="border border-gray-400 px-2 py-1 text-center w-12">ห้อง</th>
              <th className="border border-gray-400 px-2 py-1 text-center w-20">ชาย (คน)</th>
              <th className="border border-gray-400 px-2 py-1 text-center w-20">หญิง (คน)</th>
              <th className="border border-gray-400 px-2 py-1 text-center w-20">รวม (คน)</th>
            </tr>
          </thead>
          <tbody>
            {LEVEL_ORDER.map((level) => {
              const rows = levelGroups.get(level)!;
              if (rows.length === 0) return null;
              const levelMale = rows.reduce((s, r) => s + r.male, 0);
              const levelFemale = rows.reduce((s, r) => s + r.female, 0);
              const levelTotal = levelMale + levelFemale;
              return (
                <>
                  {rows.map((row) => {
                    seq++;
                    return (
                      <tr key={`${row.grade}-${row.classroom}`}>
                        <td className="border border-gray-300 px-2 py-0.5 text-center">{seq}</td>
                        <td className="border border-gray-300 px-2 py-0.5">{gradeFullName(row.grade)}</td>
                        <td className="border border-gray-300 px-2 py-0.5 text-center">{row.classroom}</td>
                        <td className="border border-gray-300 px-2 py-0.5 text-center">{row.male}</td>
                        <td className="border border-gray-300 px-2 py-0.5 text-center">{row.female}</td>
                        <td className="border border-gray-300 px-2 py-0.5 text-center">{row.male + row.female}</td>
                      </tr>
                    );
                  })}
                  {/* Level subtotal row */}
                  <tr className="font-bold bg-gray-50">
                    <td className="border border-gray-300 px-2 py-0.5 text-center"></td>
                    <td className="border border-gray-300 px-2 py-0.5">รวม{LEVEL_LABEL[level]}</td>
                    <td className="border border-gray-300 px-2 py-0.5 text-center"></td>
                    <td className="border border-gray-300 px-2 py-0.5 text-center">{levelMale}</td>
                    <td className="border border-gray-300 px-2 py-0.5 text-center">{levelFemale}</td>
                    <td className="border border-gray-300 px-2 py-0.5 text-center">{levelTotal}</td>
                  </tr>
                </>
              );
            })}
            {/* Grand total */}
            <tr className="font-bold bg-gray-100">
              <td className="border border-gray-400 px-2 py-1 text-center"></td>
              <td className="border border-gray-400 px-2 py-1">รวมทั้งโรงเรียน</td>
              <td className="border border-gray-400 px-2 py-1 text-center"></td>
              <td className="border border-gray-400 px-2 py-1 text-center">{grandMale}</td>
              <td className="border border-gray-400 px-2 py-1 text-center">{grandFemale}</td>
              <td className="border border-gray-400 px-2 py-1 text-center">{grandTotal}</td>
            </tr>
          </tbody>
        </table>

        {/* Print date */}
        <p className="text-xs text-right mt-4 text-gray-500">
          พิมพ์เมื่อวันที่ {printDate}
        </p>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          nav, aside, header, [data-sidebar] { display: none !important; }
          body { background: white !important; }
          .container { max-width: 100% !important; padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}

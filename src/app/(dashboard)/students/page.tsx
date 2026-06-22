import { createClient } from "@/lib/supabase/server";
import { getStudentsList } from "@/lib/queries/students";
import { StudentsTable } from "@/components/students/students-table";
import { StudentFormDialog } from "@/components/students/student-form-dialog";
import { StudentsFilterBar } from "@/components/students/students-filter-bar";

interface StudentsPageProps {
  searchParams: Promise<{
    grade?: string;
    classroom?: string;
    gender?: string;
    status?: string;
    risk?: string;
    sort?: string;
    direction?: string;
  }>;
}

export default async function StudentsPage({ searchParams }: StudentsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const [students, { data: appUser }] = await Promise.all([
    getStudentsList({
      grade: params.grade,
      classroom: params.classroom,
      gender: params.gender,
      status: params.status === "archived" ? "archived" : params.status === "active" ? "active" : undefined,
      riskLevel: params.risk,
      sort: (params.sort as "name" | "student_code" | "gpa" | "attendance") ?? "student_code",
      direction: params.direction === "desc" ? "desc" : "asc",
    }),
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return { data: null };
      return supabase.from("users").select("school_id").eq("id", data.user.id).maybeSingle();
    }),
  ]);

  const total = students.length;
  const activeCount = students.filter((s) => !s.is_archived).length;
  const highRiskCount = students.filter((s) => s.risk_level === "high").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">นักเรียน</h1>
          <p className="text-sm text-muted-foreground">
            ทั้งหมด {total} คน · กำลังศึกษา {activeCount} คน
            {highRiskCount > 0 ? ` · ความเสี่ยงสูง ${highRiskCount} คน` : ""}
          </p>
        </div>
        {appUser?.school_id && <StudentFormDialog schoolId={appUser.school_id} />}
      </div>

      <StudentsFilterBar />

      <StudentsTable data={students} schoolId={appUser?.school_id ?? undefined} />
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { StudentsTable } from "@/components/students/students-table";
import { StudentFormDialog } from "@/components/students/student-form-dialog";

export default async function StudentsPage() {
  const supabase = await createClient();

  const [{ data: students }, { data: appUser }] = await Promise.all([
    supabase
      .from("students")
      .select("id, student_code, full_name, nickname, gender, is_active")
      .order("student_code"),
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return { data: null };
      return supabase.from("users").select("school_id").eq("id", data.user.id).maybeSingle();
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">นักเรียน</h1>
        {appUser?.school_id && <StudentFormDialog schoolId={appUser.school_id} />}
      </div>
      <StudentsTable data={students ?? []} />
    </div>
  );
}

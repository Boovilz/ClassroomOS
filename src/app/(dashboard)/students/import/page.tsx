import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getImportJobs } from "@/lib/queries/import-jobs";
import { Button } from "@/components/ui/button";
import { ImportJobsTable } from "@/app/(dashboard)/students/import/import-jobs-table";
import { ExportTemplates } from "@/app/(dashboard)/students/import/export-templates";
import { Wand2 } from "lucide-react";

export default async function ImportDashboardPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: appUser } = auth?.user
    ? await supabase.from("users").select("school_id").eq("id", auth.user.id).maybeSingle()
    : { data: null };

  const jobs = appUser?.school_id ? await getImportJobs(appUser.school_id) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">นำเข้านักเรียน</h1>
          <p className="text-sm text-muted-foreground">ประวัติการนำเข้า ยกเลิกการนำเข้า และดาวน์โหลดเทมเพลต</p>
        </div>
        <Button asChild>
          <Link href="/students/import/wizard">
            <Wand2 className="mr-2 h-4 w-4" />
            เริ่มนำเข้านักเรียน
          </Link>
        </Button>
      </div>

      <ExportTemplates />

      <div>
        <h2 className="mb-3 text-lg font-semibold">ประวัติการนำเข้า</h2>
        <ImportJobsTable jobs={jobs} />
      </div>
    </div>
  );
}

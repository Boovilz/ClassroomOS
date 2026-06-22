import { createClient } from "@/lib/supabase/server";

export interface ImportJobRow {
  id: string;
  school_id: string;
  source: string;
  file_name: string | null;
  imported_by: string | null;
  importer_name: string | null;
  total_rows: number;
  succeeded_count: number;
  updated_count: number;
  failed_count: number;
  status: string;
  created_at: string;
}

export async function getImportJobs(schoolId: string): Promise<ImportJobRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("import_jobs")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const importerIds = Array.from(new Set(data.map((j) => j.imported_by).filter((id): id is string => !!id)));
  const namesById = new Map<string, string>();
  if (importerIds.length > 0) {
    const { data: users } = await supabase.from("users").select("id, full_name").in("id", importerIds);
    for (const u of users ?? []) {
      if (u.full_name) namesById.set(u.id, u.full_name);
    }
  }

  return data.map((row) => ({
    id: row.id,
    school_id: row.school_id,
    source: row.source,
    file_name: row.file_name,
    imported_by: row.imported_by,
    importer_name: row.imported_by ? namesById.get(row.imported_by) ?? null : null,
    total_rows: row.total_rows,
    succeeded_count: row.succeeded_count,
    updated_count: row.updated_count,
    failed_count: row.failed_count,
    status: row.status,
    created_at: row.created_at,
  }));
}

export async function getImportJobRows(importJobId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("import_job_rows")
    .select("*")
    .eq("import_job_id", importJobId)
    .order("row_number", { ascending: true });
  if (error || !data) return [];
  return data;
}

export async function getImportJob(importJobId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("import_jobs").select("*").eq("id", importJobId).maybeSingle();
  return data;
}

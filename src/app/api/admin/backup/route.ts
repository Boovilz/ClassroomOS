import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdminOrSuper } from "@/lib/admin/guard";
import { exportSchoolSnapshot } from "@/lib/admin/backup";
import { isCloudBackupConfigured, BACKUP_CLOUD_NOT_CONFIGURED_MESSAGE_TH } from "@/lib/admin/integrations";
import { logAudit } from "@/lib/audit";

/** Backup history list. */
export async function GET(request: NextRequest) {
  const guard = await requireSchoolAdminOrSuper();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { supabase, role, schoolId } = guard.ctx;

  const targetSchoolId = role === "super_admin" ? request.nextUrl.searchParams.get("schoolId") ?? schoolId : schoolId;

  let query = supabase.from("backup_jobs").select("*").order("created_at", { ascending: false }).limit(50);
  if (targetSchoolId) query = query.eq("school_id", targetSchoolId);
  const { data: jobs, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ jobs, cloudBackupConfigured: isCloudBackupConfigured() });
}

/**
 * Trigger a manual backup. target='local' returns the JSON snapshot
 * inline (the browser downloads it - this route IS the "manual export").
 * target='cloud' requires BACKUP_CLOUD_* env vars; if unset we record a
 * 'failed' job with an honest Thai message rather than pretending to
 * upload anywhere.
 */
export async function POST(request: NextRequest) {
  const guard = await requireSchoolAdminOrSuper();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { supabase, role, schoolId, userId } = guard.ctx;

  const body = await request.json().catch(() => ({}));
  const targetSchoolId = role === "super_admin" ? body.schoolId ?? schoolId : schoolId;
  const target: "local" | "cloud" = body.target === "cloud" ? "cloud" : "local";

  if (!targetSchoolId) return NextResponse.json({ error: "No school in context" }, { status: 400 });

  const { data: job, error: jobError } = await supabase
    .from("backup_jobs")
    .insert({ school_id: targetSchoolId, job_type: "manual", direction: "backup", target, status: "running", created_by: userId })
    .select()
    .single();
  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 });

  if (target === "cloud" && !isCloudBackupConfigured()) {
    await supabase
      .from("backup_jobs")
      .update({ status: "failed", error_message: BACKUP_CLOUD_NOT_CONFIGURED_MESSAGE_TH, completed_at: new Date().toISOString() })
      .eq("id", job.id);
    return NextResponse.json({ error: BACKUP_CLOUD_NOT_CONFIGURED_MESSAGE_TH, jobId: job.id }, { status: 503 });
  }

  try {
    const { snapshot, rowCounts } = await exportSchoolSnapshot(supabase, targetSchoolId);

    if (target === "cloud") {
      // Cloud upload would happen here once a real provider client is wired
      // up; env vars are present (checked above) but no specific cloud SDK
      // is integrated in this sandbox, so we honestly mark this job as
      // failed rather than fabricate a success/URL.
      await supabase
        .from("backup_jobs")
        .update({
          status: "failed",
          error_message: "BACKUP_CLOUD_* env vars are set, but no cloud storage SDK is wired up in this build — use target=local to download a JSON snapshot instead.",
          row_counts: rowCounts,
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      return NextResponse.json({ error: "Cloud upload not implemented - use target=local", jobId: job.id }, { status: 501 });
    }

    await supabase
      .from("backup_jobs")
      .update({ status: "completed", row_counts: rowCounts, completed_at: new Date().toISOString() })
      .eq("id", job.id);

    void logAudit({ schoolId: targetSchoolId, actorId: userId, action: "export", entityTable: "backup_jobs", entityId: job.id, metadata: { rowCounts } });

    return NextResponse.json({ jobId: job.id, snapshot, rowCounts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Backup export failed";
    await supabase.from("backup_jobs").update({ status: "failed", error_message: message, completed_at: new Date().toISOString() }).eq("id", job.id);
    return NextResponse.json({ error: message, jobId: job.id }, { status: 500 });
  }
}

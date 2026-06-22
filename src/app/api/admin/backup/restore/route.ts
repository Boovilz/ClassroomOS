import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdminOrSuper } from "@/lib/admin/guard";
import { restoreSchoolSnapshot, type BackupSnapshot } from "@/lib/admin/backup";
import { logAudit } from "@/lib/audit";

/** Restore from a previously exported JSON snapshot (upsert-merge, not destructive replace). */
export async function POST(request: NextRequest) {
  const guard = await requireSchoolAdminOrSuper();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { supabase, role, schoolId, userId } = guard.ctx;

  const body = await request.json().catch(() => null);
  const snapshot: BackupSnapshot | undefined = body?.snapshot;
  if (!snapshot?.tables || !snapshot.schoolId) {
    return NextResponse.json({ error: "ต้องระบุ snapshot ที่ถูกต้อง (จากไฟล์สำรองข้อมูล)" }, { status: 400 });
  }
  if (role !== "super_admin" && snapshot.schoolId !== schoolId) {
    return NextResponse.json({ error: "ไม่สามารถกู้คืนข้อมูลของโรงเรียนอื่นได้" }, { status: 403 });
  }

  const { data: job, error: jobError } = await supabase
    .from("backup_jobs")
    .insert({ school_id: snapshot.schoolId, job_type: "manual", direction: "restore", target: "local", status: "running", created_by: userId })
    .select()
    .single();
  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 });

  try {
    const { rowCounts } = await restoreSchoolSnapshot(supabase, snapshot);
    await supabase.from("backup_jobs").update({ status: "completed", row_counts: rowCounts, completed_at: new Date().toISOString() }).eq("id", job.id);

    void logAudit({ schoolId: snapshot.schoolId, actorId: userId, action: "restore", entityTable: "backup_jobs", entityId: job.id, metadata: { rowCounts } });

    return NextResponse.json({ jobId: job.id, rowCounts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Restore failed";
    await supabase.from("backup_jobs").update({ status: "failed", error_message: message, completed_at: new Date().toISOString() }).eq("id", job.id);
    return NextResponse.json({ error: message, jobId: job.id }, { status: 500 });
  }
}

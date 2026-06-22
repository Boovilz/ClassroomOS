/**
 * Manual backup/restore as a JSON snapshot of a school's data.
 *
 * HONEST DISCLOSURE: there is no real automated/cron-based cloud backup in
 * this sandbox - Vercel serverless functions have no persistent disk and no
 * cron runner is wired up. What IS real: a manual, on-demand export of the
 * school's core tables into a single JSON document (returned to the
 * browser as a downloadable file), and a restore path that re-inserts rows
 * from a previously exported snapshot. `backup_jobs` rows track each
 * export/restore attempt for the Backup Manager history view.
 *
 * Tables included are intentionally the core SSOT ones - this is not a
 * full pg_dump (no triggers/sequences/RLS policies), it's an
 * application-level data snapshot suitable for disaster-recovery-by-hand.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const BACKUP_TABLES = [
  "schools",
  "users",
  "teachers",
  "students",
  "parents",
] as const;

export interface BackupSnapshot {
  exportedAt: string;
  schoolId: string;
  tables: Record<string, unknown[]>;
}

export async function exportSchoolSnapshot(
  supabase: SupabaseClient,
  schoolId: string
): Promise<{ snapshot: BackupSnapshot; rowCounts: Record<string, number> }> {
  const tables: Record<string, unknown[]> = {};
  const rowCounts: Record<string, number> = {};

  for (const table of BACKUP_TABLES) {
    const query = supabase.from(table).select("*");
    const { data, error } =
      table === "schools" ? await query.eq("id", schoolId) : await query.eq("school_id", schoolId);
    if (error) throw new Error(`Export failed on table ${table}: ${error.message}`);
    tables[table] = data ?? [];
    rowCounts[table] = data?.length ?? 0;
  }

  return {
    snapshot: { exportedAt: new Date().toISOString(), schoolId, tables },
    rowCounts,
  };
}

/**
 * Restores rows from a snapshot via upsert (matches on `id`). Does NOT
 * delete rows absent from the snapshot - this is a merge/restore, not a
 * destructive replace, to avoid accidentally wiping data with a stale
 * backup file.
 */
export async function restoreSchoolSnapshot(
  supabase: SupabaseClient,
  snapshot: BackupSnapshot
): Promise<{ rowCounts: Record<string, number> }> {
  const rowCounts: Record<string, number> = {};
  for (const table of BACKUP_TABLES) {
    const rows = snapshot.tables[table];
    if (!Array.isArray(rows) || rows.length === 0) {
      rowCounts[table] = 0;
      continue;
    }
    const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
    if (error) throw new Error(`Restore failed on table ${table}: ${error.message}`);
    rowCounts[table] = rows.length;
  }
  return { rowCounts };
}

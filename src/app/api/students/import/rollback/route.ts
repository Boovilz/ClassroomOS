import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rollbackImportJob } from "@/lib/import/rollback";

/** POST { importJobId: string } — rolls back a completed import job. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.importJobId) {
    return NextResponse.json({ error: "Missing importJobId" }, { status: 400 });
  }

  const result = await rollbackImportJob(supabase, body.importJobId, auth.user.id);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

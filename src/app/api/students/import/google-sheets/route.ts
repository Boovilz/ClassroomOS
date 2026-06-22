import { NextRequest, NextResponse } from "next/server";
import { readGoogleSheetRows, isGoogleSheetsConfigured, GOOGLE_SHEETS_NOT_CONFIGURED_MESSAGE_TH } from "@/lib/import/google-sheets";
import { mapRawRowsToImportRows } from "@/lib/import/parser";

/**
 * Reads rows from a Google Sheet (real connector — gated behind
 * GOOGLE_SHEETS_CLIENT_EMAIL/GOOGLE_SHEETS_PRIVATE_KEY) and maps them
 * through the same row-mapping pipeline as Excel/CSV. Returns a typed
 * "not configured" result instead of throwing when credentials are absent.
 *
 * Body: { sheetUrl: string, sheetName?: string, defaults?: { grade?: string; classroom?: string } }
 */
export async function POST(request: NextRequest) {
  if (!isGoogleSheetsConfigured()) {
    return NextResponse.json({ ok: false, notConfigured: true, message: GOOGLE_SHEETS_NOT_CONFIGURED_MESSAGE_TH }, { status: 200 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.sheetUrl) {
    return NextResponse.json({ ok: false, notConfigured: false, message: "Missing sheetUrl" }, { status: 400 });
  }

  const result = await readGoogleSheetRows(body.sheetUrl, body.sheetName ?? "");
  if (!result.ok) {
    return NextResponse.json(result, { status: 200 });
  }

  const rows = mapRawRowsToImportRows(result.rows, body.defaults);
  return NextResponse.json({ ok: true, rows }, { status: 200 });
}

/**
 * Real Google Sheets connector (server-side only), gated behind
 * GOOGLE_SHEETS_CLIENT_EMAIL + GOOGLE_SHEETS_PRIVATE_KEY env vars — same
 * graceful-degradation pattern as Module 12's Claude integration
 * (src/lib/ai/client.ts): never throws, never crashes the build when the
 * credentials are absent, just returns a typed "not configured" result.
 *
 * Setup: create a Google Cloud service account, enable the Sheets API,
 * download its JSON key, and set GOOGLE_SHEETS_CLIENT_EMAIL/
 * GOOGLE_SHEETS_PRIVATE_KEY from it. The teacher must then share their
 * target Google Sheet with that service account's email (view access is
 * enough) before pasting the sheet URL into the import wizard.
 */

export const GOOGLE_SHEETS_NOT_CONFIGURED_MESSAGE_TH =
  "ยังไม่ได้ตั้งค่า Google Sheets — โปรดเพิ่ม GOOGLE_SHEETS_CLIENT_EMAIL และ GOOGLE_SHEETS_PRIVATE_KEY ในไฟล์ .env แล้วลองใหม่อีกครั้ง";

export function isGoogleSheetsConfigured(): boolean {
  return !!process.env.GOOGLE_SHEETS_CLIENT_EMAIL && !!process.env.GOOGLE_SHEETS_PRIVATE_KEY;
}

export type GoogleSheetsReadResult =
  | { ok: true; rows: Record<string, string>[] }
  | { ok: false; notConfigured: true; message: string }
  | { ok: false; notConfigured: false; message: string };

/** Extracts the spreadsheetId from a typical Google Sheets share URL. */
export function extractSpreadsheetId(urlOrId: string): string | null {
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  // Already looks like a bare ID.
  if (/^[a-zA-Z0-9-_]{20,}$/.test(urlOrId.trim())) return urlOrId.trim();
  return null;
}

/**
 * Reads all rows (with the first row as headers) from a sheet/tab via the
 * Sheets API v4 `spreadsheets.values.get`. The googleapis package is
 * dynamically imported so its module-load cost (and any transitive
 * import-time side effects) is only paid when this function actually runs
 * with credentials present — keeps `next build`/`tsc --noEmit` clean with
 * zero Google credentials in the environment.
 */
export async function readGoogleSheetRows(spreadsheetUrlOrId: string, sheetName: string): Promise<GoogleSheetsReadResult> {
  if (!isGoogleSheetsConfigured()) {
    return { ok: false, notConfigured: true, message: GOOGLE_SHEETS_NOT_CONFIGURED_MESSAGE_TH };
  }

  const spreadsheetId = extractSpreadsheetId(spreadsheetUrlOrId);
  if (!spreadsheetId) {
    return { ok: false, notConfigured: false, message: "ไม่สามารถอ่าน Spreadsheet ID จาก URL ที่ระบุได้" };
  }

  try {
    const { google } = await import("googleapis");
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      key: (process.env.GOOGLE_SHEETS_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    const sheets = google.sheets({ version: "v4", auth });
    const range = sheetName ? `${sheetName}` : undefined;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: range || "A1:ZZ10000",
    });

    const values = response.data.values ?? [];
    if (values.length === 0) return { ok: true, rows: [] };

    const headers = values[0].map((h) => String(h ?? "").trim());
    const rows = values.slice(1).map((line) => {
      const record: Record<string, string> = {};
      headers.forEach((h, i) => {
        record[h] = String(line[i] ?? "").trim();
      });
      return record;
    });

    return { ok: true, rows };
  } catch (err) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเชื่อมต่อ Google Sheets";
    return { ok: false, notConfigured: false, message };
  }
}

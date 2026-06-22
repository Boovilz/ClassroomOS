/**
 * OBEC DMC "Demo Mode" preset.
 *
 * DMC (Data Management Center, สพฐ./OBEC) is a closed Thai Ministry of
 * Education system with no public API. There is no real live connector to
 * build here. In practice a teacher's only path to get DMC data into any
 * external tool is DMC's own Excel/CSV export feature, so "DMC Import" in
 * this app is honestly just a column-mapping preset applied on top of the
 * same Excel/CSV importer (see parser.ts COLUMN_ALIASES для the DMC header
 * names) — selecting this preset only changes which header aliases are
 * expected and shows the disclosure banner below. No network call is made.
 */
export const DMC_DISCLOSURE_TH =
  "โหมดทดลอง (Demo Mode): นี่ไม่ใช่การเชื่อมต่อกับระบบ DMC จริง เนื่องจาก DMC เป็นระบบปิดของกระทรวงศึกษาธิการที่ไม่มี API สาธารณะ " +
  "ฟีเจอร์นี้เป็นเพียงการแมปคอลัมน์จากไฟล์ที่ส่งออกจาก DMC ด้วยมือ (Excel/CSV) เข้าสู่ระบบเท่านั้น";

export const DMC_EXPECTED_COLUMNS = [
  "เลขประจำตัว นร.",
  "ชื่อ-สกุล",
  "เพศ",
  "วดป เกิด",
  "เลขบัตรประชาชน",
  "ชั้น",
  "ห้อง",
] as const;

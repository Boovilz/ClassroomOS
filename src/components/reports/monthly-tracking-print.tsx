"use client";

export interface MonthlyRecord {
  studentId: string;
  studentCode: string;
  studentName: string;
  days: Record<number, "yes" | "no" | "absent" | null>; // day 1-31 -> status
  totalOpen: number; // days school was open this month
  totalYes: number; // count yes
  totalNo: number; // count no
  totalAbsent: number; // count absent
}

export interface MonthSummary {
  year: number; // gregorian
  month: number; // 1-12
  thaiMonth: string; // 'พฤษภาคม', 'มิถุนายน', etc.
  semester: 1 | 2;
  daysInMonth: number;
  records: MonthlyRecord[];
}

export interface MonthlyTrackingPrintProps {
  reportType: "lunch" | "milk" | "tooth_brush";
  grade: string;
  classroom: string;
  academicYear: string; // BE year e.g. "2569"
  teacherName: string;
  principalName: string;
  schoolName: string;
  months: MonthSummary[];
}

interface TypeConfig {
  title: string;
  shortTitle: string;
  action: string;
  negAction: string;
  symYes: string;
  symNo: string;
}

const TYPE_CONFIG: Record<string, TypeConfig> = {
  lunch: {
    title: "รายงานการรับประทานอาหารกลางวัน",
    shortTitle: "การรับประทานอาหารกลางวัน",
    action: "ทาน",
    negAction: "ไม่ทาน",
    symYes: "ทาน",
    symNo: "ไม่ทาน",
  },
  milk: {
    title: "รายงานการดื่มนม",
    shortTitle: "การดื่มนม",
    action: "ดื่ม",
    negAction: "ไม่ดื่ม",
    symYes: "ดื่ม",
    symNo: "ไม่ดื่ม",
  },
  tooth_brush: {
    title: "รายงานการแปรงฟัน",
    shortTitle: "การแปรงฟัน",
    action: "แปรง",
    negAction: "ไม่แปรง",
    symYes: "แปรง",
    symNo: "ไม่แปรง",
  },
};

// Month order for Thai academic year (May=5 ... Apr=4)
const ACADEMIC_MONTH_ORDER = [5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4];

function StatusCell({ status }: { status: "yes" | "no" | "absent" | null }) {
  if (status === "yes")
    return <span className="text-green-700 font-bold text-[9px]">✓</span>;
  if (status === "no")
    return <span className="text-red-700 font-bold text-[9px]">✗</span>;
  if (status === "absent")
    return <span className="text-yellow-700 font-bold text-[9px]">ล</span>;
  return null;
}

interface SummaryRow {
  studentId: string;
  studentCode: string;
  studentName: string;
  totalAssessed: number;
  totalYes: number;
  totalNo: number;
  totalAbsent: number;
}

function buildSummaryRows(months: MonthSummary[]): SummaryRow[] {
  const map = new Map<string, SummaryRow>();
  for (const month of months) {
    for (const rec of month.records) {
      if (!map.has(rec.studentId)) {
        map.set(rec.studentId, {
          studentId: rec.studentId,
          studentCode: rec.studentCode,
          studentName: rec.studentName,
          totalAssessed: 0,
          totalYes: 0,
          totalNo: 0,
          totalAbsent: 0,
        });
      }
      const row = map.get(rec.studentId)!;
      row.totalAssessed += rec.totalOpen;
      row.totalYes += rec.totalYes;
      row.totalNo += rec.totalNo;
      row.totalAbsent += rec.totalAbsent;
    }
  }
  return Array.from(map.values());
}

function CoverPage({
  cfg,
  grade,
  classroom,
  academicYear,
  schoolName,
}: {
  cfg: TypeConfig;
  grade: string;
  classroom: string;
  academicYear: string;
  schoolName: string;
}) {
  return (
    <div className="report-page flex flex-col items-center justify-center min-h-screen text-center gap-6 p-12">
      <div className="text-2xl font-bold">{schoolName}</div>
      <div className="text-3xl font-bold mt-8">{cfg.title}</div>
      <div className="text-2xl mt-4">
        ชั้น{grade}/{classroom}
      </div>
      <div className="text-xl mt-2">ปีการศึกษา {academicYear}</div>
      <div className="text-xl mt-8">
        ครูประจำชั้น: ______________________________
      </div>
    </div>
  );
}

function MonthlyPage({
  month,
  pageNum,
  totalPages,
  cfg,
  grade,
  classroom,
  academicYear,
}: {
  month: MonthSummary;
  pageNum: number;
  totalPages: number;
  cfg: TypeConfig;
  grade: string;
  classroom: string;
  academicYear: string;
}) {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="report-page p-3 text-[10px]">
      {/* Header */}
      <div className="flex justify-between items-start mb-1">
        <div>
          <div className="text-sm font-bold">
            บันทึก{cfg.shortTitle} ชั้น{grade}/{classroom}
          </div>
          <div>
            ประจำเดือน {month.thaiMonth} · เทอม {month.semester} · ปีการศึกษา{" "}
            {academicYear}
          </div>
        </div>
        <div className="text-right text-[9px] text-gray-500">
          หน้า {pageNum} / {totalPages}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-400 text-[9px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-1 py-0.5 text-center w-5">#</th>
              <th className="border border-gray-400 px-1 py-0.5 text-center w-10">รหัส</th>
              <th className="border border-gray-400 px-1 py-0.5 text-left min-w-[100px]">ชื่อ-สกุล</th>
              {days.map((d) => (
                <th
                  key={d}
                  className={`border border-gray-400 px-0.5 py-0.5 text-center w-4 ${
                    d > month.daysInMonth ? "bg-gray-200" : ""
                  }`}
                >
                  {d <= month.daysInMonth ? d : ""}
                </th>
              ))}
              <th className="border border-gray-400 px-1 py-0.5 text-center w-8">
                เปิด
                <br />
                (วัน)
              </th>
              <th className="border border-gray-400 px-1 py-0.5 text-center w-8">
                {cfg.action}
                <br />
                (ครั้ง)
              </th>
              <th className="border border-gray-400 px-1 py-0.5 text-center w-8">
                ไม่{cfg.action}
                <br />
                (ครั้ง)
              </th>
              <th className="border border-gray-400 px-1 py-0.5 text-center w-8">
                ลา
                <br />
                (ครั้ง)
              </th>
            </tr>
          </thead>
          <tbody>
            {month.records.map((rec, idx) => (
              <tr key={rec.studentId} className="hover:bg-gray-50">
                <td className="border border-gray-400 px-1 py-0.5 text-center">
                  {idx + 1}
                </td>
                <td className="border border-gray-400 px-1 py-0.5 text-center">
                  {rec.studentCode}
                </td>
                <td className="border border-gray-400 px-1 py-0.5">
                  {rec.studentName}
                </td>
                {days.map((d) => (
                  <td
                    key={d}
                    className={`border border-gray-400 px-0.5 py-0.5 text-center ${
                      d > month.daysInMonth ? "bg-gray-200" : ""
                    }`}
                  >
                    {d <= month.daysInMonth ? (
                      <StatusCell status={rec.days[d] ?? null} />
                    ) : null}
                  </td>
                ))}
                <td className="border border-gray-400 px-1 py-0.5 text-center">
                  {rec.totalOpen}
                </td>
                <td className="border border-gray-400 px-1 py-0.5 text-center">
                  {rec.totalYes}
                </td>
                <td className="border border-gray-400 px-1 py-0.5 text-center">
                  {rec.totalNo}
                </td>
                <td className="border border-gray-400 px-1 py-0.5 text-center">
                  {rec.totalAbsent}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-4 flex justify-between items-start">
        <div className="text-[9px] text-gray-600">
          <span className="mr-3">
            <span className="text-green-700 font-bold">✓</span> = {cfg.symYes}
          </span>
          <span className="mr-3">
            <span className="text-red-700 font-bold">✗</span> = {cfg.symNo}
          </span>
          <span>
            <span className="text-yellow-700 font-bold">ล</span> = ลา / ขาด
          </span>
        </div>
        <div className="flex gap-12 text-[9px]">
          <div className="text-center">
            <div className="mb-6">ลงชื่อ ________________________</div>
            <div>(ครูประจำชั้น)</div>
          </div>
          <div className="text-center">
            <div className="mb-6">ลงชื่อ ________________________</div>
            <div>(ผู้อำนวยการโรงเรียน)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryPage({
  title,
  months,
  pageNum,
  totalPages,
  cfg,
  grade,
  classroom,
  academicYear,
}: {
  title: string;
  months: MonthSummary[];
  pageNum: number;
  totalPages: number;
  cfg: TypeConfig;
  grade: string;
  classroom: string;
  academicYear: string;
}) {
  const rows = buildSummaryRows(months);

  return (
    <div className="report-page p-3 text-[10px]">
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="text-sm font-bold">
            {title} · บันทึก{cfg.shortTitle} ชั้น{grade}/{classroom}
          </div>
          <div>ปีการศึกษา {academicYear}</div>
        </div>
        <div className="text-right text-[9px] text-gray-500">
          หน้า {pageNum} / {totalPages}
        </div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse border border-gray-400 text-[9px]">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 px-1 py-0.5 text-center w-6">ที่</th>
            <th className="border border-gray-400 px-1 py-0.5 text-center w-12">รหัส</th>
            <th className="border border-gray-400 px-1 py-0.5 text-left">ชื่อ-สกุล</th>
            <th className="border border-gray-400 px-1 py-0.5 text-center">
              จำนวนครั้ง
              <br />
              (ที่ประเมิน)
            </th>
            <th className="border border-gray-400 px-1 py-0.5 text-center">
              {cfg.action}
              <br />
              (ครั้ง)
            </th>
            <th className="border border-gray-400 px-1 py-0.5 text-center">
              ไม่{cfg.action}
              <br />
              (ครั้ง)
            </th>
            <th className="border border-gray-400 px-1 py-0.5 text-center">
              ลา
              <br />
              (ครั้ง)
            </th>
            <th className="border border-gray-400 px-1 py-0.5 text-center">
              ร้อยละ
              <br />
              (%)
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const pct =
              row.totalAssessed > 0
                ? ((row.totalYes / row.totalAssessed) * 100).toFixed(1)
                : "0.0";
            return (
              <tr key={row.studentId}>
                <td className="border border-gray-400 px-1 py-0.5 text-center">
                  {idx + 1}
                </td>
                <td className="border border-gray-400 px-1 py-0.5 text-center">
                  {row.studentCode}
                </td>
                <td className="border border-gray-400 px-1 py-0.5">
                  {row.studentName}
                </td>
                <td className="border border-gray-400 px-1 py-0.5 text-center">
                  {row.totalAssessed}
                </td>
                <td className="border border-gray-400 px-1 py-0.5 text-center">
                  {row.totalYes}
                </td>
                <td className="border border-gray-400 px-1 py-0.5 text-center">
                  {row.totalNo}
                </td>
                <td className="border border-gray-400 px-1 py-0.5 text-center">
                  {row.totalAbsent}
                </td>
                <td className="border border-gray-400 px-1 py-0.5 text-center">
                  {pct}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Footer */}
      <div className="mt-6 flex justify-end gap-12 text-[9px]">
        <div className="text-center">
          <div className="mb-6">ลงชื่อ ________________________</div>
          <div>(ครูประจำชั้น)</div>
        </div>
        <div className="text-center">
          <div className="mb-6">ลงชื่อ ________________________</div>
          <div>(ผู้อำนวยการโรงเรียน)</div>
        </div>
      </div>
    </div>
  );
}

export function MonthlyTrackingPrint({
  reportType,
  grade,
  classroom,
  academicYear,
  schoolName,
  months,
}: MonthlyTrackingPrintProps) {
  const cfg = TYPE_CONFIG[reportType];

  // Sort months by Thai academic year order
  const sortedMonths = [...months].sort((a, b) => {
    return (
      ACADEMIC_MONTH_ORDER.indexOf(a.month) -
      ACADEMIC_MONTH_ORDER.indexOf(b.month)
    );
  });

  const sem1Months = sortedMonths.filter((m) => m.semester === 1);
  const sem2Months = sortedMonths.filter((m) => m.semester === 2);

  // Total pages: 12 monthly + semester 2 summary + annual summary = 14
  const TOTAL_PAGES = 14;

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          .no-print { display: none !important; }
          .report-page { page-break-after: always; }
          .report-page:last-child { page-break-after: avoid; }
        }
        .report-page { min-height: 100vh; }
      `}</style>

      {/* Cover page */}
      <CoverPage
        cfg={cfg}
        grade={grade}
        classroom={classroom}
        academicYear={academicYear}
        schoolName={schoolName}
      />

      {/* Monthly pages */}
      {sortedMonths.map((month, idx) => (
        <MonthlyPage
          key={`${month.year}-${month.month}`}
          month={month}
          pageNum={idx + 1}
          totalPages={TOTAL_PAGES}
          cfg={cfg}
          grade={grade}
          classroom={classroom}
          academicYear={academicYear}
        />
      ))}

      {/* Semester 2 summary (page 13) */}
      <SummaryPage
        title="สรุปภาคเรียนที่ 2"
        months={sem2Months}
        pageNum={13}
        totalPages={TOTAL_PAGES}
        cfg={cfg}
        grade={grade}
        classroom={classroom}
        academicYear={academicYear}
      />

      {/* Annual summary (page 14) */}
      <SummaryPage
        title="สรุปทั้งปีการศึกษา"
        months={[...sem1Months, ...sem2Months]}
        pageNum={14}
        totalPages={TOTAL_PAGES}
        cfg={cfg}
        grade={grade}
        classroom={classroom}
        academicYear={academicYear}
      />
    </>
  );
}

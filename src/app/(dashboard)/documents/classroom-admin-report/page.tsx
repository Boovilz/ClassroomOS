import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props {
  searchParams: Promise<{ classroom?: string; grade?: string }>;
}

export default async function ClassroomAdminReportPage({ searchParams }: Props) {
  const params = await searchParams;
  const classroom = params.classroom ?? null;
  const grade = params.grade ?? null;

  const supabase = await createClient();

  // School info
  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id").eq("id", auth.user.id).single()
    : { data: null };

  const { data: school } = profile?.school_id
    ? await supabase.from("schools").select("name").eq("id", profile.school_id).single()
    : { data: null };

  const schoolName = school?.name ?? "โรงเรียน";
  const academicYear = new Date().getFullYear() + 543;

  // Students query
  let studentsQuery = supabase
    .from("students")
    .select("id, is_active, classroom")
    .is("deleted_at", null);

  if (classroom) studentsQuery = studentsQuery.eq("classroom", classroom);

  const { data: students } = await studentsQuery;
  const studentRows = students ?? [];
  const activeStudents = studentRows.filter((s) => s.is_active);
  const inactiveStudents = studentRows.filter((s) => !s.is_active);
  const studentIds = studentRows.map((s) => s.id);

  // Attendance summary (current academic year: May–April)
  const now = new Date();
  const yearStart =
    now.getMonth() >= 4
      ? `${now.getFullYear()}-05-01`
      : `${now.getFullYear() - 1}-05-01`;
  const yearEnd =
    now.getMonth() >= 4
      ? `${now.getFullYear() + 1}-04-30`
      : `${now.getFullYear()}-04-30`;

  const { data: attendanceRows } = studentIds.length > 0
    ? await supabase
        .from("attendance")
        .select("status")
        .in("student_id", studentIds)
        .gte("date", yearStart)
        .lte("date", yearEnd)
    : { data: [] };

  const attRows = attendanceRows ?? [];
  const attPresent = attRows.filter((r) => r.status === "present").length;
  const attLate = attRows.filter((r) => r.status === "late").length;
  const attAbsent = attRows.filter((r) => r.status === "absent").length;
  const attSick = attRows.filter((r) => r.status === "sick").length;
  const attLeave = attRows.filter((r) => r.status === "personal_leave").length;
  const attTotal = attRows.length;

  // Assignments + submissions
  const { data: assignments } = await supabase.from("assignments").select("id");
  const assignmentIds = (assignments ?? []).map((a) => a.id);

  const { data: submissions } = assignmentIds.length > 0 && studentIds.length > 0
    ? await supabase
        .from("assignment_submissions")
        .select("id")
        .in("assignment_id", assignmentIds)
        .in("student_id", studentIds)
    : { data: [] };

  const totalAssignments = assignmentIds.length;
  const totalSubmitted = (submissions ?? []).length;
  const totalExpected = totalAssignments * activeStudents.length;
  const totalNotSubmitted = Math.max(totalExpected - totalSubmitted, 0);

  // Savings total
  const { data: savingsAccounts } = studentIds.length > 0
    ? await supabase
        .from("finance_accounts")
        .select("balance")
        .eq("account_type", "savings")
        .in("student_id", studentIds)
    : { data: [] };

  const totalSavings = (savingsAccounts ?? []).reduce((sum, a) => sum + (a.balance ?? 0), 0);

  const reportDate = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4 print:p-0">
      {/* Print button */}
      <div className="flex justify-end print:hidden">
        <form action="">
          <Button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.print();
            }}
          >
            พิมพ์รายงาน
          </Button>
        </form>
      </div>

      {/* Report header */}
      <div className="text-center space-y-1">
        <h1 className="text-xl font-bold">รายงานข้อมูลระบบธุรการชั้นเรียน</h1>
        <p className="text-base font-semibold">{schoolName}</p>
        <p className="text-sm text-muted-foreground">
          {classroom ? `ชั้นเรียน: ${classroom}` : "ทุกชั้นเรียน"}
          {grade ? ` ระดับชั้น: ${grade}` : ""}
          {" "}| ปีการศึกษา {academicYear}
        </p>
        <p className="text-xs text-muted-foreground">วันที่พิมพ์: {reportDate}</p>
      </div>

      {/* Student summary */}
      <section className="space-y-2">
        <h2 className="font-semibold text-base border-b pb-1">1. ข้อมูลนักเรียน</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รายการ</TableHead>
              <TableHead className="text-right">จำนวน (คน)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>นักเรียนทั้งหมด</TableCell>
              <TableCell className="text-right">{studentRows.length}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>นักเรียนที่กำลังศึกษา</TableCell>
              <TableCell className="text-right">{activeStudents.length}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>นักเรียนที่ไม่ได้กำลังศึกษา</TableCell>
              <TableCell className="text-right">{inactiveStudents.length}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>

      {/* Attendance summary */}
      <section className="space-y-2">
        <h2 className="font-semibold text-base border-b pb-1">2. สรุปการเข้าเรียน (ปีการศึกษา {academicYear})</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">จำนวน (ครั้ง)</TableHead>
              <TableHead className="text-right">ร้อยละ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>บันทึกทั้งหมด</TableCell>
              <TableCell className="text-right">{attTotal}</TableCell>
              <TableCell className="text-right">100%</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>มาเรียน</TableCell>
              <TableCell className="text-right">{attPresent}</TableCell>
              <TableCell className="text-right">
                {attTotal > 0 ? ((attPresent / attTotal) * 100).toFixed(1) : "0"}%
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>มาสาย</TableCell>
              <TableCell className="text-right">{attLate}</TableCell>
              <TableCell className="text-right">
                {attTotal > 0 ? ((attLate / attTotal) * 100).toFixed(1) : "0"}%
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>ขาด</TableCell>
              <TableCell className="text-right">{attAbsent}</TableCell>
              <TableCell className="text-right">
                {attTotal > 0 ? ((attAbsent / attTotal) * 100).toFixed(1) : "0"}%
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>ลาป่วย</TableCell>
              <TableCell className="text-right">{attSick}</TableCell>
              <TableCell className="text-right">
                {attTotal > 0 ? ((attSick / attTotal) * 100).toFixed(1) : "0"}%
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>ลากิจ</TableCell>
              <TableCell className="text-right">{attLeave}</TableCell>
              <TableCell className="text-right">
                {attTotal > 0 ? ((attLeave / attTotal) * 100).toFixed(1) : "0"}%
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>

      {/* Assignment summary */}
      <section className="space-y-2">
        <h2 className="font-semibold text-base border-b pb-1">3. สรุปงาน/การประเมิน</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รายการ</TableHead>
              <TableHead className="text-right">จำนวน</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>งานทั้งหมด</TableCell>
              <TableCell className="text-right">{totalAssignments}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>ส่งแล้ว (รายการส่ง)</TableCell>
              <TableCell className="text-right">{totalSubmitted}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>ยังไม่ส่ง (คาดการณ์)</TableCell>
              <TableCell className="text-right">{totalNotSubmitted}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>อัตราการส่งงาน</TableCell>
              <TableCell className="text-right">
                {totalExpected > 0 ? ((totalSubmitted / totalExpected) * 100).toFixed(1) : "0"}%
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>

      {/* Financial summary */}
      <section className="space-y-2">
        <h2 className="font-semibold text-base border-b pb-1">4. สรุปการออมทรัพย์นักเรียน</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รายการ</TableHead>
              <TableHead className="text-right">จำนวน (บาท)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>ยอดเงินออมรวมทั้งห้อง</TableCell>
              <TableCell className="text-right font-semibold">
                {totalSavings.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>

      <p className="text-xs text-muted-foreground text-center pt-4">
        รายงานนี้สร้างโดยระบบ ClassroomOS อัตโนมัติ — {reportDate}
      </p>
    </div>
  );
}

import { notFound } from "next/navigation";
import { MonthlyTrackingPrint } from "@/components/reports/monthly-tracking-print";
import { getSchoolContext, buildDailyRecordMonths } from "@/lib/queries/tracking-report";

export default async function MilkPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string; classroom?: string; year?: string }>;
}) {
  const { grade, classroom, year } = await searchParams;
  if (!grade || !classroom) notFound();

  const beYear = parseInt(year ?? String(new Date().getFullYear() + 543));
  const ctx = await getSchoolContext(grade, classroom);
  if (!ctx) notFound();

  const months = await buildDailyRecordMonths(ctx.schoolId, grade, classroom, beYear, "milk");

  return (
    <MonthlyTrackingPrint
      reportType="milk"
      grade={grade}
      classroom={classroom}
      academicYear={String(beYear)}
      teacherName={ctx.teacherName}
      principalName={ctx.principalName}
      schoolName={ctx.schoolName}
      months={months}
    />
  );
}

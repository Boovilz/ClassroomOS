import { notFound } from "next/navigation";
import { MonthlyTrackingPrint } from "@/components/reports/monthly-tracking-print";
import { getSchoolContext, buildLunchMonths } from "@/lib/queries/tracking-report";

export default async function LunchMonthlyPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string; classroom?: string; year?: string }>;
}) {
  const { grade, classroom, year } = await searchParams;
  if (!grade || !classroom) notFound();

  const beYear = parseInt(year ?? String(new Date().getFullYear() + 543));
  const ctx = await getSchoolContext(grade, classroom);
  if (!ctx) notFound();

  const months = await buildLunchMonths(ctx.schoolId, grade, classroom, beYear);

  return (
    <MonthlyTrackingPrint
      reportType="lunch"
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

import { NextRequest, NextResponse } from "next/server";
import { getAiCommandCenterDashboard, getAiGeneratedContent, type AiContentType } from "@/lib/queries/ai";
import { currentUserContext } from "@/lib/queries/ai";

/** GET /api/ai/insights - AI Command Center dashboard data / content feed. */
export async function GET(request: NextRequest) {
  const contentType = request.nextUrl.searchParams.get("contentType") as AiContentType | null;
  const dashboard = request.nextUrl.searchParams.get("dashboard");

  const { schoolId } = await currentUserContext();
  if (!schoolId) return NextResponse.json({ success: false, message: "Unauthorized or no school" }, { status: 401 });

  try {
    if (dashboard === "1") {
      const result = await getAiCommandCenterDashboard(schoolId);
      return NextResponse.json({ success: true, ...result });
    }
    const content = await getAiGeneratedContent(schoolId, contentType ?? undefined);
    return NextResponse.json({ success: true, content });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}

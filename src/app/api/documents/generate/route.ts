import { NextRequest, NextResponse } from "next/server";
import { generateDocumentForStudent, listGeneratedDocuments } from "@/lib/queries/document-templates";

export async function GET(request: NextRequest) {
  const templateId = request.nextUrl.searchParams.get("templateId") ?? undefined;
  const documents = await listGeneratedDocuments(templateId);
  return NextResponse.json({ documents });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.templateId || !body.studentId) {
      return NextResponse.json({ error: "กรุณาระบุเทมเพลตและนักเรียน" }, { status: 400 });
    }
    const result = await generateDocumentForStudent({ templateId: body.templateId, studentId: body.studentId });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "สร้างเอกสารล้มเหลว" }, { status: 400 });
  }
}

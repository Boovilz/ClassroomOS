import { NextRequest, NextResponse } from "next/server";
import { listDocumentTemplates, uploadDocumentTemplate } from "@/lib/queries/document-templates";

export async function GET() {
  const templates = await listDocumentTemplates();
  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string | null;
    const category = formData.get("category") as string | null;
    const description = formData.get("description") as string | null;

    if (!file || !name || !category) {
      return NextResponse.json({ error: "กรุณาระบุไฟล์ ชื่อ และหมวดหมู่" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const template = await uploadDocumentTemplate({
      name,
      category,
      description: description ?? undefined,
      file: buffer,
      fileName: file.name,
    });
    return NextResponse.json({ template });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "อัปโหลดเทมเพลตล้มเหลว" }, { status: 400 });
  }
}

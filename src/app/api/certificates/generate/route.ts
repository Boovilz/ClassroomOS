import { NextRequest, NextResponse } from "next/server";
import { issueCertificate, getCertificates } from "@/lib/queries/academic";

export async function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get("studentId") ?? undefined;
  const certificates = await getCertificates(studentId);
  return NextResponse.json({ certificates });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  try {
    const certificate = await issueCertificate(body);
    return NextResponse.json({ certificate });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to issue certificate" }, { status: 400 });
  }
}

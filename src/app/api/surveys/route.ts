import { NextRequest, NextResponse } from "next/server";
import { createSurvey, getSurveys } from "@/lib/queries/communication";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get("schoolId");
  if (!schoolId) {
    return NextResponse.json({ success: false, message: "Missing schoolId" }, { status: 400 });
  }
  const surveys = await getSurveys(schoolId);
  return NextResponse.json({ success: true, surveys });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { schoolId, createdBy, title, description, surveyType, isAnonymous, questions } = body;

  if (!schoolId || !title || !Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
  }

  try {
    const survey = await createSurvey({ schoolId, createdBy, title, description, surveyType, isAnonymous, questions });
    return NextResponse.json({ success: true, survey });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}

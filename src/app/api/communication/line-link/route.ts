import { NextRequest, NextResponse } from "next/server";
import { createLineLinkingRequest, confirmLineLink } from "@/lib/queries/communication";

/**
 * Simulated LINE OA account-linking endpoints. No real LINE OAuth/QR/
 * webhook is involved - see src/lib/queries/communication.ts header.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { schoolId, parentId } = body;
  if (!schoolId || !parentId) {
    return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
  }
  try {
    const linkUser = await createLineLinkingRequest({ schoolId, parentId });
    return NextResponse.json({ success: true, linkUser });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { parentId, linkingCode, simulatedLineUserId, displayName } = body;
  if (!parentId || !linkingCode || !simulatedLineUserId) {
    return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
  }
  try {
    const linkUser = await confirmLineLink({ parentId, linkingCode, simulatedLineUserId, displayName });
    return NextResponse.json({ success: true, linkUser });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}

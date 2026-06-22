import { NextRequest, NextResponse } from "next/server";
import {
  addKnowledgeBaseEntry,
  listKnowledgeBaseEntries,
  updateKnowledgeBaseEntry,
  deleteKnowledgeBaseEntry,
  askKnowledgeBase,
  currentUserContext,
} from "@/lib/queries/ai";

/** GET /api/ai/knowledge-base - list entries, or ?q=... for the Q&A retrieval+Claude answer. */
export async function GET(request: NextRequest) {
  const { schoolId } = await currentUserContext();
  if (!schoolId) return NextResponse.json({ success: false, message: "Unauthorized or no school" }, { status: 401 });

  const question = request.nextUrl.searchParams.get("q");
  try {
    if (question) {
      const result = await askKnowledgeBase(schoolId, question);
      return NextResponse.json({ success: true, ...result });
    }
    const entries = await listKnowledgeBaseEntries(schoolId);
    return NextResponse.json({ success: true, entries });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, content, category } = body as { title?: string; content?: string; category?: string };
  if (!title || !content) return NextResponse.json({ success: false, message: "Missing title or content" }, { status: 400 });

  const { schoolId, userId } = await currentUserContext();
  if (!schoolId) return NextResponse.json({ success: false, message: "Unauthorized or no school" }, { status: 401 });

  try {
    const entry = await addKnowledgeBaseEntry({ schoolId, title, content, category, createdBy: userId ?? undefined });
    return NextResponse.json({ success: true, entry });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, ...changes } = body as { id?: string; title?: string; content?: string; category?: string };
  if (!id) return NextResponse.json({ success: false, message: "Missing id" }, { status: 400 });
  try {
    const entry = await updateKnowledgeBaseEntry(id, changes);
    return NextResponse.json({ success: true, entry });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, message: "Missing id" }, { status: 400 });
  try {
    await deleteKnowledgeBaseEntry(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}

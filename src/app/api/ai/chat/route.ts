import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateConversation, sendChatMessage, buildChatContext, CHAT_SYSTEM_PROMPT, logAiUsage, currentUserContext } from "@/lib/queries/ai";
import { streamAi } from "@/lib/ai/client";

/**
 * POST /api/ai/chat
 *
 * Turn-based by default (body.stream !== true): persists the user message,
 * builds simple keyword-routed context, calls Claude once, persists the
 * reply, logs usage, returns JSON.
 *
 * Streaming (body.stream === true): returns a text/event-stream of raw
 * text chunks for the ChatGPT-style UI. Chosen as a SSE-over-fetch stream
 * (not the Vercel AI SDK) to avoid adding another dependency given the
 * time budget - the client reads the raw stream via `response.body`.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { message, conversationId, stream } = body as { message?: string; conversationId?: string | null; stream?: boolean };

  if (!message || typeof message !== "string") {
    return NextResponse.json({ success: false, message: "Missing message" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const conversation = await getOrCreateConversation(conversationId);
  if (!conversation) {
    return NextResponse.json({ success: false, message: "ไม่พบโรงเรียนของผู้ใช้นี้" }, { status: 400 });
  }

  if (!stream) {
    try {
      const result = await sendChatMessage({ conversationId: conversation.id, message });
      return NextResponse.json({ success: true, conversationId: conversation.id, reply: result.reply, notConfigured: result.notConfigured, matchedIntent: result.matchedIntent });
    } catch (err) {
      return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
    }
  }

  // Streaming path.
  const { schoolId, userId } = await currentUserContext();
  const encoder = new TextEncoder();
  const stream2 = new ReadableStream<Uint8Array>({
    async start(controller) {
      await supabase.from("ai_messages").insert({ conversation_id: conversation.id, role: "user", content: message });

      const { contextText } = schoolId ? await buildChatContext(message, schoolId) : { contextText: null };
      const prompt = contextText ? `บริบทข้อมูลจากระบบ:\n${contextText}\n\nคำถามของครู: ${message}` : message;

      let full = "";
      let usage: { inputTokens: number; outputTokens: number } | undefined;
      let model: string | undefined;
      let notConfigured = false;

      for await (const chunk of streamAi(prompt, CHAT_SYSTEM_PROMPT, { maxTokens: 1024 })) {
        if (chunk.delta) {
          full += chunk.delta;
          controller.enqueue(encoder.encode(chunk.delta));
        }
        if (chunk.notConfigured) notConfigured = true;
        if (chunk.usage) usage = chunk.usage;
        if (chunk.model) model = chunk.model;
      }

      await supabase.from("ai_messages").insert({
        conversation_id: conversation.id,
        role: "assistant",
        content: full,
        model: model ?? null,
        input_tokens: usage?.inputTokens ?? null,
        output_tokens: usage?.outputTokens ?? null,
      });
      await supabase.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversation.id);
      await logAiUsage({
        schoolId,
        userId,
        feature: "chat_stream",
        model,
        inputTokens: usage?.inputTokens,
        outputTokens: usage?.outputTokens,
        succeeded: !notConfigured,
      });

      controller.close();
    },
  });

  return new Response(stream2, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Conversation-Id": conversation.id },
  });
}

export async function GET(request: NextRequest) {
  const conversationId = request.nextUrl.searchParams.get("conversationId");
  if (!conversationId) {
    const { listConversations } = await import("@/lib/queries/ai");
    const conversations = await listConversations();
    return NextResponse.json({ success: true, conversations });
  }
  const { getConversationMessages } = await import("@/lib/queries/ai");
  const messages = await getConversationMessages(conversationId);
  return NextResponse.json({ success: true, messages });
}

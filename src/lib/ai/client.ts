/**
 * Real Anthropic Claude API wrapper - the ONLY file in this codebase that
 * imports `@anthropic-ai/sdk` and calls `client.messages.create(...)`.
 *
 * Multi-model support (GPT/Gemini/Ollama/"Custom School AI") is explicitly
 * OUT OF SCOPE - `callAi()` below is shaped provider-agnostically (prompt,
 * systemPrompt, options) so a second provider could be added later, but
 * only Anthropic/Claude is actually wired. Every feature in this app is
 * "Powered by Claude" only.
 *
 * CRITICAL: this file must be safe to import at build time with NO
 * `ANTHROPIC_API_KEY` set. The SDK client is constructed lazily (inside
 * `callAi`, never at module top-level) and every call site checks
 * `isAiConfigured()` first and returns a typed "not configured" result
 * instead of throwing past the API boundary.
 */
import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_MODEL = "claude-sonnet-4-5";
const DEFAULT_MAX_TOKENS = 1536;

let cachedClient: Anthropic | null = null;

/** True if a server-side Anthropic API key is configured in this environment. */
export function isAiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/** Friendly Thai message shown anywhere the UI needs to explain AI is unavailable. */
export const AI_NOT_CONFIGURED_MESSAGE_TH =
  "ยังไม่ได้ตั้งค่า AI Provider — โปรดเพิ่ม ANTHROPIC_API_KEY ในไฟล์ .env แล้วลองใหม่อีกครั้ง";

function getClient(): Anthropic {
  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return cachedClient;
}

export interface CallAiOptions {
  model?: string;
  maxTokens?: number;
  /** Optional small set of prior turns for conversation memory. */
  history?: { role: "user" | "assistant"; content: string }[];
  /** Optional image inputs (base64) for multimodal analysis (file upload feature). */
  images?: { mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp"; base64: string }[];
}

export interface CallAiResult {
  ok: boolean;
  text: string;
  inputTokens?: number;
  outputTokens?: number;
  model?: string;
  /** Set when ok=false because no API key is configured (graceful degradation, never a thrown error). */
  notConfigured?: boolean;
  error?: string;
}

/**
 * The single provider-agnostic entry point every AI-calling function in
 * this module goes through. Returns a typed result - NEVER throws past
 * this boundary, so callers (route handlers, server actions, RSCs) never
 * need a try/catch just to render a friendly Thai "AI unavailable" state.
 */
export async function callAi(prompt: string, systemPrompt: string, options: CallAiOptions = {}): Promise<CallAiResult> {
  if (!isAiConfigured()) {
    return { ok: false, notConfigured: true, text: AI_NOT_CONFIGURED_MESSAGE_TH, error: "ANTHROPIC_API_KEY is not set" };
  }

  try {
    const client = getClient();
    const model = options.model ?? DEFAULT_MODEL;

    const userContent: Anthropic.Messages.ContentBlockParam[] = [];
    if (options.images && options.images.length > 0) {
      for (const img of options.images) {
        userContent.push({
          type: "image",
          source: { type: "base64", media_type: img.mediaType, data: img.base64 },
        });
      }
    }
    userContent.push({ type: "text", text: prompt });

    const messages: Anthropic.Messages.MessageParam[] = [
      ...(options.history ?? []).map((h) => ({ role: h.role, content: h.content })),
      { role: "user" as const, content: userContent },
    ];

    const response = await client.messages.create({
      model,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: systemPrompt,
      messages,
    });

    const text = response.content
      .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    return {
      ok: true,
      text: text || "ขออภัย ไม่สามารถสร้างคำตอบได้ในขณะนี้",
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
      model,
    };
  } catch (err) {
    return {
      ok: false,
      text: "เกิดข้อผิดพลาดในการเรียกใช้ AI กรุณาลองใหม่อีกครั้ง",
      error: err instanceof Error ? err.message : "Unknown error calling Anthropic API",
    };
  }
}

/**
 * Streaming variant for the chat assistant UI (turn-based fallback is used
 * for every other feature in this module - only the chat endpoint streams,
 * see src/app/api/ai/chat/route.ts). Returns an async generator of text
 * deltas, or yields the not-configured message once if no key is set.
 */
export async function* streamAi(
  prompt: string,
  systemPrompt: string,
  options: CallAiOptions = {}
): AsyncGenerator<{ delta?: string; done?: boolean; notConfigured?: boolean; usage?: { inputTokens: number; outputTokens: number }; model?: string }> {
  if (!isAiConfigured()) {
    yield { delta: AI_NOT_CONFIGURED_MESSAGE_TH, notConfigured: true, done: true };
    return;
  }

  try {
    const client = getClient();
    const model = options.model ?? DEFAULT_MODEL;

    const userContent: Anthropic.Messages.ContentBlockParam[] = [];
    if (options.images && options.images.length > 0) {
      for (const img of options.images) {
        userContent.push({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.base64 } });
      }
    }
    userContent.push({ type: "text", text: prompt });

    const messages: Anthropic.Messages.MessageParam[] = [
      ...(options.history ?? []).map((h) => ({ role: h.role, content: h.content })),
      { role: "user" as const, content: userContent },
    ];

    const stream = client.messages.stream({
      model,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: systemPrompt,
      messages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield { delta: event.delta.text };
      }
    }

    const final = await stream.finalMessage();
    yield {
      done: true,
      model,
      usage: { inputTokens: final.usage?.input_tokens ?? 0, outputTokens: final.usage?.output_tokens ?? 0 },
    };
  } catch (err) {
    yield { delta: `\n\n[เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : "unknown"}]`, done: true };
  }
}

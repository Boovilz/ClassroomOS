/**
 * Multi-provider AI wrapper. Supports Anthropic Claude, OpenAI, and Google
 * Gemini - the active provider/model/key is resolved per-request by
 * src/lib/ai/provider.ts (per-school override in `api_keys`, else server
 * env vars). `callAi()`/`streamAi()` are the only entry points every
 * AI-calling function in this codebase goes through; callers never need to
 * know which provider answered.
 *
 * CRITICAL: this file must be safe to import at build time with NO API key
 * set for any provider. SDK clients are constructed lazily per-call (never
 * at module top-level) and `callAi`/`streamAi` always return a typed
 * "not configured" result instead of throwing past the API boundary.
 */
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { resolveAiProvider, type AiProviderName, type ResolvedAiProvider } from "@/lib/ai/provider";

const DEFAULT_MAX_TOKENS = 1536;

/** True if any AI provider (school override or env var) is configured. */
export async function isAiConfigured(schoolId?: string | null): Promise<boolean> {
  return !!(await resolveAiProvider(schoolId));
}

/** Friendly Thai message shown anywhere the UI needs to explain AI is unavailable. */
export const AI_NOT_CONFIGURED_MESSAGE_TH =
  "ยังไม่ได้ตั้งค่า AI Provider — โปรดตั้งค่าผู้ให้บริการ AI ในหน้า Settings หรือเพิ่ม ANTHROPIC_API_KEY / OPENAI_API_KEY / GOOGLE_API_KEY ในไฟล์ .env แล้วลองใหม่อีกครั้ง";

export interface CallAiOptions {
  model?: string;
  maxTokens?: number;
  /** Optional small set of prior turns for conversation memory. */
  history?: { role: "user" | "assistant"; content: string }[];
  /** Optional image inputs (base64) for multimodal analysis (file upload feature). */
  images?: { mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp"; base64: string }[];
  /** Resolve the AI provider for a specific school rather than the current request's session. */
  schoolId?: string | null;
}

export interface CallAiResult {
  ok: boolean;
  text: string;
  inputTokens?: number;
  outputTokens?: number;
  model?: string;
  provider?: AiProviderName;
  /** Set when ok=false because no provider is configured (graceful degradation, never a thrown error). */
  notConfigured?: boolean;
  error?: string;
}

async function callAnthropic(resolved: ResolvedAiProvider, prompt: string, systemPrompt: string, options: CallAiOptions): Promise<CallAiResult> {
  const client = new Anthropic({ apiKey: resolved.apiKey });
  const model = options.model ?? resolved.model;

  const userContent: Anthropic.Messages.ContentBlockParam[] = [];
  for (const img of options.images ?? []) {
    userContent.push({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.base64 } });
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
    provider: "anthropic",
  };
}

async function callOpenAi(resolved: ResolvedAiProvider, prompt: string, systemPrompt: string, options: CallAiOptions): Promise<CallAiResult> {
  const client = new OpenAI({ apiKey: resolved.apiKey });
  const model = options.model ?? resolved.model;

  const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [];
  for (const img of options.images ?? []) {
    userContent.push({ type: "image_url", image_url: { url: `data:${img.mediaType};base64,${img.base64}` } });
  }
  userContent.push({ type: "text", text: prompt });

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...(options.history ?? []).map((h) => ({ role: h.role, content: h.content }) as OpenAI.Chat.ChatCompletionMessageParam),
    { role: "user", content: userContent },
  ];

  const response = await client.chat.completions.create({
    model,
    max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
    messages,
  });

  const text = response.choices[0]?.message?.content?.trim() ?? "";

  return {
    ok: true,
    text: text || "ขออภัย ไม่สามารถสร้างคำตอบได้ในขณะนี้",
    inputTokens: response.usage?.prompt_tokens,
    outputTokens: response.usage?.completion_tokens,
    model,
    provider: "openai",
  };
}

async function callGemini(resolved: ResolvedAiProvider, prompt: string, systemPrompt: string, options: CallAiOptions): Promise<CallAiResult> {
  const client = new GoogleGenerativeAI(resolved.apiKey);
  const model = options.model ?? resolved.model;
  const genModel = client.getGenerativeModel({ model, systemInstruction: systemPrompt });

  const history = (options.history ?? []).map((h) => ({
    role: h.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: h.content }],
  }));

  const userParts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [];
  for (const img of options.images ?? []) {
    userParts.push({ inlineData: { mimeType: img.mediaType, data: img.base64 } });
  }
  userParts.push({ text: prompt });

  const chat = genModel.startChat({ history, generationConfig: { maxOutputTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS } });
  const result = await chat.sendMessage(userParts);
  const text = result.response.text().trim();

  return {
    ok: true,
    text: text || "ขออภัย ไม่สามารถสร้างคำตอบได้ในขณะนี้",
    inputTokens: result.response.usageMetadata?.promptTokenCount,
    outputTokens: result.response.usageMetadata?.candidatesTokenCount,
    model,
    provider: "gemini",
  };
}

/**
 * The single provider-agnostic entry point every AI-calling function in
 * this module goes through. Returns a typed result - NEVER throws past
 * this boundary, so callers (route handlers, server actions, RSCs) never
 * need a try/catch just to render a friendly Thai "AI unavailable" state.
 */
export async function callAi(prompt: string, systemPrompt: string, options: CallAiOptions = {}): Promise<CallAiResult> {
  const resolved = await resolveAiProvider(options.schoolId);
  if (!resolved) {
    return { ok: false, notConfigured: true, text: AI_NOT_CONFIGURED_MESSAGE_TH, error: "No AI provider configured" };
  }

  try {
    if (resolved.provider === "anthropic") return await callAnthropic(resolved, prompt, systemPrompt, options);
    if (resolved.provider === "openai") return await callOpenAi(resolved, prompt, systemPrompt, options);
    return await callGemini(resolved, prompt, systemPrompt, options);
  } catch (err) {
    const message = err instanceof Error ? err.message : `Unknown error calling ${resolved.provider} API`;
    return {
      ok: false,
      text: message.includes("ByteString")
        ? "API key ของผู้ให้บริการ AI ที่บันทึกไว้ไม่ถูกต้อง กรุณาตั้งค่า API key ใหม่ในหน้า Settings"
        : "เกิดข้อผิดพลาดในการเรียกใช้ AI กรุณาลองใหม่อีกครั้ง",
      error: message,
    };
  }
}

export interface StreamAiEvent {
  delta?: string;
  done?: boolean;
  notConfigured?: boolean;
  usage?: { inputTokens: number; outputTokens: number };
  model?: string;
  provider?: AiProviderName;
}

async function* streamAnthropic(resolved: ResolvedAiProvider, prompt: string, systemPrompt: string, options: CallAiOptions): AsyncGenerator<StreamAiEvent> {
  const client = new Anthropic({ apiKey: resolved.apiKey });
  const model = options.model ?? resolved.model;

  const userContent: Anthropic.Messages.ContentBlockParam[] = [];
  for (const img of options.images ?? []) {
    userContent.push({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.base64 } });
  }
  userContent.push({ type: "text", text: prompt });

  const messages: Anthropic.Messages.MessageParam[] = [
    ...(options.history ?? []).map((h) => ({ role: h.role, content: h.content })),
    { role: "user" as const, content: userContent },
  ];

  const stream = client.messages.stream({ model, max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS, system: systemPrompt, messages });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield { delta: event.delta.text };
    }
  }

  const final = await stream.finalMessage();
  yield {
    done: true,
    model,
    provider: "anthropic",
    usage: { inputTokens: final.usage?.input_tokens ?? 0, outputTokens: final.usage?.output_tokens ?? 0 },
  };
}

async function* streamOpenAi(resolved: ResolvedAiProvider, prompt: string, systemPrompt: string, options: CallAiOptions): AsyncGenerator<StreamAiEvent> {
  const client = new OpenAI({ apiKey: resolved.apiKey });
  const model = options.model ?? resolved.model;

  const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [];
  for (const img of options.images ?? []) {
    userContent.push({ type: "image_url", image_url: { url: `data:${img.mediaType};base64,${img.base64}` } });
  }
  userContent.push({ type: "text", text: prompt });

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...(options.history ?? []).map((h) => ({ role: h.role, content: h.content }) as OpenAI.Chat.ChatCompletionMessageParam),
    { role: "user", content: userContent },
  ];

  const stream = await client.chat.completions.create({
    model,
    max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
    messages,
    stream: true,
  });

  let inputTokens = 0;
  let outputTokens = 0;
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield { delta };
    if (chunk.usage) {
      inputTokens = chunk.usage.prompt_tokens;
      outputTokens = chunk.usage.completion_tokens;
    }
  }

  yield { done: true, model, provider: "openai", usage: { inputTokens, outputTokens } };
}

async function* streamGemini(resolved: ResolvedAiProvider, prompt: string, systemPrompt: string, options: CallAiOptions): AsyncGenerator<StreamAiEvent> {
  const client = new GoogleGenerativeAI(resolved.apiKey);
  const model = options.model ?? resolved.model;
  const genModel = client.getGenerativeModel({ model, systemInstruction: systemPrompt });

  const history = (options.history ?? []).map((h) => ({
    role: h.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: h.content }],
  }));

  const userParts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [];
  for (const img of options.images ?? []) {
    userParts.push({ inlineData: { mimeType: img.mediaType, data: img.base64 } });
  }
  userParts.push({ text: prompt });

  const chat = genModel.startChat({ history, generationConfig: { maxOutputTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS } });
  const result = await chat.sendMessageStream(userParts);

  for await (const chunk of result.stream) {
    const delta = chunk.text();
    if (delta) yield { delta };
  }

  const final = await result.response;
  yield {
    done: true,
    model,
    provider: "gemini",
    usage: { inputTokens: final.usageMetadata?.promptTokenCount ?? 0, outputTokens: final.usageMetadata?.candidatesTokenCount ?? 0 },
  };
}

/**
 * Streaming variant for the chat assistant UI (turn-based fallback is used
 * for every other feature in this module - only the chat endpoint streams,
 * see src/app/api/ai/chat/route.ts). Yields the not-configured message once
 * if no provider is set up.
 */
export async function* streamAi(prompt: string, systemPrompt: string, options: CallAiOptions = {}): AsyncGenerator<StreamAiEvent> {
  const resolved = await resolveAiProvider(options.schoolId);
  if (!resolved) {
    yield { delta: AI_NOT_CONFIGURED_MESSAGE_TH, notConfigured: true, done: true };
    return;
  }

  try {
    if (resolved.provider === "anthropic") yield* streamAnthropic(resolved, prompt, systemPrompt, options);
    else if (resolved.provider === "openai") yield* streamOpenAi(resolved, prompt, systemPrompt, options);
    else yield* streamGemini(resolved, prompt, systemPrompt, options);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    const friendly = message.includes("ByteString")
      ? "API key ของผู้ให้บริการ AI ที่บันทึกไว้ไม่ถูกต้อง (มีอักขระที่ใช้ไม่ได้) กรุณาตั้งค่า API key ใหม่ในหน้า Settings"
      : message;
    yield { delta: `\n\n[เกิดข้อผิดพลาด: ${friendly}]`, done: true };
  }
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Mic, Volume2, Loader2, Paperclip } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// Minimal ambient typing for the browser-native Web Speech API (not in
// standard TS DOM lib). Feature-detected at runtime - see isVoiceSupported().
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: { [key: number]: { [key: number]: { transcript: string } } }; length?: number }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

function isVoiceSupported() {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * ChatGPT-style turn-based/streaming Thai-language chat assistant.
 * Streaming via POST /api/ai/chat { stream: true } (raw text/plain
 * stream read via response.body) - chosen as a lightweight approach
 * given the time budget instead of adding the Vercel AI SDK.
 *
 * Voice input/output: browser-native Web Speech API only (no cloud STT/
 * TTS, no new dependency) - feature-detected, mic button hidden if
 * unsupported (e.g. Firefox).
 */
export function AiChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId, stream: true }),
      });

      const newConversationId = res.headers.get("X-Conversation-Id");
      if (newConversationId) setConversationId(newConversationId);

      if (!res.body) throw new Error("No response stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: full } : m)));
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: "เกิดข้อผิดพลาดในการเชื่อมต่อ AI กรุณาลองใหม่อีกครั้ง" } : m))
      );
    } finally {
      setLoading(false);
    }
  }

  function handleVoiceInput() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = new Ctor();
    recognition.lang = "th-TH";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  function speak(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "th-TH";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith("text/") || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      const text = await file.text();
      sendMessage(`ไฟล์ที่แนบมา (${file.name}):\n\n${text.slice(0, 8000)}\n\nโปรดช่วยวิเคราะห์เนื้อหาไฟล์นี้`);
    } else {
      sendMessage(`[แนบไฟล์: ${file.name} - การวิเคราะห์รูปภาพยังไม่รองรับในหน้าแชทนี้ รองรับเฉพาะไฟล์ข้อความ .txt/.md]`);
    }
    e.target.value = "";
  }

  return (
    <Card>
      <CardContent className="p-0 flex flex-col h-[560px]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-12">
              <p>เริ่มสนทนากับ AI ผู้ช่วยอัจฉริยะ เช่น &quot;สรุปนักเรียนที่มีความเสี่ยงวันนี้&quot;</p>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                )}
              >
                {m.content || (loading && m.role === "assistant" ? <Loader2 className="h-4 w-4 animate-spin" /> : "")}
                {m.role === "assistant" && m.content && (
                  <button onClick={() => speak(m.content)} className="ml-2 inline-flex align-middle text-muted-foreground hover:text-foreground" title="อ่านออกเสียง">
                    <Volume2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border/60 p-3 flex items-end gap-2">
          <input ref={fileInputRef} type="file" accept=".txt,.md,text/plain" className="hidden" onChange={handleFileUpload} />
          <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} title="แนบไฟล์ข้อความ">
            <Paperclip className="h-4 w-4" />
          </Button>
          {isVoiceSupported() && (
            <Button type="button" variant={listening ? "default" : "outline"} size="icon" onClick={handleVoiceInput} title="พูดสั่งงาน (ภาษาไทย)">
              <Mic className="h-4 w-4" />
            </Button>
          )}
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="พิมพ์ข้อความถึง AI ผู้ช่วย..."
            className="min-h-[44px] max-h-32 resize-none"
          />
          <Button type="button" onClick={() => sendMessage(input)} disabled={loading || !input.trim()} size="icon">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

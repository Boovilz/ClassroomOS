"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Send } from "lucide-react";

interface MessageRow {
  id: string;
  thread_id: string;
  sender_user_id: string | null;
  sender_parent_id: string | null;
  body: string;
  is_quick_reply: boolean;
  created_at: string;
  message_attachments?: { id: string; file_url: string; file_type: string; file_name: string | null }[];
}

interface ThreadRow {
  id: string;
  thread_type: "direct" | "class_group" | "broadcast";
  title: string | null;
  classroom: string | null;
  updated_at: string;
}

const threadTypeLabel: Record<string, string> = {
  direct: "ส่วนตัว",
  class_group: "กลุ่มห้องเรียน",
  broadcast: "ประกาศกว้าง",
};

const QUICK_REPLIES = ["รับทราบค่ะ/ครับ", "ขอบคุณค่ะ/ครับ", "จะติดตามให้นะคะ/ครับ", "ขอสอบถามเพิ่มเติม"];

export function ChatPanel({
  schoolId,
  userId,
  threads,
  initialMessages,
  initialThreadId,
}: {
  schoolId: string;
  userId?: string;
  threads: ThreadRow[];
  initialMessages: MessageRow[];
  initialThreadId: string | null;
}) {
  const router = useRouter();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialThreadId);
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);

  async function openThread(threadId: string) {
    setActiveThreadId(threadId);
    setLoadingThread(true);
    try {
      const res = await fetch(`/api/messages?threadId=${threadId}`);
      const json = await res.json();
      if (json.success) setMessages(json.messages);
    } finally {
      setLoadingThread(false);
    }
  }

  async function handleSend(body: string, isQuickReply = false) {
    if (!activeThreadId || !body.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, threadId: activeThreadId, senderUserId: userId, body, isQuickReply }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setMessages((prev) => [...prev, json.message]);
      setText("");
      router.refresh();
    } catch (err) {
      toast.error("ส่งข้อความไม่สำเร็จ", { description: (err as Error).message });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="glass-card md:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">บทสนทนา</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {threads.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มีบทสนทนา</p>
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                onClick={() => openThread(t.id)}
                className={`flex w-full items-center justify-between rounded-lg border p-2 text-left text-sm transition ${
                  activeThreadId === t.id ? "border-primary bg-primary/5" : "border-border/60"
                }`}
              >
                <span className="truncate">{t.title ?? t.classroom ?? "สนทนาส่วนตัว"}</span>
                <Badge variant="secondary">{threadTypeLabel[t.thread_type]}</Badge>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="glass-card md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            ข้อความ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!activeThreadId ? (
            <p className="py-10 text-center text-sm text-muted-foreground">เลือกบทสนทนาทางด้านซ้าย</p>
          ) : (
            <>
              <div className="h-72 space-y-2 overflow-y-auto rounded-lg border border-border/60 p-3">
                {loadingThread ? (
                  <p className="text-center text-sm text-muted-foreground">กำลังโหลด...</p>
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground">ยังไม่มีข้อความในบทสนทนานี้</p>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className="rounded-md bg-muted/50 p-2 text-sm">
                      <p>{m.body}</p>
                      {m.is_quick_reply && (
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          ตอบกลับด่วน
                        </Badge>
                      )}
                      {m.message_attachments && m.message_attachments.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {m.message_attachments.map((a) => (
                            <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer" className="block text-xs text-primary underline">
                              {a.file_name ?? a.file_url}
                            </a>
                          ))}
                        </div>
                      )}
                      <p className="mt-1 text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString("th-TH")}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="flex flex-wrap gap-1">
                {QUICK_REPLIES.map((q) => (
                  <Button key={q} size="sm" variant="outline" disabled={sending} onClick={() => handleSend(q, true)}>
                    {q}
                  </Button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                หมายเหตุ: ปุ่มตอบกลับด่วนนี้เป็นข้อความสำเร็จรูปภายในระบบเท่านั้น ไม่ได้เชื่อมต่อกับ LINE Quick Reply API จริง
                และระบบยังไม่รองรับข้อความเสียง (voice message)
              </p>

              <div className="flex gap-2">
                <Input
                  placeholder="พิมพ์ข้อความ..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSend(text);
                  }}
                />
                <Button onClick={() => handleSend(text)} disabled={sending} className="gap-1">
                  <Send className="h-4 w-4" />
                  ส่ง
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface KbEntry {
  id: string;
  title: string;
  content: string;
  category: string;
}

/**
 * AI Knowledge Base admin + Q&A UI. RAG here means lexical retrieval
 * (Postgres full-text search / ILIKE over plain-text chunks), NOT vector
 * embeddings - see src/lib/queries/ai.ts searchKnowledgeBase().
 */
export function AiKnowledgeBasePanel() {
  const [entries, setEntries] = useState<KbEntry[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [adding, setAdding] = useState(false);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [asking, setAsking] = useState(false);

  async function loadEntries() {
    const res = await fetch("/api/ai/knowledge-base");
    const data = await res.json();
    if (data.success) setEntries(data.entries);
  }

  useEffect(() => {
    loadEntries();
  }, []);

  async function handleAdd() {
    if (!title || !content) return;
    setAdding(true);
    try {
      await fetch("/api/ai/knowledge-base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      setTitle("");
      setContent("");
      await loadEntries();
    } finally {
      setAdding(false);
    }
  }

  async function handleAsk() {
    if (!question) return;
    setAsking(true);
    setAnswer(null);
    try {
      const res = await fetch(`/api/ai/knowledge-base?q=${encodeURIComponent(question)}`);
      const data = await res.json();
      if (data.success) {
        setAnswer(data.answer);
        setSources(data.sources ?? []);
      }
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        ฐานความรู้นี้ใช้การค้นหาแบบ full-text search ของ PostgreSQL (lexical search) ไม่ใช่ vector embeddings — เหมาะสำหรับเอกสารนโยบาย/ระเบียบของโรงเรียนจำนวนไม่มาก
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ถาม-ตอบจากฐานความรู้</CardTitle>
            <CardDescription>ระบบค้นหาเอกสารที่เกี่ยวข้องแล้วให้ Claude ตอบโดยอ้างอิงเอกสารนั้น</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="เช่น ระเบียบการลาของนักเรียนเป็นอย่างไร" />
            <Button onClick={handleAsk} disabled={asking || !question} size="sm">
              {asking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              ค้นหาและถาม AI
            </Button>
            {answer && (
              <div className="rounded-lg border border-border/60 p-3 text-sm space-y-2">
                <p className="whitespace-pre-wrap">{answer}</p>
                {sources.length > 0 && <p className="text-xs text-muted-foreground">อ้างอิง: {sources.join(", ")}</p>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">เพิ่มเอกสาร/นโยบายใหม่</CardTitle>
            <CardDescription>เก็บเป็นข้อความล้วน (plain text chunk) สำหรับการค้นหา</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>ชื่อเอกสาร</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>เนื้อหา</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[100px]" />
            </div>
            <Button onClick={handleAdd} disabled={adding || !title || !content} size="sm">
              {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              เพิ่มเข้าฐานความรู้
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">เอกสารทั้งหมด ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {entries.length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีเอกสารในฐานความรู้</p>}
          {entries.map((e) => (
            <div key={e.id} className="rounded-lg border border-border/60 p-3 text-sm">
              <p className="font-medium">{e.title}</p>
              <p className="text-muted-foreground line-clamp-2">{e.content}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

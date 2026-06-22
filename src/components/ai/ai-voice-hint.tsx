"use client";

import { useEffect, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Browser-native Web Speech API support indicator. STT/TTS use
 * window.SpeechRecognition/webkitSpeechRecognition and
 * window.speechSynthesis - zero new dependencies, zero API keys, NOT a
 * cloud speech service. Firefox (and some browsers) lack
 * SpeechRecognition entirely, so this feature-detects and explains the
 * fallback instead of breaking.
 */
export function AiVoiceHint() {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    const hasRecognition = typeof window !== "undefined" && !!((window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);
    setSupported(hasRecognition);
  }, []);

  if (supported === null) return null;

  return (
    <Card className="border-border/60">
      <CardContent className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
        {supported ? <Mic className="h-4 w-4 text-emerald-600" /> : <MicOff className="h-4 w-4" />}
        {supported
          ? "รองรับการพูดสั่งงานด้วยเสียง (Web Speech API ของเบราว์เซอร์ - ภาษาไทย) กดไอคอนไมโครโฟนในกล่องแชทเพื่อใช้งาน"
          : "เบราว์เซอร์นี้ไม่รองรับการสั่งงานด้วยเสียง (Web Speech API) ใช้การพิมพ์ข้อความได้ตามปกติ"}
      </CardContent>
    </Card>
  );
}

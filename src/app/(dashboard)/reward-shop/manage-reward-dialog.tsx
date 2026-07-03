"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Upload, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";

export interface RewardItem {
  id: string;
  name: string;
  description: string | null;
  cost_coins: number;
  stock: number | null;
  image_url: string | null;
  is_active: boolean;
}

interface Props {
  schoolId: string;
  item?: RewardItem;
  trigger?: React.ReactNode;
}

export function ManageRewardDialog({ schoolId, item, trigger }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [costCoins, setCostCoins] = useState(String(item?.cost_coins ?? ""));
  const [stock, setStock] = useState(item?.stock != null ? String(item.stock) : "");
  const [imageUrl, setImageUrl] = useState(item?.image_url ?? "");
  const [isActive, setIsActive] = useState(item?.is_active ?? true);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(item?.image_url ?? "");

  function reset() {
    setName(item?.name ?? "");
    setDescription(item?.description ?? "");
    setCostCoins(String(item?.cost_coins ?? ""));
    setStock(item?.stock != null ? String(item.stock) : "");
    setImageUrl(item?.image_url ?? "");
    setIsActive(item?.is_active ?? true);
    setPreviewUrl(item?.image_url ?? "");
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `reward-images/${schoolId}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("reward-shop")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (upErr) {
        // Fallback: use a local object URL for preview only, store data URL
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          setImageUrl(dataUrl);
          setPreviewUrl(dataUrl);
        };
        reader.readAsDataURL(file);
        toast.warning("ไม่สามารถอัปโหลดได้ ใช้รูปภาพแบบ URL แทน");
        return;
      }

      const { data: urlData } = supabase.storage.from("reward-shop").getPublicUrl(path);
      setImageUrl(urlData.publicUrl);
      setPreviewUrl(urlData.publicUrl);
      toast.success("อัปโหลดรูปภาพสำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) { toast.error("กรุณากรอกชื่อรางวัล"); return; }
    if (!costCoins || isNaN(Number(costCoins))) { toast.error("กรุณากรอกราคาเหรียญ"); return; }

    setSaving(true);
    try {
      const payload = {
        school_id: schoolId,
        name: name.trim(),
        description: description.trim() || null,
        cost_coins: parseInt(costCoins),
        stock: stock ? parseInt(stock) : null,
        image_url: imageUrl || null,
        is_active: isActive,
      };

      const url = item ? `/api/reward-shop?id=${item.id}` : "/api/reward-shop";
      const method = item ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "บันทึกไม่สำเร็จ");

      toast.success(item ? "แก้ไขรางวัลสำเร็จ" : "เพิ่มรางวัลสำเร็จ");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            เพิ่มรางวัล
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? "แก้ไขรางวัล" : "เพิ่มรางวัลใหม่"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Image */}
          <div className="space-y-2">
            <Label>รูปรางวัล</Label>
            <div
              className="relative flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 transition hover:bg-muted/50"
              onClick={() => fileRef.current?.click()}
            >
              {previewUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="preview" className="h-full w-full rounded-xl object-contain p-2" />
                  <button
                    type="button"
                    className="absolute right-2 top-2 rounded-full bg-background/80 p-1 hover:bg-background"
                    onClick={(e) => { e.stopPropagation(); setImageUrl(""); setPreviewUrl(""); }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <div className="text-center text-muted-foreground">
                  {uploading ? (
                    <p className="text-sm">กำลังอัปโหลด...</p>
                  ) : (
                    <>
                      <ImageIcon className="mx-auto mb-1 h-8 w-8 opacity-40" />
                      <p className="text-sm">คลิกเพื่ออัปโหลดรูปภาพ</p>
                      <p className="text-xs opacity-60">PNG, JPG, WEBP</p>
                    </>
                  )}
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
            />
            <div className="flex items-center gap-2">
              <Upload className="h-3 w-3 text-muted-foreground shrink-0" />
              <Input
                placeholder="หรือวาง URL รูปภาพที่นี่"
                value={imageUrl.startsWith("data:") ? "" : imageUrl}
                onChange={(e) => { setImageUrl(e.target.value); setPreviewUrl(e.target.value); }}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label>ชื่อรางวัล <span className="text-destructive">*</span></Label>
            <Input placeholder="เช่น ดินสอสี 12 แท่ง" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>คำอธิบาย</Label>
            <Textarea placeholder="รายละเอียดของรางวัล" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Cost */}
            <div className="space-y-1.5">
              <Label>ราคา (เหรียญ) <span className="text-destructive">*</span></Label>
              <Input type="number" min={1} placeholder="50" value={costCoins} onChange={(e) => setCostCoins(e.target.value)} />
            </div>
            {/* Stock */}
            <div className="space-y-1.5">
              <Label>จำนวนคงเหลือ</Label>
              <Input type="number" min={0} placeholder="ไม่จำกัด" value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
          </div>

          {/* Active */}
          <div className="flex items-center gap-3">
            <Switch id="is-active" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="is-active">เปิดให้แลก</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>ยกเลิก</Button>
          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving ? "กำลังบันทึก..." : item ? "บันทึก" : "เพิ่มรางวัล"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { levelRatingLabel, type LevelRating } from "@/lib/queries/welfare-constants";

interface HouseholdProfileFormProps {
  schoolId: string;
  studentId: string;
  initial: {
    housing_ownership: string | null;
    utilities_access: boolean | null;
    housing_quality: string | null;
    sleeping_arrangement: string | null;
    study_environment: string | null;
    electricity_water_access: string | null;
    sanitation_condition: string | null;
    safety_condition: string | null;
    family_size: number | null;
    household_assets: string | null;
    government_assistance_received: string | null;
    notes: string | null;
  } | null;
}

const ownershipLabel: Record<string, string> = {
  owned: "เป็นเจ้าของ",
  rented: "เช่า",
  relative_owned: "อาศัยญาติ",
  temporary: "ที่พักชั่วคราว",
  homeless: "ไร้ที่อยู่อาศัย",
};

const levelOptions: LevelRating[] = ["excellent", "good", "fair", "needs_support"];

function LevelSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="เลือกระดับ" />
        </SelectTrigger>
        <SelectContent>
          {levelOptions.map((lvl) => (
            <SelectItem key={lvl} value={lvl}>
              {levelRatingLabel[lvl]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function HouseholdProfileForm({ schoolId, studentId, initial }: HouseholdProfileFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [housingOwnership, setHousingOwnership] = useState(initial?.housing_ownership ?? "");
  const [housingQuality, setHousingQuality] = useState(initial?.housing_quality ?? "");
  const [sleepingArrangement, setSleepingArrangement] = useState(initial?.sleeping_arrangement ?? "");
  const [studyEnvironment, setStudyEnvironment] = useState(initial?.study_environment ?? "");
  const [electricityWaterAccess, setElectricityWaterAccess] = useState(initial?.electricity_water_access ?? "");
  const [sanitationCondition, setSanitationCondition] = useState(initial?.sanitation_condition ?? "");
  const [safetyCondition, setSafetyCondition] = useState(initial?.safety_condition ?? "");
  const [familySize, setFamilySize] = useState(initial?.family_size?.toString() ?? "");
  const [householdAssets, setHouseholdAssets] = useState(initial?.household_assets ?? "");
  const [governmentAssistance, setGovernmentAssistance] = useState(initial?.government_assistance_received ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  async function handleSave() {
    setIsSubmitting(true);
    const res = await fetch(`/api/households/${studentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schoolId,
        housingOwnership: housingOwnership || undefined,
        housingQuality: housingQuality || undefined,
        sleepingArrangement: sleepingArrangement || undefined,
        studyEnvironment: studyEnvironment || undefined,
        electricityWaterAccess: electricityWaterAccess || undefined,
        sanitationCondition: sanitationCondition || undefined,
        safetyCondition: safetyCondition || undefined,
        familySize: familySize ? Number(familySize) : undefined,
        householdAssets: householdAssets.trim() || undefined,
        governmentAssistanceReceived: governmentAssistance.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    });
    const json = await res.json();
    setIsSubmitting(false);
    if (!json.success) {
      toast.error("บันทึกไม่สำเร็จ", { description: json.message });
      return;
    }
    toast.success("บันทึกข้อมูลครัวเรือนสำเร็จ");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>ลักษณะการเป็นเจ้าของที่อยู่อาศัย</Label>
          <Select value={housingOwnership} onValueChange={setHousingOwnership}>
            <SelectTrigger>
              <SelectValue placeholder="เลือก" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ownershipLabel).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>จำนวนสมาชิกในครัวเรือน</Label>
          <Input type="number" value={familySize} onChange={(e) => setFamilySize(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <LevelSelect label="คุณภาพที่อยู่อาศัย" value={housingQuality} onChange={setHousingQuality} />
        <LevelSelect label="การจัดที่นอน" value={sleepingArrangement} onChange={setSleepingArrangement} />
        <LevelSelect label="สภาพแวดล้อมการเรียน" value={studyEnvironment} onChange={setStudyEnvironment} />
        <LevelSelect label="ไฟฟ้า/น้ำประปา" value={electricityWaterAccess} onChange={setElectricityWaterAccess} />
        <LevelSelect label="สุขอนามัย" value={sanitationCondition} onChange={setSanitationCondition} />
        <LevelSelect label="ความปลอดภัย" value={safetyCondition} onChange={setSafetyCondition} />
      </div>

      <div className="space-y-1.5">
        <Label>ทรัพย์สินในครัวเรือน</Label>
        <Textarea value={householdAssets} onChange={(e) => setHouseholdAssets(e.target.value)} rows={2} />
      </div>
      <div className="space-y-1.5">
        <Label>สวัสดิการที่ได้รับจากรัฐ</Label>
        <Textarea value={governmentAssistance} onChange={(e) => setGovernmentAssistance(e.target.value)} rows={2} />
      </div>
      <div className="space-y-1.5">
        <Label>หมายเหตุ</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      <Button onClick={handleSave} disabled={isSubmitting}>
        {isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูลครัวเรือน"}
      </Button>
    </div>
  );
}

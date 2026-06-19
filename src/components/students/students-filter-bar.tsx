"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

interface FilterOption {
  value: string;
  label: string;
}

const statusOptions: FilterOption[] = [
  { value: "active", label: "กำลังศึกษา" },
  { value: "archived", label: "เก็บถาวร" },
];

const riskOptions: FilterOption[] = [
  { value: "low", label: "ความเสี่ยงต่ำ" },
  { value: "medium", label: "ความเสี่ยงปานกลาง" },
  { value: "high", label: "ความเสี่ยงสูง" },
];

const genderOptions: FilterOption[] = [
  { value: "male", label: "ชาย" },
  { value: "female", label: "หญิง" },
  { value: "other", label: "อื่นๆ" },
];

const sortOptions: FilterOption[] = [
  { value: "student_code", label: "รหัสนักเรียน" },
  { value: "name", label: "ชื่อ" },
  { value: "gpa", label: "เกรดเฉลี่ย" },
  { value: "attendance", label: "อัตราการเข้าเรียน" },
];

const directionOptions: FilterOption[] = [
  { value: "asc", label: "น้อยไปมาก" },
  { value: "desc", label: "มากไปน้อย" },
];

export function StudentsFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  function FilterGroup({
    label,
    paramKey,
    options,
    defaultValue,
  }: {
    label: string;
    paramKey: string;
    options: FilterOption[];
    defaultValue?: string;
  }) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <Select value={searchParams.get(paramKey) ?? defaultValue ?? ALL} onValueChange={(v) => setParam(paramKey, v)}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="ทั้งหมด" />
          </SelectTrigger>
          <SelectContent>
            {!defaultValue && <SelectItem value={ALL}>ทั้งหมด</SelectItem>}
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="glass-card flex flex-wrap items-center gap-4 rounded-2xl p-4">
      <FilterGroup label="สถานะ" paramKey="status" options={statusOptions} />
      <FilterGroup label="ระดับความเสี่ยง" paramKey="risk" options={riskOptions} />
      <FilterGroup label="เพศ" paramKey="gender" options={genderOptions} />
      <FilterGroup label="เรียงตาม" paramKey="sort" options={sortOptions} defaultValue="student_code" />
      <FilterGroup label="ลำดับ" paramKey="direction" options={directionOptions} defaultValue="asc" />
    </div>
  );
}

export interface LevelTier {
  level: number;
  name: string;
  minXp: number;
}

export const LEVEL_TIERS: LevelTier[] = [
  { level: 1, name: "ผู้เริ่มต้น", minXp: 0 },
  { level: 2, name: "นักสำรวจ", minXp: 100 },
  { level: 3, name: "แชมป์", minXp: 250 },
  { level: 4, name: "ปรมาจารย์", minXp: 500 },
  { level: 5, name: "ตำนาน", minXp: 1000 },
  { level: 6, name: "ฮีโร่", minXp: 2000 },
  { level: 7, name: "ปรมาจารย์ใหญ่", minXp: 5000 },
];

export interface LevelInfo {
  level: number;
  name: string;
  xp: number;
  currentTierMinXp: number;
  nextTierMinXp: number | null;
  progressPercent: number;
}

export function getLevelInfo(xp: number): LevelInfo {
  let tier = LEVEL_TIERS[0];
  for (const t of LEVEL_TIERS) {
    if (xp >= t.minXp) tier = t;
  }
  const nextTier = LEVEL_TIERS.find((t) => t.minXp > tier.minXp);
  const progressPercent = nextTier
    ? Math.min(100, Math.round(((xp - tier.minXp) / (nextTier.minXp - tier.minXp)) * 100))
    : 100;

  return {
    level: tier.level,
    name: tier.name,
    xp,
    currentTierMinXp: tier.minXp,
    nextTierMinXp: nextTier?.minXp ?? null,
    progressPercent,
  };
}

export type ClassroomTier = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";

const CLASSROOM_TIERS: { tier: ClassroomTier; minXp: number }[] = [
  { tier: "Bronze", minXp: 0 },
  { tier: "Silver", minXp: 500 },
  { tier: "Gold", minXp: 1500 },
  { tier: "Platinum", minXp: 4000 },
  { tier: "Diamond", minXp: 10000 },
];

export function getClassroomTier(totalXp: number): ClassroomTier {
  let tier: ClassroomTier = "Bronze";
  for (const t of CLASSROOM_TIERS) {
    if (totalXp >= t.minXp) tier = t.tier;
  }
  return tier;
}

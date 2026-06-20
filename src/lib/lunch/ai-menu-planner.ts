// ============================================================================
// AI Menu Planner (rule-based, Thai-language; NOT an external LLM call)
//
// Pure/client-safe — extracted from src/lib/queries/lunch.ts so it can be
// used directly from "use client" components (e.g. for an instant preview)
// without pulling in the server-only Supabase client.
// ============================================================================

export interface AiMenuSuggestionDay {
  day: number;
  rice: string;
  soup: string;
  fruit: string;
  milk: string;
  estimatedCalories: number;
  estimatedCost: number;
}

const RICE_ROTATION = ["ข้าวผัดไก่", "ข้าวกะเพราหมูสับ", "ข้าวราดแกงเขียวหวาน", "ข้าวหมูทอดกระเทียม", "ข้าวไข่เจียวหมูสับ", "ข้าวต้มปลา", "ข้าวผัดกุ้ง"];
const SOUP_ROTATION = ["ต้มจืดเต้าหู้หมูสับ", "แกงจืดผักกาดขาว", "ต้มยำไก่", "แกงส้มผักรวม", "ต้มจืดมะระยัดไส้"];

/** Generates a rule-based weekly menu rotation respecting a per-student budget. */
export function generateAiMenuSuggestion(params: { days: number; budgetPerStudent: number }): {
  suggestions: AiMenuSuggestionDay[];
  notes: string[];
} {
  const notes: string[] = [];
  const suggestions: AiMenuSuggestionDay[] = [];

  for (let day = 0; day < params.days; day++) {
    const rice = RICE_ROTATION[day % RICE_ROTATION.length];
    const soup = SOUP_ROTATION[day % SOUP_ROTATION.length];
    const estimatedCalories = 520 + (day % 3) * 30;
    const estimatedCost = Math.min(params.budgetPerStudent, 22 + (day % 4));
    suggestions.push({
      day: day + 1,
      rice,
      soup,
      fruit: "ผลไม้ตามฤดูกาล (กล้วย/ส้ม/แตงโม)",
      milk: "นมจืด UHT",
      estimatedCalories,
      estimatedCost,
    });
  }

  if (params.budgetPerStudent < 20) {
    notes.push("งบประมาณต่อนักเรียนค่อนข้างจำกัด แนะนำให้เน้นวัตถุดิบตามฤดูกาลและซื้อในปริมาณมากเพื่อลดต้นทุนต่อหน่วย");
  } else {
    notes.push("งบประมาณอยู่ในระดับที่เหมาะสม สามารถเพิ่มความหลากหลายของเมนูและจัดผลไม้/นมได้ครบทุกวัน");
  }
  notes.push("ควรหมุนเมนูข้าว/กับข้าวไม่ให้ซ้ำกันเกิน 1 ครั้งต่อสัปดาห์ เพื่อความหลากหลายทางโภชนาการ");

  return { suggestions, notes };
}

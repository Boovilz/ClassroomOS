import { createClient } from "@/lib/supabase/server";
import { generateQrToken, verifyQrToken } from "@/lib/qr/token";
import { getActiveAllergyMap } from "@/lib/queries/health";

// ============================================================================
// Helpers
// ============================================================================

async function getCurrentSchoolId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;
  const { data: profile } = await supabase.from("users").select("school_id").eq("id", auth.user.id).single();
  return profile?.school_id ?? null;
}

export const menuCategoryLabel: Record<string, string> = {
  rice: "อาหารจานข้าว",
  noodle: "อาหารเส้น",
  soup: "ซุป/แกง",
  dessert: "ของหวาน",
  fruit: "ผลไม้",
  milk: "นม",
};

export const eligibilityStatusLabel: Record<string, string> = {
  eligible: "มีสิทธิ์",
  not_eligible: "ไม่มีสิทธิ์",
  pending_review: "รอตรวจสอบ",
};

export const programTypeLabel: Record<string, string> = {
  free_lunch: "อาหารกลางวันฟรี",
  special_support: "โครงการช่วยเหลือพิเศษ",
  scholarship: "ทุนการศึกษา",
  paid: "ชำระเงินเอง",
};

// ============================================================================
// Lunch Dashboard
// ============================================================================

export interface LunchDashboardStats {
  totalStudents: number;
  studentsReceivingLunch: number;
  studentsAbsent: number;
  mealsDistributedToday: number;
  budgetBalance: number | null;
  lowStockCount: number;
  nearExpiryCount: number;
  nutritionAlertCount: number;
  specialDietCount: number;
}

export async function getLunchDashboard(): Promise<LunchDashboardStats> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [{ data: students }, { data: todayRecords }, { data: lunchFund }, { data: inventory }, { count: specialDietCount }] =
    await Promise.all([
      supabase.from("students").select("id").eq("is_active", true),
      supabase.from("meal_records").select("student_id, status, meal_type").eq("date", today),
      supabase.from("finance_accounts").select("balance").eq("account_type", "lunch_fund").maybeSingle(),
      supabase.from("food_inventory").select("quantity, reorder_level, expiration_date").eq("is_active", true),
      supabase.from("allergies").select("id", { count: "exact", head: true }).eq("is_active", true).eq("show_at_meal_distribution", true),
    ]);

  const lunchRecords = (todayRecords ?? []).filter((r) => r.meal_type === "lunch");
  const studentsReceivingLunch = lunchRecords.filter((r) => r.status === "served").length;
  const studentsAbsent = lunchRecords.filter((r) => r.status === "absent").length;
  const lowStockCount = (inventory ?? []).filter((i) => i.quantity <= i.reorder_level).length;
  const nearExpiryCount = (inventory ?? []).filter((i) => i.expiration_date && i.expiration_date <= soon && i.expiration_date >= today).length;

  return {
    totalStudents: students?.length ?? 0,
    studentsReceivingLunch,
    studentsAbsent,
    mealsDistributedToday: todayRecords?.filter((r) => r.status === "served").length ?? 0,
    budgetBalance: lunchFund?.balance ?? null,
    lowStockCount,
    nearExpiryCount,
    nutritionAlertCount: 0,
    specialDietCount: specialDietCount ?? 0,
  };
}

export interface MealParticipationPoint {
  date: string;
  served: number;
  absent: number;
}

export async function getMealParticipationTrend(days = 7): Promise<MealParticipationPoint[]> {
  const supabase = await createClient();
  const start = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data } = await supabase.from("meal_records").select("date, status").eq("meal_type", "lunch").gte("date", start);

  const byDate = new Map<string, { served: number; absent: number }>();
  for (const r of data ?? []) {
    const cur = byDate.get(r.date) ?? { served: 0, absent: 0 };
    if (r.status === "served") cur.served++;
    else if (r.status === "absent") cur.absent++;
    byDate.set(r.date, cur);
  }

  return Array.from(byDate.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ============================================================================
// Daily / Weekly Menu Management
// ============================================================================

export interface MenuItemInput {
  name: string;
  category: "rice" | "noodle" | "soup" | "dessert" | "fruit" | "milk";
  ingredients?: string;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  hasVegetables?: boolean;
  hasFruit?: boolean;
  hasMilk?: boolean;
  imageUrl?: string;
  costPerServing?: number;
}

export async function createMenu(params: {
  schoolId: string;
  name: string;
  menuDate: string;
  mealType?: "breakfast" | "lunch" | "snack";
  planScope?: "daily" | "weekly" | "monthly" | "semester";
  description?: string;
  imageUrl?: string;
  createdBy?: string;
  items: MenuItemInput[];
}) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("menus")
    .select("id")
    .eq("school_id", params.schoolId)
    .eq("menu_date", params.menuDate)
    .eq("meal_type", params.mealType ?? "lunch")
    .maybeSingle();
  if (existing) {
    throw new Error("มีเมนูสำหรับวันและประเภทอาหารนี้อยู่แล้ว กรุณาแก้ไขเมนูเดิมหรือเลือกวันอื่น");
  }

  const totalCalories = params.items.reduce((s, i) => s + (i.calories ?? 0), 0);
  const totalProtein = params.items.reduce((s, i) => s + (i.proteinG ?? 0), 0);
  const totalCarbs = params.items.reduce((s, i) => s + (i.carbsG ?? 0), 0);
  const totalFat = params.items.reduce((s, i) => s + (i.fatG ?? 0), 0);
  const estimatedCost = params.items.reduce((s, i) => s + (i.costPerServing ?? 0), 0);

  const { data: menu, error } = await supabase
    .from("menus")
    .insert({
      school_id: params.schoolId,
      name: params.name,
      menu_date: params.menuDate,
      meal_type: params.mealType ?? "lunch",
      plan_scope: params.planScope ?? "daily",
      description: params.description ?? null,
      image_url: params.imageUrl ?? null,
      total_calories: totalCalories,
      total_protein_g: totalProtein,
      total_carbs_g: totalCarbs,
      total_fat_g: totalFat,
      estimated_cost_per_student: estimatedCost,
      created_by: params.createdBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  if (params.items.length > 0) {
    await supabase.from("menu_items").insert(
      params.items.map((item, idx) => ({
        school_id: params.schoolId,
        menu_id: menu.id,
        name: item.name,
        category: item.category,
        ingredients: item.ingredients ?? null,
        calories: item.calories ?? null,
        protein_g: item.proteinG ?? null,
        carbs_g: item.carbsG ?? null,
        fat_g: item.fatG ?? null,
        has_vegetables: item.hasVegetables ?? false,
        has_fruit: item.hasFruit ?? false,
        has_milk: item.hasMilk ?? false,
        image_url: item.imageUrl ?? null,
        cost_per_serving: item.costPerServing ?? null,
        sort_order: idx,
      }))
    );
  }

  return menu;
}

export async function publishMenu(menuId: string) {
  const supabase = await createClient();
  await supabase.from("menus").update({ status: "published" }).eq("id", menuId);
}

export async function getMenuWithItems(menuId: string) {
  const supabase = await createClient();
  const [{ data: menu }, { data: items }] = await Promise.all([
    supabase.from("menus").select("*").eq("id", menuId).maybeSingle(),
    supabase.from("menu_items").select("*").eq("menu_id", menuId).order("sort_order"),
  ]);
  return { menu: menu ?? null, items: items ?? [] };
}

export async function getMenuByDate(schoolId: string, date: string, mealType: "breakfast" | "lunch" | "snack" = "lunch") {
  const supabase = await createClient();
  const { data: menu } = await supabase
    .from("menus")
    .select("*")
    .eq("school_id", schoolId)
    .eq("menu_date", date)
    .eq("meal_type", mealType)
    .maybeSingle();
  if (!menu) return { menu: null, items: [] };
  const { data: items } = await supabase.from("menu_items").select("*").eq("menu_id", menu.id).order("sort_order");
  return { menu, items: items ?? [] };
}

export async function getWeeklyMenus(schoolId: string, startDate: string) {
  const supabase = await createClient();
  const endDate = new Date(new Date(startDate).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: menus } = await supabase
    .from("menus")
    .select("*, menu_items(*)")
    .eq("school_id", schoolId)
    .gte("menu_date", startDate)
    .lte("menu_date", endDate)
    .order("menu_date");
  return menus ?? [];
}

export async function deleteMenu(menuId: string) {
  const supabase = await createClient();
  await supabase.from("menus").delete().eq("id", menuId);
}

export async function reorderMenuItems(menuId: string, orderedItemIds: string[]) {
  const supabase = await createClient();
  await Promise.all(
    orderedItemIds.map((id, idx) => supabase.from("menu_items").update({ sort_order: idx }).eq("id", id).eq("menu_id", menuId))
  );
}

// ============================================================================
// Student Meal Eligibility
// ============================================================================

export async function setMealEligibility(params: {
  schoolId: string;
  studentId: string;
  programType?: "free_lunch" | "special_support" | "scholarship" | "paid";
  status?: "eligible" | "not_eligible" | "pending_review";
  mealRestrictions?: string;
  reviewedBy?: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meal_eligibility")
    .upsert(
      {
        school_id: params.schoolId,
        student_id: params.studentId,
        program_type: params.programType ?? "free_lunch",
        status: params.status ?? "pending_review",
        meal_restrictions: params.mealRestrictions ?? null,
        reviewed_by: params.reviewedBy ?? null,
        reviewed_at: params.status && params.status !== "pending_review" ? new Date().toISOString() : null,
        notes: params.notes ?? null,
      },
      { onConflict: "school_id,student_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getEligibilityList(schoolId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("meal_eligibility")
    .select("*, students(full_name, student_code, classroom, grade)")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getStudentEligibility(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("meal_eligibility").select("*").eq("student_id", studentId).maybeSingle();
  return data ?? null;
}

// ============================================================================
// QR Food Distribution (reuses Module 3's QR token generate/verify pipeline)
// ============================================================================

export async function issueMealDistributionQrToken(studentId: string) {
  const { token, payload } = generateQrToken(studentId, 300);
  return { token, expiresAt: payload.expiresAt };
}

export interface MealDistributionResult {
  success: boolean;
  message: string;
  student?: { id: string; full_name: string; student_code: string; avatar_url: string | null };
  allergyWarnings?: { allergen: string; severity: string }[];
}

/**
 * Core QR scan -> meal distribution pipeline: verify token (or accept a raw
 * student_id / manual student selection) -> verify eligibility -> record
 * meal_records row -> return confirmation with allergy warnings.
 */
export async function distributeMeal(params: {
  schoolId: string;
  token?: string;
  studentId?: string;
  mealType?: "breakfast" | "lunch" | "snack";
  menuId?: string;
  distributedBy?: string;
  distributionMethod: "qr" | "student_id" | "manual";
}): Promise<MealDistributionResult> {
  const supabase = await createClient();
  let studentId = params.studentId;

  if (params.token) {
    const verification = verifyQrToken(params.token);
    if (!verification.valid) {
      return { success: false, message: verification.reason === "expired" ? "QR หมดอายุ กรุณาสร้างใหม่" : "QR ไม่ถูกต้อง" };
    }
    studentId = verification.payload.studentId;
  }

  if (!studentId) {
    return { success: false, message: "ไม่พบรหัสนักเรียน" };
  }

  const { data: student } = await supabase
    .from("students")
    .select("id, school_id, full_name, student_code, avatar_url")
    .eq("id", studentId)
    .single();
  if (!student) {
    return { success: false, message: "ไม่พบข้อมูลนักเรียน" };
  }

  const mealType = params.mealType ?? "lunch";
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("meal_records")
    .select("id")
    .eq("student_id", student.id)
    .eq("date", today)
    .eq("meal_type", mealType)
    .maybeSingle();
  if (existing) {
    return {
      success: false,
      message: "นักเรียนรับอาหารไปแล้ววันนี้",
      student: { id: student.id, full_name: student.full_name, student_code: student.student_code, avatar_url: student.avatar_url },
    };
  }

  const eligibility = await getStudentEligibility(student.id);
  if (eligibility && eligibility.status === "not_eligible") {
    return {
      success: false,
      message: "นักเรียนไม่มีสิทธิ์รับอาหารกลางวันตามข้อมูลที่บันทึกไว้",
      student: { id: student.id, full_name: student.full_name, student_code: student.student_code, avatar_url: student.avatar_url },
    };
  }

  const { data: menu } = params.menuId
    ? await supabase.from("menus").select("estimated_cost_per_student").eq("id", params.menuId).maybeSingle()
    : { data: null };

  await supabase.from("meal_records").insert({
    school_id: params.schoolId,
    student_id: student.id,
    date: today,
    meal_type: mealType,
    status: "served",
    menu_id: params.menuId ?? null,
    distribution_method: params.distributionMethod,
    distributed_by: params.distributedBy ?? null,
    eligibility_status_snapshot: eligibility?.status ?? null,
    cost: menu?.estimated_cost_per_student ?? null,
  });

  const allergyMap = await getActiveAllergyMap([student.id]);
  const allergyWarnings = allergyMap.get(student.id) ?? [];

  return {
    success: true,
    message: "บันทึกการรับอาหารสำเร็จ",
    student: { id: student.id, full_name: student.full_name, student_code: student.student_code, avatar_url: student.avatar_url },
    allergyWarnings,
  };
}

// ============================================================================
// Special Diet Management (reuses allergies table, extended with diet_label)
// ============================================================================

export const specialDietPresets = [
  { allergyType: "food" as const, allergen: "ถั่วลิสง", dietLabel: "Peanut Allergy" },
  { allergyType: "food" as const, allergen: "นม", dietLabel: "Milk Allergy" },
  { allergyType: "religious" as const, allergen: "เนื้อสัตว์ทุกชนิด", dietLabel: "Vegetarian" },
  { allergyType: "religious" as const, allergen: "หมู/แอลกอฮอล์", dietLabel: "Halal" },
  { allergyType: "medical_diet" as const, allergen: "น้ำตาล", dietLabel: "Low Sugar" },
  { allergyType: "medical_diet" as const, allergen: "เกลือ/โซเดียม", dietLabel: "Low Sodium" },
];

export async function addSpecialDiet(params: {
  schoolId: string;
  studentId: string;
  allergyType: "food" | "drug" | "environmental" | "religious" | "medical_diet" | "nutrition_plan";
  allergen: string;
  dietLabel?: string;
  severity?: "mild" | "moderate" | "severe" | "life_threatening";
  emergencyInstructions?: string;
  recordedBy?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("allergies")
    .insert({
      school_id: params.schoolId,
      student_id: params.studentId,
      allergy_type: params.allergyType,
      allergen: params.allergen,
      diet_label: params.dietLabel ?? null,
      severity: params.severity ?? "mild",
      emergency_instructions: params.emergencyInstructions ?? null,
      recorded_by: params.recordedBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getSpecialDietList(schoolId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("allergies")
    .select("*, students(full_name, student_code, classroom)")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  return data ?? [];
}

// ============================================================================
// Ingredient Inventory + Stock Management
// ============================================================================

export async function addInventoryItem(params: {
  schoolId: string;
  itemName: string;
  category?: "ingredient" | "supply" | "kitchen_material";
  quantity?: number;
  unit?: string;
  reorderLevel?: number;
  purchaseDate?: string;
  expirationDate?: string;
  supplierId?: string;
  unitCost?: number;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("food_inventory")
    .insert({
      school_id: params.schoolId,
      item_name: params.itemName,
      category: params.category ?? "ingredient",
      quantity: params.quantity ?? 0,
      unit: params.unit ?? "kg",
      reorder_level: params.reorderLevel ?? 0,
      purchase_date: params.purchaseDate ?? null,
      expiration_date: params.expirationDate ?? null,
      supplier_id: params.supplierId ?? null,
      unit_cost: params.unitCost ?? null,
      notes: params.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  if (params.quantity && params.quantity > 0) {
    await supabase.from("inventory_transactions").insert({
      school_id: params.schoolId,
      inventory_id: data.id,
      txn_type: "add",
      quantity_change: params.quantity,
      quantity_after: params.quantity,
      reason: "เพิ่มสต็อกเริ่มต้น",
    });
  }

  return data;
}

export async function adjustStock(params: {
  schoolId: string;
  inventoryId: string;
  txnType: "add" | "remove" | "adjust" | "transfer" | "audit";
  quantityChange: number;
  reason?: string;
  recordedBy?: string;
}) {
  const supabase = await createClient();
  const { data: item } = await supabase.from("food_inventory").select("quantity").eq("id", params.inventoryId).single();
  if (!item) throw new Error("ไม่พบรายการวัตถุดิบ");

  const quantityAfter = Math.max(0, item.quantity + params.quantityChange);

  await supabase.from("food_inventory").update({ quantity: quantityAfter }).eq("id", params.inventoryId);
  const { data: txn, error } = await supabase
    .from("inventory_transactions")
    .insert({
      school_id: params.schoolId,
      inventory_id: params.inventoryId,
      txn_type: params.txnType,
      quantity_change: params.quantityChange,
      quantity_after: quantityAfter,
      reason: params.reason ?? null,
      recorded_by: params.recordedBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return txn;
}

export interface StockAlert {
  id: string;
  itemName: string;
  alertType: "low_stock" | "out_of_stock" | "near_expiry" | "expired";
  quantity: number;
  unit: string;
  expirationDate: string | null;
}

export async function getStockAlerts(schoolId: string): Promise<StockAlert[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: items } = await supabase.from("food_inventory").select("*").eq("school_id", schoolId).eq("is_active", true);

  const alerts: StockAlert[] = [];
  for (const item of items ?? []) {
    if (item.quantity <= 0) {
      alerts.push({ id: item.id, itemName: item.item_name, alertType: "out_of_stock", quantity: item.quantity, unit: item.unit, expirationDate: item.expiration_date });
    } else if (item.quantity <= item.reorder_level) {
      alerts.push({ id: item.id, itemName: item.item_name, alertType: "low_stock", quantity: item.quantity, unit: item.unit, expirationDate: item.expiration_date });
    }
    if (item.expiration_date) {
      if (item.expiration_date < today) {
        alerts.push({ id: item.id, itemName: item.item_name, alertType: "expired", quantity: item.quantity, unit: item.unit, expirationDate: item.expiration_date });
      } else if (item.expiration_date <= soon) {
        alerts.push({ id: item.id, itemName: item.item_name, alertType: "near_expiry", quantity: item.quantity, unit: item.unit, expirationDate: item.expiration_date });
      }
    }
  }
  return alerts;
}

export async function getInventoryList(schoolId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("food_inventory")
    .select("*, food_suppliers(name)")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .order("item_name");
  return data ?? [];
}

// ============================================================================
// Food Cost Management (reuses finance_accounts / finance_expenses)
// ============================================================================

export interface FoodCostSummary {
  dailyCost: number;
  weeklyCost: number;
  monthlyCost: number;
  costPerStudent: number;
  costPerMeal: number;
  budgetRemaining: number | null;
}

export async function getFoodCostSummary(schoolId: string): Promise<FoodCostSummary> {
  const supabase = await createClient();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const weekStart = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);

  const [{ data: dailyRecords }, { data: weeklyRecords }, { data: monthlyRecords }, { data: lunchFund }] = await Promise.all([
    supabase.from("meal_records").select("cost, student_id").eq("date", todayStr).eq("status", "served"),
    supabase.from("meal_records").select("cost").gte("date", weekStart).eq("status", "served"),
    supabase.from("meal_records").select("cost").gte("date", monthStart).eq("status", "served"),
    supabase.from("finance_accounts").select("balance").eq("account_type", "lunch_fund").maybeSingle(),
  ]);

  const sum = (rows: { cost: number | null }[] | null) => (rows ?? []).reduce((s, r) => s + (r.cost ?? 0), 0);
  const dailyCost = sum(dailyRecords);
  const studentCount = new Set((dailyRecords ?? []).map((r) => r.student_id)).size;

  return {
    dailyCost,
    weeklyCost: sum(weeklyRecords),
    monthlyCost: sum(monthlyRecords),
    costPerStudent: studentCount > 0 ? Math.round((dailyCost / studentCount) * 100) / 100 : 0,
    costPerMeal: (dailyRecords?.length ?? 0) > 0 ? Math.round((dailyCost / (dailyRecords?.length ?? 1)) * 100) / 100 : 0,
    budgetRemaining: lunchFund?.balance ?? null,
  };
}

// ============================================================================
// Nutrition Analysis (simplified, illustrative Thai-relevant reference values
// — not a medical/clinical standard)
// ============================================================================

/** Simplified daily reference values for school-age children (illustrative only). */
const NUTRITION_REFERENCE = {
  caloriesMin: 1600,
  caloriesMax: 2000,
  proteinMinG: 35,
  carbsMinG: 130,
  fatMaxG: 65,
};

export interface NutritionAnalysisResult {
  menuId: string;
  menuName: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  meetsCalorieTarget: boolean;
  meetsProteinTarget: boolean;
  fatWithinLimit: boolean;
  insights: string[];
}

export async function getNutritionAnalysis(menuId: string): Promise<NutritionAnalysisResult> {
  const { menu, items } = await getMenuWithItems(menuId);
  if (!menu) throw new Error("ไม่พบเมนู");

  const calories = items.reduce((s, i) => s + (i.calories ?? 0), 0);
  const proteinG = items.reduce((s, i) => s + (i.protein_g ?? 0), 0);
  const carbsG = items.reduce((s, i) => s + (i.carbs_g ?? 0), 0);
  const fatG = items.reduce((s, i) => s + (i.fat_g ?? 0), 0);

  const insights: string[] = [];
  const meetsCalorieTarget = calories >= NUTRITION_REFERENCE.caloriesMin * 0.3 && calories <= NUTRITION_REFERENCE.caloriesMax * 0.5;
  const meetsProteinTarget = proteinG >= NUTRITION_REFERENCE.proteinMinG * 0.3;
  const fatWithinLimit = fatG <= NUTRITION_REFERENCE.fatMaxG * 0.5;

  if (!meetsProteinTarget) {
    insights.push("ปริมาณโปรตีนในเมนูนี้ต่ำกว่าเกณฑ์ที่แนะนำ ควรเพิ่มไข่ เนื้อสัตว์ หรือถั่วชนิดต่าง ๆ");
  }
  if (!meetsCalorieTarget && calories > 0) {
    insights.push(calories < NUTRITION_REFERENCE.caloriesMin * 0.3 ? "แคลอรี่รวมของเมนูนี้ค่อนข้างต่ำ ควรเพิ่มปริมาณอาหารจานหลัก" : "แคลอรี่รวมของเมนูนี้ค่อนข้างสูง ควรปรับสัดส่วนอาหารทอด/ของหวาน");
  }
  if (!fatWithinLimit) {
    insights.push("ปริมาณไขมันในเมนูนี้ค่อนข้างสูง ควรลดอาหารทอดหรือกะทิ และเพิ่มผัก/ผลไม้แทน");
  }
  const hasVeg = items.some((i) => i.has_vegetables);
  const hasFruit = items.some((i) => i.has_fruit);
  const hasMilk = items.some((i) => i.has_milk);
  if (!hasVeg) insights.push("เมนูนี้ยังไม่มีผัก ควรเพิ่มผักอย่างน้อย 1 รายการ");
  if (!hasFruit) insights.push("เมนูนี้ยังไม่มีผลไม้ ควรเพิ่มผลไม้เพื่อเสริมวิตามินและไฟเบอร์");
  if (!hasMilk) insights.push("เมนูนี้ยังไม่มีนม ควรพิจารณาจัดนมเสริมหลังอาหาร");
  if (insights.length === 0) insights.push("เมนูนี้มีความสมดุลทางโภชนาการอยู่ในเกณฑ์ดี");

  return {
    menuId: menu.id,
    menuName: menu.name,
    calories,
    proteinG,
    carbsG,
    fatG,
    meetsCalorieTarget,
    meetsProteinTarget,
    fatWithinLimit,
    insights,
  };
}

// ============================================================================
// BMI & Health Integration (calls into health.ts rather than recomputing BMI)
// ============================================================================

export async function getNutritionRecommendationForStudent(studentId: string) {
  const { getHealthProfile, nutritionStatusLabel } = await import("@/lib/queries/health");
  const profile = await getHealthProfile(studentId);
  const status = profile.latestRecord?.nutrition_status ?? null;

  const recommendations: string[] = [];
  if (!status) {
    recommendations.push("ยังไม่มีข้อมูลสุขภาพ (ส่วนสูง/น้ำหนัก) ควรบันทึกข้อมูลก่อนวางแผนโภชนาการ");
  } else if (status === "severely_underweight" || status === "underweight") {
    recommendations.push(`นักเรียนอยู่ในเกณฑ์ ${nutritionStatusLabel[status]} ควรเพิ่มอาหารพลังงานสูงและโปรตีน เช่น ไข่ นม เนื้อสัตว์ และตรวจสุขภาพเป็นระยะ`);
  } else if (status === "overweight" || status === "obese") {
    recommendations.push(`นักเรียนอยู่ในเกณฑ์ ${nutritionStatusLabel[status]} ควรลดอาหารทอด ของหวาน และเพิ่มผัก/ผลไม้ พร้อมส่งเสริมการออกกำลังกาย`);
  } else {
    recommendations.push("นักเรียนมีภาวะโภชนาการปกติ ควรรับประทานอาหารให้หลากหลายและครบ 5 หมู่ต่อไป");
  }

  return { profile, status, recommendations };
}

export async function getNutritionStatusBreakdownForLunchPlanning(schoolId: string) {
  const supabase = await createClient();
  const { data: students } = await supabase.from("students").select("id").eq("school_id", schoolId).eq("is_active", true);
  const { data: records } = await supabase
    .from("health_records")
    .select("student_id, nutrition_status, recorded_at")
    .order("recorded_at", { ascending: false });

  const latestByStudent = new Map<string, string | null>();
  for (const r of records ?? []) {
    if (!latestByStudent.has(r.student_id)) latestByStudent.set(r.student_id, r.nutrition_status);
  }

  const counts: Record<string, number> = { severely_underweight: 0, underweight: 0, normal: 0, overweight: 0, obese: 0, unknown: 0 };
  for (const s of students ?? []) {
    const status = latestByStudent.get(s.id) ?? "unknown";
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return counts;
}

// ============================================================================
// Meal Distribution Reports (computed on-demand, not stored)
// ============================================================================

export interface MealReportRow {
  date: string;
  served: number;
  absent: number;
  specialDiet: number;
  totalCost: number;
}

export async function getMealReport(schoolId: string, startDate: string, endDate: string): Promise<MealReportRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("meal_records")
    .select("date, status, cost")
    .eq("school_id", schoolId)
    .gte("date", startDate)
    .lte("date", endDate);

  const byDate = new Map<string, MealReportRow>();
  for (const r of data ?? []) {
    const row = byDate.get(r.date) ?? { date: r.date, served: 0, absent: 0, specialDiet: 0, totalCost: 0 };
    if (r.status === "served") row.served++;
    else if (r.status === "absent") row.absent++;
    else if (r.status === "special_diet") row.specialDiet++;
    row.totalCost += r.cost ?? 0;
    byDate.set(r.date, row);
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getStudentMealHistory(studentId: string, limit = 30) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("meal_records")
    .select("*, menus(name, meal_type)")
    .eq("student_id", studentId)
    .order("date", { ascending: false })
    .limit(limit);
  return data ?? [];
}

// ============================================================================
// Parent Portal
// ============================================================================

export async function getParentLunchSummary(studentId: string) {
  const supabase = await createClient();
  const { data: student } = await supabase.from("students").select("school_id").eq("id", studentId).single();
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [todayMenu, weeklyMenus, mealHistory, eligibility, specialDiets, nutrition] = await Promise.all([
    student ? getMenuByDate(student.school_id, today) : Promise.resolve({ menu: null, items: [] }),
    student ? getWeeklyMenus(student.school_id, weekStart) : Promise.resolve([]),
    getStudentMealHistory(studentId, 14),
    getStudentEligibility(studentId),
    getActiveAllergyMap([studentId]),
    getNutritionRecommendationForStudent(studentId),
  ]);

  return {
    todayMenu,
    weeklyMenus,
    mealHistory,
    eligibility,
    specialDiets: specialDiets.get(studentId) ?? [],
    nutrition,
  };
}

// ============================================================================
// Food Safety Management
// ============================================================================

export async function logFoodSafety(params: {
  schoolId: string;
  logType: "inspection" | "hygiene" | "equipment_maintenance" | "temperature" | "cleaning_schedule";
  subject: string;
  result?: "pass" | "fail" | "needs_attention";
  temperatureCelsius?: number;
  notes?: string;
  recordedBy?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("food_safety_logs")
    .insert({
      school_id: params.schoolId,
      log_type: params.logType,
      subject: params.subject,
      result: params.result ?? null,
      temperature_celsius: params.temperatureCelsius ?? null,
      notes: params.notes ?? null,
      recorded_by: params.recordedBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getFoodSafetyLogs(
  schoolId: string,
  logType?: "inspection" | "hygiene" | "equipment_maintenance" | "temperature" | "cleaning_schedule"
) {
  const supabase = await createClient();
  let query = supabase.from("food_safety_logs").select("*").eq("school_id", schoolId).order("log_date", { ascending: false });
  if (logType) query = query.eq("log_type", logType);
  const { data } = await query;
  return data ?? [];
}

// ============================================================================
// Procurement System
// ============================================================================

export async function addSupplier(params: { schoolId: string; name: string; contactName?: string; phone?: string; email?: string; address?: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("food_suppliers")
    .insert({
      school_id: params.schoolId,
      name: params.name,
      contact_name: params.contactName ?? null,
      phone: params.phone ?? null,
      email: params.email ?? null,
      address: params.address ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getSuppliers(schoolId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("food_suppliers").select("*").eq("school_id", schoolId).eq("is_active", true).order("name");
  return data ?? [];
}

export async function createPurchaseOrder(params: {
  schoolId: string;
  supplierId: string;
  itemSummary?: string;
  totalAmount: number;
  expectedDeliveryDate?: string;
  notes?: string;
  createdBy?: string;
}) {
  const supabase = await createClient();
  const orderNo = `PO-${Date.now().toString(36).toUpperCase()}`;
  const { data, error } = await supabase
    .from("purchase_orders")
    .insert({
      school_id: params.schoolId,
      supplier_id: params.supplierId,
      order_no: orderNo,
      item_summary: params.itemSummary ?? null,
      total_amount: params.totalAmount,
      expected_delivery_date: params.expectedDeliveryDate ?? null,
      notes: params.notes ?? null,
      created_by: params.createdBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePurchaseOrderStatus(orderId: string, status: "draft" | "ordered" | "delivered" | "invoiced" | "paid" | "cancelled") {
  const supabase = await createClient();
  const deliveredAt = status === "delivered" ? new Date().toISOString().slice(0, 10) : undefined;
  await supabase
    .from("purchase_orders")
    .update(deliveredAt ? { status, delivered_at: deliveredAt } : { status })
    .eq("id", orderId);
}

export async function getPurchaseOrders(schoolId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("purchase_orders")
    .select("*, food_suppliers(name)")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Vendor performance computed on-demand from purchase order history (no stored table). */
export async function getSupplierPerformance(schoolId: string) {
  const supabase = await createClient();
  const { data: suppliers } = await supabase.from("food_suppliers").select("id, name").eq("school_id", schoolId);
  const { data: orders } = await supabase
    .from("purchase_orders")
    .select("supplier_id, status, expected_delivery_date, delivered_at, total_amount")
    .eq("school_id", schoolId);

  return (suppliers ?? []).map((s) => {
    const supplierOrders = (orders ?? []).filter((o) => o.supplier_id === s.id);
    const delivered = supplierOrders.filter((o) => o.status === "delivered" || o.status === "invoiced" || o.status === "paid");
    const onTime = delivered.filter((o) => !o.expected_delivery_date || !o.delivered_at || o.delivered_at <= o.expected_delivery_date);
    return {
      supplierId: s.id,
      name: s.name,
      totalOrders: supplierOrders.length,
      totalSpend: supplierOrders.reduce((sum, o) => sum + (o.total_amount ?? 0), 0),
      onTimeRate: delivered.length > 0 ? Math.round((onTime.length / delivered.length) * 100) : null,
    };
  });
}

// ============================================================================
// AI Menu Planner (rule-based, Thai-language; NOT an external LLM call)
//
// The pure generator lives in src/lib/lunch/ai-menu-planner.ts (client-safe,
// no Supabase import) — re-exported here so server code can keep importing
// it from this query-layer file.
// ============================================================================

export { generateAiMenuSuggestion, type AiMenuSuggestionDay } from "@/lib/lunch/ai-menu-planner";

// ============================================================================
// AI Nutrition Analysis (rule-based, Thai-language insights)
// ============================================================================

export async function getAiNutritionAnalysis(schoolId: string): Promise<string[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [{ data: weekMenus }, costSummary, stockAlerts, nutritionBreakdown] = await Promise.all([
    supabase.from("menus").select("id, name, total_protein_g, total_calories").gte("menu_date", weekStart).lte("menu_date", today).eq("school_id", schoolId),
    getFoodCostSummary(schoolId),
    getStockAlerts(schoolId),
    getNutritionStatusBreakdownForLunchPlanning(schoolId),
  ]);

  const insights: string[] = [];
  const menus = weekMenus ?? [];

  if (menus.length === 0) {
    insights.push("ยังไม่มีการบันทึกเมนูในสัปดาห์นี้ ควรวางแผนเมนูล่วงหน้าเพื่อให้สามารถวิเคราะห์โภชนาการได้");
  } else {
    const avgProtein = menus.reduce((s, m) => s + (m.total_protein_g ?? 0), 0) / menus.length;
    if (avgProtein < 15) {
      insights.push("ปริมาณโปรตีนเฉลี่ยของเมนูในสัปดาห์นี้ค่อนข้างต่ำ ควรเพิ่มไข่ เนื้อสัตว์ หรือถั่วอย่างน้อยสัปดาห์ละ 2 ครั้ง");
    }
    const uniqueNames = new Set(menus.map((m) => m.name)).size;
    if (uniqueNames < menus.length * 0.7) {
      insights.push("เมนูในสัปดาห์นี้มีความซ้ำซ้อนค่อนข้างมาก ควรเพิ่มความหลากหลายของเมนูเพื่อกระตุ้นความอยากอาหารของนักเรียน");
    }
  }

  if (costSummary.budgetRemaining !== null && costSummary.weeklyCost > 0) {
    if (costSummary.budgetRemaining < costSummary.weeklyCost) {
      insights.push("งบประมาณกองทุนอาหารกลางวันคงเหลือต่ำกว่าค่าใช้จ่ายเฉลี่ยต่อสัปดาห์ ควรวางแผนจัดหางบประมาณเพิ่มเติมหรือปรับลดต้นทุนต่อมื้อ");
    } else {
      insights.push("การใช้จ่ายงบประมาณอาหารกลางวันยังอยู่ในเกณฑ์ที่ควบคุมได้");
    }
  }

  const expiredCount = stockAlerts.filter((a) => a.alertType === "expired").length;
  const lowStockCount = stockAlerts.filter((a) => a.alertType === "low_stock" || a.alertType === "out_of_stock").length;
  if (expiredCount > 0) insights.push(`พบวัตถุดิบหมดอายุ ${expiredCount} รายการ ควรตรวจสอบและจัดการคลังวัตถุดิบโดยเร็วเพื่อความปลอดภัยด้านอาหาร`);
  if (lowStockCount > 0) insights.push(`มีวัตถุดิบใกล้หมดหรือหมดสต็อก ${lowStockCount} รายการ ควรสั่งซื้อเพิ่มเติมล่วงหน้า`);

  const atRisk = (nutritionBreakdown.severely_underweight ?? 0) + (nutritionBreakdown.obese ?? 0);
  if (atRisk > 0) {
    insights.push(`มีนักเรียน ${atRisk} คนอยู่ในกลุ่มเสี่ยงด้านโภชนาการ (ผอมมาก/อ้วน) ควรประสานงานกับฝ่ายสุขภาพเพื่อวางแผนเมนูเฉพาะบุคคล`);
  }

  if (insights.length === 0) {
    insights.push("ภาพรวมด้านโภชนาการและงบประมาณอาหารกลางวันอยู่ในเกณฑ์ดี ไม่พบความเสี่ยงที่ชัดเจนในช่วงนี้");
  }

  return insights;
}

// ============================================================================
// Analytics Dashboard
// ============================================================================

export async function getLunchAnalytics(schoolId: string) {
  const [participationTrend, costSummary, dashboard, stockAlerts, nutritionBreakdown] = await Promise.all([
    getMealParticipationTrend(14),
    getFoodCostSummary(schoolId),
    getLunchDashboard(),
    getStockAlerts(schoolId),
    getNutritionStatusBreakdownForLunchPlanning(schoolId),
  ]);

  return { participationTrend, costSummary, dashboard, stockAlerts, nutritionBreakdown };
}

export interface ClassroomLunchComparisonRow {
  classroom: string;
  studentCount: number;
  servedCount: number;
  participationRate: number;
}

export async function getClassroomLunchComparison(schoolId: string): Promise<ClassroomLunchComparisonRow[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: students }, { data: records }] = await Promise.all([
    supabase.from("students").select("id, classroom").eq("school_id", schoolId).eq("is_active", true),
    supabase.from("meal_records").select("student_id").eq("school_id", schoolId).eq("date", today).eq("status", "served").eq("meal_type", "lunch"),
  ]);

  const servedSet = new Set((records ?? []).map((r) => r.student_id));
  const byClassroom = new Map<string, { total: number; served: number }>();
  for (const s of students ?? []) {
    const classroom = s.classroom ?? "ไม่ระบุ";
    const cur = byClassroom.get(classroom) ?? { total: 0, served: 0 };
    cur.total++;
    if (servedSet.has(s.id)) cur.served++;
    byClassroom.set(classroom, cur);
  }

  return Array.from(byClassroom.entries())
    .map(([classroom, v]) => ({
      classroom,
      studentCount: v.total,
      servedCount: v.served,
      participationRate: v.total > 0 ? Math.round((v.served / v.total) * 100) : 0,
    }))
    .sort((a, b) => a.classroom.localeCompare(b.classroom));
}

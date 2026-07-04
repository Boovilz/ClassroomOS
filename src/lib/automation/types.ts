// ── Trigger ────────────────────────────────────────────────────────────────
export type TriggerModule =
  | "attendance" | "grades" | "behavior" | "health" | "eq" | "sdq"
  | "home_visit" | "finance" | "calendar" | "documents" | "manual";

export interface TriggerDef {
  module: TriggerModule;
  event: string;
}

// ── Condition ──────────────────────────────────────────────────────────────
export type ConditionOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "not_contains";
export type LogicOperator = "AND" | "OR";

export interface Condition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: string | number;
  logic: LogicOperator;
}

// ── Action ─────────────────────────────────────────────────────────────────
export type ActionType =
  | "send_notification"
  | "add_behavior_points"
  | "add_coins"
  | "create_calendar_event"
  | "create_home_visit_task"
  | "webhook";

export interface ActionDef {
  id: string;
  type: ActionType;
  config: Record<string, string | number | boolean>;
}

// ── Workflow ───────────────────────────────────────────────────────────────
export interface Workflow {
  workflow_id: string;
  name: string;
  description: string;
  trigger: TriggerDef;
  conditions: Condition[];
  actions: ActionDef[];
  enabled: boolean;
  run_count: number;
  last_run_at: string | null;
  created_at: string;
}

// ── Execution Log ──────────────────────────────────────────────────────────
export interface ExecutionLog {
  log_id: string;
  workflow_id: string;
  workflow_name: string;
  status: "success" | "failed" | "skipped";
  trigger_data: Record<string, unknown>;
  action_results: { type: string; success: boolean; message: string }[];
  executed_at: string;
  duration_ms: number;
  error: string | null;
}

// ── Catalog ────────────────────────────────────────────────────────────────
export const TRIGGER_CATALOG: Record<TriggerModule, { label: string; icon: string; events: { event: string; label: string }[] }> = {
  attendance:  { label: "การเข้าเรียน",     icon: "📅", events: [{ event: "present", label: "มาเรียน" }, { event: "absent", label: "ขาดเรียน" }, { event: "late", label: "มาสาย" }, { event: "sick", label: "ลาป่วย" }] },
  grades:      { label: "ผลการเรียน",        icon: "📝", events: [{ event: "score_added", label: "เพิ่มคะแนน" }, { event: "score_low", label: "คะแนนต่ำกว่าเกณฑ์" }, { event: "score_high", label: "คะแนนสูงกว่าเกณฑ์" }] },
  behavior:    { label: "พฤติกรรม",          icon: "⭐", events: [{ event: "points_added", label: "เพิ่มคะแนน" }, { event: "points_deducted", label: "หักคะแนน" }, { event: "coins_earned", label: "ได้รับ Coins" }] },
  health:      { label: "สุขภาพ",            icon: "🏥", events: [{ event: "bmi_abnormal", label: "BMI ผิดปกติ" }, { event: "health_check", label: "ตรวจสุขภาพ" }, { event: "food_allergy", label: "แพ้อาหาร" }] },
  eq:          { label: "EQ",                icon: "🧠", events: [{ event: "assessment_done", label: "ประเมิน EQ เสร็จ" }, { event: "score_low", label: "คะแนน EQ ต่ำ" }] },
  sdq:         { label: "SDQ",               icon: "🔍", events: [{ event: "assessment_done", label: "ประเมิน SDQ เสร็จ" }, { event: "risk_found", label: "พบความเสี่ยง" }] },
  home_visit:  { label: "เยี่ยมบ้าน",        icon: "🏠", events: [{ event: "visit_done", label: "เยี่ยมบ้านเสร็จ" }] },
  finance:     { label: "การเงิน",            icon: "💰", events: [{ event: "deposit", label: "ฝากเงิน" }, { event: "withdraw", label: "ถอนเงิน" }] },
  calendar:    { label: "ปฏิทิน",            icon: "📆", events: [{ event: "event_start", label: "กิจกรรมเริ่ม" }, { event: "event_end", label: "กิจกรรมสิ้นสุด" }] },
  documents:   { label: "เอกสาร",            icon: "📄", events: [{ event: "created", label: "สร้างเอกสาร" }, { event: "approved", label: "อนุมัติเอกสาร" }] },
  manual:      { label: "กดปุ่ม (Manual)",    icon: "▶️", events: [{ event: "run", label: "กดปุ่ม Run" }] },
};

export const CONDITION_FIELDS = [
  { value: "grade",                 label: "ระดับชั้น" },
  { value: "classroom",             label: "ห้อง" },
  { value: "gender",                label: "เพศ" },
  { value: "consecutive_absences",  label: "ขาดเรียนต่อเนื่อง (วัน)" },
  { value: "score",                 label: "คะแนน" },
  { value: "coins",                 label: "Coins" },
  { value: "bmi",                   label: "BMI" },
  { value: "behavior_score",        label: "คะแนนพฤติกรรม" },
  { value: "sdq_risk_level",        label: "ระดับความเสี่ยง SDQ" },
  { value: "eq_total",              label: "คะแนน EQ รวม" },
];

export const CONDITION_OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: "eq",           label: "=" },
  { value: "neq",          label: "≠" },
  { value: "gt",           label: ">" },
  { value: "gte",          label: ">=" },
  { value: "lt",           label: "<" },
  { value: "lte",          label: "<=" },
  { value: "contains",     label: "มีค่า" },
  { value: "not_contains", label: "ไม่มีค่า" },
];

export const ACTION_CATALOG: Record<ActionType, { label: string; icon: string; fields: { key: string; label: string; type: "text" | "number" | "select"; options?: string[] }[] }> = {
  send_notification: {
    label: "แจ้งเตือน",
    icon: "🔔",
    fields: [
      { key: "target",   label: "ส่งถึง",      type: "select", options: ["teacher", "admin", "parent"] },
      { key: "title",    label: "หัวข้อ",       type: "text" },
      { key: "message",  label: "ข้อความ",      type: "text" },
      { key: "priority", label: "ความสำคัญ",    type: "select", options: ["low", "medium", "high", "critical"] },
    ],
  },
  add_behavior_points: {
    label: "เพิ่ม/หักคะแนนพฤติกรรม",
    icon: "⭐",
    fields: [
      { key: "points",   label: "คะแนน (ลบ = หัก)", type: "number" },
      { key: "reason",   label: "เหตุผล",            type: "text" },
    ],
  },
  add_coins: {
    label: "เพิ่ม/หัก Coins",
    icon: "🪙",
    fields: [
      { key: "coins",    label: "จำนวน Coins (ลบ = หัก)", type: "number" },
      { key: "reason",   label: "เหตุผล",                  type: "text" },
    ],
  },
  create_calendar_event: {
    label: "สร้างกิจกรรมในปฏิทิน",
    icon: "📆",
    fields: [
      { key: "title",      label: "ชื่อกิจกรรม",  type: "text" },
      { key: "event_type", label: "ประเภท",        type: "select", options: ["activity", "exam", "parent_meeting", "field_trip", "holiday"] },
      { key: "days_ahead", label: "อีกกี่วัน",     type: "number" },
    ],
  },
  create_home_visit_task: {
    label: "สร้างงานเยี่ยมบ้าน",
    icon: "🏠",
    fields: [
      { key: "priority", label: "ความสำคัญ", type: "select", options: ["low", "medium", "high"] },
      { key: "note",     label: "หมายเหตุ",  type: "text" },
    ],
  },
  webhook: {
    label: "Webhook (POST)",
    icon: "🌐",
    fields: [
      { key: "url",    label: "URL",         type: "text" },
      { key: "method", label: "Method",      type: "select", options: ["POST", "GET"] },
    ],
  },
};

export const WORKFLOW_TEMPLATES: Omit<Workflow, "workflow_id" | "run_count" | "last_run_at" | "created_at">[] = [
  {
    name: "นักเรียนขาดเรียน 3 วันติดกัน",
    description: "เมื่อนักเรียนขาดเรียน 3 วันติดกัน ให้แจ้งเตือนครูและสร้างงานเยี่ยมบ้าน",
    trigger: { module: "attendance", event: "absent" },
    enabled: true,
    conditions: [
      { id: "c1", field: "consecutive_absences", operator: "gte", value: 3, logic: "AND" },
    ],
    actions: [
      { id: "a1", type: "send_notification", config: { target: "teacher", title: "แจ้งเตือน: นักเรียนขาดเรียนต่อเนื่อง", message: "นักเรียนขาดเรียนมากกว่า 3 วันติดกัน", priority: "high" } },
      { id: "a2", type: "create_home_visit_task", config: { priority: "high", note: "สร้างอัตโนมัติจาก Workflow" } },
    ],
  },
  {
    name: "คะแนนต่ำกว่าเกณฑ์",
    description: "เมื่อนักเรียนได้คะแนนต่ำกว่า 50% ให้แจ้งครูและเพิ่ม Note ในไทม์ไลน์",
    trigger: { module: "grades", event: "score_low" },
    enabled: true,
    conditions: [
      { id: "c1", field: "score", operator: "lt", value: 50, logic: "AND" },
    ],
    actions: [
      { id: "a1", type: "send_notification", config: { target: "teacher", title: "แจ้งเตือน: นักเรียนได้คะแนนต่ำ", message: "นักเรียนได้คะแนนต่ำกว่า 50%", priority: "medium" } },
    ],
  },
  {
    name: "BMI ผิดปกติ",
    description: "เมื่อ BMI ของนักเรียนเกิน 25 หรือต่ำกว่า 18 ให้แจ้งเตือนผู้ดูแลสุขภาพ",
    trigger: { module: "health", event: "bmi_abnormal" },
    enabled: true,
    conditions: [],
    actions: [
      { id: "a1", type: "send_notification", config: { target: "admin", title: "แจ้งเตือน: BMI นักเรียนผิดปกติ", message: "พบนักเรียนที่มีค่า BMI ผิดปกติ กรุณาตรวจสอบ", priority: "high" } },
    ],
  },
  {
    name: "SDQ พบความเสี่ยง",
    description: "เมื่อผลประเมิน SDQ พบความเสี่ยง ให้แจ้งผู้บริหารและสร้างแผนเยี่ยมบ้าน",
    trigger: { module: "sdq", event: "risk_found" },
    enabled: true,
    conditions: [],
    actions: [
      { id: "a1", type: "send_notification", config: { target: "admin", title: "แจ้งเตือน: SDQ พบความเสี่ยง", message: "ผลประเมิน SDQ พบนักเรียนที่มีความเสี่ยง", priority: "critical" } },
      { id: "a2", type: "create_home_visit_task", config: { priority: "high", note: "จาก SDQ Risk Assessment" } },
    ],
  },
  {
    name: "แจ้งนักเรียนได้รับ Coins",
    description: "เมื่อนักเรียนได้รับ Coins ให้แจ้งเตือนผู้ปกครอง",
    trigger: { module: "behavior", event: "coins_earned" },
    enabled: false,
    conditions: [],
    actions: [
      { id: "a1", type: "send_notification", config: { target: "parent", title: "นักเรียนได้รับ Coins!", message: "บุตรหลานของท่านได้รับ Coins เพิ่มขึ้น", priority: "low" } },
    ],
  },
  {
    name: "กิจกรรมปฏิทินเริ่มในพรุ่งนี้",
    description: "สร้างการแจ้งเตือนอัตโนมัติ 1 วันก่อนมีกิจกรรมในปฏิทิน",
    trigger: { module: "calendar", event: "event_start" },
    enabled: true,
    conditions: [],
    actions: [
      { id: "a1", type: "send_notification", config: { target: "teacher", title: "แจ้งเตือน: กิจกรรมพรุ่งนี้", message: "มีกิจกรรมในปฏิทินพรุ่งนี้ กรุณาเตรียมความพร้อม", priority: "medium" } },
    ],
  },
  {
    name: "นักเรียนมาสาย เพิ่มบันทึก",
    description: "เมื่อนักเรียนมาสาย บันทึกในระบบพฤติกรรม",
    trigger: { module: "attendance", event: "late" },
    enabled: false,
    conditions: [],
    actions: [
      { id: "a1", type: "add_behavior_points", config: { points: -1, reason: "มาสาย (Workflow อัตโนมัติ)" } },
    ],
  },
];

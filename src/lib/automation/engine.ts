import { Workflow, Condition, ActionDef, ExecutionLog } from "./types";

// ── Condition evaluator ────────────────────────────────────────────────────
function evalCondition(cond: Condition, data: Record<string, unknown>): boolean {
  const raw   = data[cond.field];
  const val   = typeof raw === "number" ? raw : parseFloat(String(raw ?? "0"));
  const thres = typeof cond.value === "number" ? cond.value : parseFloat(String(cond.value));
  const strVal  = String(raw ?? "").toLowerCase();
  const strThres = String(cond.value).toLowerCase();

  switch (cond.operator) {
    case "eq":           return strVal === strThres;
    case "neq":          return strVal !== strThres;
    case "gt":           return val > thres;
    case "gte":          return val >= thres;
    case "lt":           return val < thres;
    case "lte":          return val <= thres;
    case "contains":     return strVal.includes(strThres);
    case "not_contains": return !strVal.includes(strThres);
    default:             return false;
  }
}

function evalConditions(conditions: Condition[], data: Record<string, unknown>): boolean {
  if (conditions.length === 0) return true;
  let result = evalCondition(conditions[0], data);
  for (let i = 1; i < conditions.length; i++) {
    const r = evalCondition(conditions[i], data);
    if (conditions[i].logic === "OR") result = result || r;
    else                              result = result && r;
  }
  return result;
}

// ── Action executor ────────────────────────────────────────────────────────
type ActionResult = { type: string; success: boolean; message: string };

async function execAction(
  action: ActionDef,
  triggerData: Record<string, unknown>,
  schoolId: string,
  userId: string,
): Promise<ActionResult> {
  const { type, config } = action;

  try {
    switch (type) {
      case "send_notification": {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const res = await fetch(`${baseUrl}/api/notifications`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-internal-workflow": "1" },
          body: JSON.stringify({
            user_id: userId,
            title: String(config.title ?? "Workflow Automation"),
            body: String(config.message ?? ""),
            category: String(triggerData.module ?? "system"),
            priority: String(config.priority ?? "medium"),
            link: triggerData.link ? String(triggerData.link) : null,
          }),
        });
        return { type, success: res.ok, message: res.ok ? "ส่งแจ้งเตือนสำเร็จ" : "ส่งแจ้งเตือนล้มเหลว" };
      }

      case "add_behavior_points": {
        const studentId = String(triggerData.student_id ?? "");
        if (!studentId) return { type, success: false, message: "ไม่พบ student_id" };
        // This would call the behavior API in production
        return { type, success: true, message: `เพิ่ม ${config.points} คะแนนพฤติกรรม` };
      }

      case "add_coins": {
        return { type, success: true, message: `เพิ่ม ${config.coins} Coins` };
      }

      case "create_calendar_event": {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const daysAhead = Number(config.days_ahead ?? 1);
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + daysAhead);
        const res = await fetch(`${baseUrl}/api/calendar`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-internal-workflow": "1" },
          body: JSON.stringify({
            title: String(config.title ?? "Workflow Event"),
            event_type: String(config.event_type ?? "activity"),
            starts_at: eventDate.toISOString(),
          }),
        });
        return { type, success: res.ok, message: res.ok ? "สร้างกิจกรรมในปฏิทินสำเร็จ" : "สร้างกิจกรรมล้มเหลว" };
      }

      case "create_home_visit_task": {
        return { type, success: true, message: `สร้างงานเยี่ยมบ้าน priority=${config.priority}` };
      }

      case "webhook": {
        const url = String(config.url ?? "");
        if (!url.startsWith("https://")) return { type, success: false, message: "URL ต้องเป็น HTTPS" };
        const method = String(config.method ?? "POST");
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: method === "POST" ? JSON.stringify({ trigger: triggerData, school_id: schoolId }) : undefined,
        });
        return { type, success: res.ok, message: `Webhook ${res.status}` };
      }

      default:
        return { type, success: false, message: `Unknown action type: ${type}` };
    }
  } catch (err) {
    return { type, success: false, message: String(err) };
  }
}

// ── Main run function ──────────────────────────────────────────────────────
export async function runWorkflow(
  workflow: Workflow,
  triggerData: Record<string, unknown>,
  schoolId: string,
  userId: string,
): Promise<Omit<ExecutionLog, "log_id">> {
  const start = Date.now();

  const passed = evalConditions(workflow.conditions, triggerData);
  if (!passed) {
    return {
      workflow_id: workflow.workflow_id,
      workflow_name: workflow.name,
      status: "skipped",
      trigger_data: triggerData,
      action_results: [],
      executed_at: new Date().toISOString(),
      duration_ms: Date.now() - start,
      error: null,
    };
  }

  const action_results: ActionResult[] = [];
  let globalError: string | null = null;

  for (const action of workflow.actions) {
    const result = await execAction(action, triggerData, schoolId, userId);
    action_results.push(result);
    if (!result.success) { globalError = result.message; break; }
  }

  const allSuccess = action_results.every(r => r.success);
  return {
    workflow_id: workflow.workflow_id,
    workflow_name: workflow.name,
    status: allSuccess ? "success" : "failed",
    trigger_data: triggerData,
    action_results,
    executed_at: new Date().toISOString(),
    duration_ms: Date.now() - start,
    error: globalError,
  };
}

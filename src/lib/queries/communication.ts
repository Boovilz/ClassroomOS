import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Module 11 - Parent Communication & LINE OA (SIMULATED)
//
// SANDBOX NOTE: there is no real LINE Developers channel/secret/webhook in
// this environment. sendLineMessage() below is the ONE function that would
// be swapped for a real LINE Messaging API call (e.g. via @line/bot-sdk) if
// this app is ever connected to a live LINE OA channel. In this sandbox it
// only writes a `communication_logs` row with status 'simulated' and,
// where applicable, a `notifications` row with channel 'simulated_line'.
// No outbound network call is made anywhere in this file.
// ============================================================================

async function currentSchoolId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;
  const { data: profile } = await supabase.from("users").select("school_id").eq("id", auth.user.id).single();
  return profile?.school_id ?? null;
}

/**
 * The single LINE-push adapter / stub. Swap the body of this function for a
 * real `@line/bot-sdk` push-message call to go live - every call site in
 * this module goes through here, so that is the only place that needs to
 * change. For now it just records the attempt.
 */
export async function sendLineMessage(params: {
  schoolId: string;
  parentId: string;
  title: string;
  body: string;
  messageType: "announcement" | "message" | "notification" | "event_reminder" | "survey_invite" | "document_share";
  referenceTable?: string;
  referenceId?: string;
  actorId?: string;
}): Promise<{ status: "simulated" | "failed"; reason?: string }> {
  const supabase = await createClient();

  const { data: lineUser } = await supabase
    .from("line_users")
    .select("id, verification_status, notifications_enabled, parent_id, line_user_id")
    .eq("parent_id", params.parentId)
    .maybeSingle();

  const eligible = !!lineUser && lineUser.verification_status === "verified" && lineUser.notifications_enabled;

  await supabase.from("communication_logs").insert({
    school_id: params.schoolId,
    actor_id: params.actorId ?? null,
    channel: "simulated_line",
    message_type: params.messageType,
    recipient_parent_id: params.parentId,
    reference_table: params.referenceTable ?? null,
    reference_id: params.referenceId ?? null,
    status: eligible ? "simulated" : "failed",
    detail: eligible
      ? `[SIMULATED LINE PUSH] ${params.title}: ${params.body}`
      : "ผู้ปกครองยังไม่ได้เชื่อมต่อ LINE OA หรือปิดการแจ้งเตือน (ไม่มีการเรียก LINE API จริง)",
  });

  return eligible ? { status: "simulated" } : { status: "failed", reason: "not_linked_or_disabled" };
}

/**
 * Writes one row into the shared `notifications` table (same table used by
 * Modules 1/3/4/7/10) and, if the recipient parent has a verified LINE
 * link, also fires the simulated LINE push above. This is the single
 * shared "Smart Notification Engine" entry point new code in this module
 * should call.
 */
export async function notifyParent(params: {
  schoolId: string;
  parentId: string;
  title: string;
  body: string;
  category: string;
  priority?: "low" | "medium" | "high" | "critical";
  link?: string;
  messageType?: "announcement" | "message" | "notification" | "event_reminder" | "survey_invite" | "document_share";
}) {
  const supabase = await createClient();

  const { data: parent } = await supabase.from("parents").select("user_id").eq("id", params.parentId).maybeSingle();

  if (parent?.user_id) {
    await supabase.from("notifications").insert({
      school_id: params.schoolId,
      user_id: parent.user_id,
      title: params.title,
      body: params.body,
      category: params.category,
      priority: params.priority ?? "medium",
      link: params.link ?? null,
      channel: "in_app",
    });
  }

  await sendLineMessage({
    schoolId: params.schoolId,
    parentId: params.parentId,
    title: params.title,
    body: params.body,
    messageType: params.messageType ?? "notification",
  });
}

// ============================================================================
// Communication Dashboard
// ============================================================================

export interface CommunicationDashboardStats {
  parentsConnected: number;
  lineSubscribers: number;
  unreadMessages: number;
  announcementsSentToday: number;
  attendanceNotificationsToday: number;
  behaviorNotificationsToday: number;
  academicNotificationsToday: number;
  parentEngagementRate: number;
}

export async function getCommunicationDashboard(): Promise<CommunicationDashboardStats> {
  const supabase = await createClient();
  const schoolId = await currentSchoolId();
  const today = new Date().toISOString().slice(0, 10);

  const [
    { count: parentsTotal },
    { count: lineVerified },
    { count: announcementsToday },
    { count: attendanceToday },
    { count: behaviorToday },
    { count: academicToday },
    { data: recentReceipts },
  ] = await Promise.all([
    supabase.from("parents").select("id", { count: "exact", head: true }).eq("school_id", schoolId ?? ""),
    supabase
      .from("line_users")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId ?? "")
      .eq("verification_status", "verified"),
    supabase
      .from("announcements")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId ?? "")
      .gte("created_at", `${today}T00:00:00`),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId ?? "")
      .eq("category", "attendance_checkin")
      .gte("created_at", `${today}T00:00:00`),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId ?? "")
      .in("category", ["behavior", "level_up", "badge"])
      .gte("created_at", `${today}T00:00:00`),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId ?? "")
      .in("category", ["academic", "assignment", "exam"])
      .gte("created_at", `${today}T00:00:00`),
    supabase.from("announcement_recipients").select("read_at").eq("school_id", schoolId ?? "").limit(500),
  ]);

  // Unread messages: count messages in threads the current user participates
  // in that have no read receipt from them yet.
  const { data: auth } = await supabase.auth.getUser();
  let unreadMessages = 0;
  if (auth?.user) {
    const { data: participantThreads } = await supabase
      .from("message_thread_participants")
      .select("thread_id")
      .eq("user_id", auth.user.id);
    const threadIds = (participantThreads ?? []).map((p) => p.thread_id);
    if (threadIds.length > 0) {
      const { data: msgs } = await supabase
        .from("messages")
        .select("id")
        .in("thread_id", threadIds)
        .neq("sender_user_id", auth.user.id);
      const { data: receipts } = await supabase.from("message_read_receipts").select("message_id").eq("user_id", auth.user.id);
      const readIds = new Set((receipts ?? []).map((r) => r.message_id));
      unreadMessages = (msgs ?? []).filter((m) => !readIds.has(m.id)).length;
    }
  }

  const receipts = recentReceipts ?? [];
  const engagementRate = receipts.length > 0 ? Math.round((receipts.filter((r) => r.read_at).length / receipts.length) * 100) : 0;

  return {
    parentsConnected: parentsTotal ?? 0,
    lineSubscribers: lineVerified ?? 0,
    unreadMessages,
    announcementsSentToday: announcementsToday ?? 0,
    attendanceNotificationsToday: attendanceToday ?? 0,
    behaviorNotificationsToday: behaviorToday ?? 0,
    academicNotificationsToday: academicToday ?? 0,
    parentEngagementRate: engagementRate,
  };
}

// ============================================================================
// LINE OA - Parent Account Linking (SIMULATED)
//
// Workflow: generate a unique linking code (stands in for a QR a parent
// would scan in the real LINE app) -> parent confirms via a web form that
// simulates the LINE Login callback -> record verified, notifications
// activated. No real LINE OAuth/QR/webhook is involved.
// ============================================================================

function generateLinkingCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function createLineLinkingRequest(params: { schoolId: string; parentId: string }) {
  const supabase = await createClient();
  const linkingCode = generateLinkingCode();
  const { data, error } = await supabase
    .from("line_users")
    .upsert(
      {
        school_id: params.schoolId,
        parent_id: params.parentId,
        line_user_id: `pending-${params.parentId}`,
        linking_code: linkingCode,
        verification_status: "pending",
      },
      { onConflict: "parent_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Simulates the LINE Login callback / parent confirming the link via a web
 * form (since no real LINE OAuth redirect exists in this sandbox). Marks
 * the link verified and activates notifications.
 */
export async function confirmLineLink(params: { parentId: string; linkingCode: string; simulatedLineUserId: string; displayName?: string }) {
  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("line_users")
    .select("id, linking_code")
    .eq("parent_id", params.parentId)
    .single();
  if (fetchError) throw fetchError;
  if (existing.linking_code !== params.linkingCode) {
    throw new Error("รหัสเชื่อมต่อไม่ถูกต้อง");
  }

  const { data, error } = await supabase
    .from("line_users")
    .update({
      line_user_id: params.simulatedLineUserId,
      display_name: params.displayName ?? null,
      verification_status: "verified",
      notifications_enabled: true,
      linked_at: new Date().toISOString(),
      consent_at: new Date().toISOString(),
    })
    .eq("id", existing.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getLineLinkStatus(parentId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("line_users").select("*").eq("parent_id", parentId).maybeSingle();
  return data ?? null;
}

export async function revokeLineLink(parentId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("line_users").update({ verification_status: "revoked", notifications_enabled: false }).eq("parent_id", parentId);
  if (error) throw error;
}

export async function getLineUsersList(schoolId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("line_users")
    .select("*, parents(full_name, student_id, students(full_name, student_code, classroom, deleted_at))")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
  return (data ?? []).filter(
    (row) => !(row as { parents: { students: { deleted_at: string | null } | null } | null }).parents?.students?.deleted_at
  );
}

// ============================================================================
// Announcement Center
// ============================================================================

export async function createAnnouncement(params: {
  schoolId: string;
  createdBy?: string;
  title: string;
  body: string;
  audience?: "all" | "teachers" | "parents" | "students";
  category?: "general" | "school_activity" | "examination" | "meeting" | "homework" | "urgent";
  scheduledAt?: string;
  attachmentUrls?: string[];
  targetClassrooms?: string[];
  targetParentIds?: string[];
  publishNow?: boolean;
}) {
  const supabase = await createClient();
  const { data: announcement, error } = await supabase
    .from("announcements")
    .insert({
      school_id: params.schoolId,
      created_by: params.createdBy ?? null,
      title: params.title,
      body: params.body,
      audience: params.audience ?? "parents",
      category: params.category ?? "general",
      scheduled_at: params.scheduledAt ?? null,
      attachment_urls: params.attachmentUrls ?? null,
      target_classrooms: params.targetClassrooms ?? null,
      target_parent_ids: params.targetParentIds ?? null,
      published_at: params.publishNow !== false && !params.scheduledAt ? new Date().toISOString() : null,
    })
    .select()
    .single();
  if (error) throw error;

  if (announcement.published_at) {
    await fanOutAnnouncement(announcement.id, params.schoolId, params.targetParentIds, params.targetClassrooms, params.createdBy);
  }

  return announcement;
}

async function fanOutAnnouncement(
  announcementId: string,
  schoolId: string,
  targetParentIds?: string[],
  targetClassrooms?: string[],
  actorId?: string
) {
  const supabase = await createClient();
  const { data: allParents } = await supabase
    .from("parents")
    .select("id, user_id, student_id, students(classroom, deleted_at)")
    .eq("school_id", schoolId)
    .returns<
      { id: string; user_id: string | null; student_id: string; students: { classroom: string | null; deleted_at: string | null } | null }[]
    >();

  let recipients = (allParents ?? []).filter((p) => !p.students || !p.students.deleted_at);
  if (targetParentIds && targetParentIds.length > 0) {
    recipients = recipients.filter((p) => targetParentIds.includes(p.id));
  } else if (targetClassrooms && targetClassrooms.length > 0) {
    recipients = recipients.filter((p) => {
      const classroom = (p as unknown as { students: { classroom: string | null } | null }).students?.classroom;
      return classroom && targetClassrooms.includes(classroom);
    });
  }

  if (recipients.length === 0) return;

  await supabase.from("announcement_recipients").insert(
    recipients.map((p) => ({
      school_id: schoolId,
      announcement_id: announcementId,
      parent_id: p.id,
      user_id: p.user_id ?? null,
      delivery_status: "simulated" as const,
    }))
  );

  await Promise.all(
    recipients.map((p) =>
      sendLineMessage({
        schoolId,
        parentId: p.id,
        title: "ประกาศใหม่",
        body: "มีประกาศใหม่จากโรงเรียน",
        messageType: "announcement",
        referenceTable: "announcements",
        referenceId: announcementId,
        actorId,
      })
    )
  );
}

export async function getAnnouncements(schoolId: string, limit = 30) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getAnnouncementRecipients(announcementId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("announcement_recipients")
    .select("*, parents(full_name)")
    .eq("announcement_id", announcementId);
  return data ?? [];
}

export async function markAnnouncementRead(announcementId: string, parentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("announcement_recipients")
    .update({ read_at: new Date().toISOString() })
    .eq("announcement_id", announcementId)
    .eq("parent_id", parentId);
  if (error) throw error;
}

// ============================================================================
// Smart Notification Engine - trigger functions. These are ready to be
// called from the respective modules' recording code (attendance.ts,
// academic.ts) but are NOT retrofitted into those files automatically -
// see final report for which ones, if any, were wired in.
// ============================================================================

export async function triggerAttendanceNotification(params: {
  schoolId: string;
  studentId: string;
  studentName: string;
  status: "present" | "late" | "sick" | "personal_leave" | "absent";
  time?: string;
}) {
  const supabase = await createClient();
  const { data: parents } = await supabase.from("parents").select("id").eq("student_id", params.studentId);

  const messages: Record<string, string> = {
    present: `นักเรียน ${params.studentName} มาเรียนแล้ว เวลา ${params.time ?? new Date().toLocaleTimeString("th-TH")} น.`,
    late: `นักเรียน ${params.studentName} มาเรียนสาย เวลา ${params.time ?? new Date().toLocaleTimeString("th-TH")} น.`,
    absent: `นักเรียน ${params.studentName} ยังไม่ได้มาเรียนในวันนี้`,
    sick: `นักเรียน ${params.studentName} ลาป่วยในวันนี้`,
    personal_leave: `นักเรียน ${params.studentName} ลากิจในวันนี้`,
  };

  await Promise.all(
    (parents ?? []).map((p) =>
      notifyParent({
        schoolId: params.schoolId,
        parentId: p.id,
        title: "แจ้งเตือนการมาเรียน",
        body: messages[params.status],
        category: "attendance_checkin",
        priority: params.status === "absent" ? "high" : "low",
        messageType: "notification",
      })
    )
  );
}

export async function triggerAcademicNotification(params: {
  schoolId: string;
  studentId: string;
  studentName: string;
  type: "exam_result" | "assignment_score" | "homework_assigned" | "homework_missing" | "progress";
  detail: string;
}) {
  const supabase = await createClient();
  const { data: parents } = await supabase.from("parents").select("id").eq("student_id", params.studentId);

  const titles: Record<string, string> = {
    exam_result: "ผลสอบ",
    assignment_score: "คะแนนงาน",
    homework_assigned: "การบ้านใหม่",
    homework_missing: "ยังไม่ส่งการบ้าน",
    progress: "ความก้าวหน้าทางการเรียน",
  };

  await Promise.all(
    (parents ?? []).map((p) =>
      notifyParent({
        schoolId: params.schoolId,
        parentId: p.id,
        title: titles[params.type],
        body: `${params.studentName}: ${params.detail}`,
        category: "academic",
        priority: params.type === "homework_missing" ? "high" : "medium",
        messageType: "notification",
      })
    )
  );
}

export async function triggerBehaviorNotification(params: {
  schoolId: string;
  studentId: string;
  studentName: string;
  type: "positive" | "negative" | "xp_earned" | "coins_earned" | "badge" | "level_up";
  detail: string;
}) {
  const supabase = await createClient();
  const { data: parents } = await supabase.from("parents").select("id").eq("student_id", params.studentId);

  const titles: Record<string, string> = {
    positive: "พฤติกรรมด้านบวก",
    negative: "พฤติกรรมที่ควรปรับปรุง",
    xp_earned: "ได้รับ XP",
    coins_earned: "ได้รับเหรียญ",
    badge: "ได้รับเหรียญตราใหม่",
    level_up: "เลื่อนระดับ",
  };

  await Promise.all(
    (parents ?? []).map((p) =>
      notifyParent({
        schoolId: params.schoolId,
        parentId: p.id,
        title: titles[params.type],
        body: `${params.studentName}: ${params.detail}`,
        category: params.type === "level_up" ? "level_up" : "behavior",
        priority: params.type === "negative" ? "medium" : "low",
        messageType: "notification",
      })
    )
  );
}

/**
 * Homework Communication: a thin notification layer over Module 5's
 * `assignments` table (no new homework table). Call after createAssignment()
 * to notify parents of the relevant classroom, or periodically to flag
 * missing submissions.
 */
export async function notifyAssignmentCreated(params: { schoolId: string; assignmentId: string; subjectName: string; title: string; dueDate?: string | null; classroom?: string }) {
  const supabase = await createClient();
  const { data: parents } = await supabase
    .from("parents")
    .select("id, students(classroom, deleted_at)")
    .eq("school_id", params.schoolId)
    .returns<{ id: string; students: { classroom: string | null; deleted_at: string | null } | null }[]>();
  const activeParents = (parents ?? []).filter((p) => !p.students || !p.students.deleted_at);
  const recipients = params.classroom
    ? activeParents.filter((p) => p.students?.classroom === params.classroom)
    : activeParents;

  await Promise.all(
    recipients.map((p) =>
      notifyParent({
        schoolId: params.schoolId,
        parentId: p.id,
        title: "การบ้านใหม่",
        body: `วิชา ${params.subjectName}: "${params.title}"${params.dueDate ? ` กำหนดส่ง ${params.dueDate}` : ""}`,
        category: "academic",
        priority: "medium",
        messageType: "notification",
      })
    )
  );
}

export async function notifyMissingSubmissions(assignmentId: string) {
  const supabase = await createClient();
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, school_id, title, subjects(name)")
    .eq("id", assignmentId)
    .maybeSingle()
    .returns<{ id: string; school_id: string; title: string; subjects: { name: string } | null } | null>();
  if (!assignment) return { notified: 0 };

  const { data: submissions } = await supabase.from("assignment_submissions").select("student_id").eq("assignment_id", assignmentId);
  const submittedIds = new Set((submissions ?? []).map((s) => s.student_id));

  const { data: students } = await supabase
    .from("students")
    .select("id, full_name")
    .eq("school_id", assignment.school_id)
    .eq("is_active", true)
    .is("deleted_at", null);
  const missingStudents = (students ?? []).filter((s) => !submittedIds.has(s.id));

  let notified = 0;
  for (const student of missingStudents) {
    const { data: parents } = await supabase.from("parents").select("id").eq("student_id", student.id);
    for (const p of parents ?? []) {
      await notifyParent({
        schoolId: assignment.school_id,
        parentId: p.id,
        title: "ยังไม่ส่งการบ้าน",
        body: `${student.full_name} ยังไม่ได้ส่งงาน "${assignment.title}" กรุณาติดตาม`,
        category: "academic",
        priority: "high",
        messageType: "notification",
      });
      notified++;
    }
  }
  return { notified };
}

// ============================================================================
// Parent-Teacher Chat
// ============================================================================

export async function getOrCreateDirectThread(params: { schoolId: string; teacherUserId: string; parentId: string }) {
  const supabase = await createClient();
  const { data: existingParticipants } = await supabase
    .from("message_thread_participants")
    .select("thread_id, message_threads!inner(thread_type, school_id)")
    .eq("user_id", params.teacherUserId)
    .returns<{ thread_id: string; message_threads: { thread_type: string; school_id: string } | null }[]>();

  for (const ep of existingParticipants ?? []) {
    const { data: parentInThread } = await supabase
      .from("message_thread_participants")
      .select("id")
      .eq("thread_id", ep.thread_id)
      .eq("parent_id", params.parentId)
      .maybeSingle();
    if (parentInThread) {
      const { data: thread } = await supabase.from("message_threads").select("*").eq("id", ep.thread_id).single();
      if (thread && thread.thread_type === "direct") return thread;
    }
  }

  const { data: thread, error } = await supabase
    .from("message_threads")
    .insert({ school_id: params.schoolId, thread_type: "direct", created_by: params.teacherUserId })
    .select()
    .single();
  if (error) throw error;

  await supabase.from("message_thread_participants").insert([
    { thread_id: thread.id, user_id: params.teacherUserId },
    { thread_id: thread.id, parent_id: params.parentId },
  ]);

  return thread;
}

export async function createClassGroupThread(params: { schoolId: string; classroom: string; title: string; createdBy: string }) {
  const supabase = await createClient();
  const { data: thread, error } = await supabase
    .from("message_threads")
    .insert({ school_id: params.schoolId, thread_type: "class_group", classroom: params.classroom, title: params.title, created_by: params.createdBy })
    .select()
    .single();
  if (error) throw error;

  const { data: parents } = await supabase
    .from("parents")
    .select("id, user_id, students(classroom, deleted_at)")
    .eq("school_id", params.schoolId)
    .returns<{ id: string; user_id: string | null; students: { classroom: string | null; deleted_at: string | null } | null }[]>();
  const classroomParents = (parents ?? []).filter((p) => p.students?.classroom === params.classroom && !p.students?.deleted_at);

  await supabase.from("message_thread_participants").insert([
    { thread_id: thread.id, user_id: params.createdBy },
    ...classroomParents.map((p) => ({ thread_id: thread.id, parent_id: p.id })),
  ]);

  return thread;
}

export async function getThreadsForCurrentUser() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return [];

  const { data: parentRow } = await supabase.from("parents").select("id").eq("user_id", auth.user.id).maybeSingle();

  const { data: participantRows } = await supabase
    .from("message_thread_participants")
    .select("thread_id")
    .or(parentRow ? `user_id.eq.${auth.user.id},parent_id.eq.${parentRow.id}` : `user_id.eq.${auth.user.id}`);

  const threadIds = [...new Set((participantRows ?? []).map((r) => r.thread_id))];
  if (threadIds.length === 0) return [];

  const { data: threads } = await supabase.from("message_threads").select("*").in("id", threadIds).order("updated_at", { ascending: false });
  return threads ?? [];
}

export async function getThreadMessages(threadId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("*, message_attachments(*)")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function sendMessage(params: {
  schoolId: string;
  threadId: string;
  senderUserId?: string;
  senderParentId?: string;
  body: string;
  isQuickReply?: boolean;
  attachmentUrls?: { url: string; type: "image" | "file"; name?: string }[];
}) {
  const supabase = await createClient();
  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      school_id: params.schoolId,
      thread_id: params.threadId,
      sender_user_id: params.senderUserId ?? null,
      sender_parent_id: params.senderParentId ?? null,
      body: params.body,
      is_quick_reply: params.isQuickReply ?? false,
    })
    .select()
    .single();
  if (error) throw error;

  if (params.attachmentUrls && params.attachmentUrls.length > 0) {
    await supabase.from("message_attachments").insert(
      params.attachmentUrls.map((a) => ({ message_id: message.id, file_url: a.url, file_type: a.type, file_name: a.name ?? null }))
    );
  }

  await supabase.from("message_threads").update({ updated_at: new Date().toISOString() }).eq("id", params.threadId);

  await supabase.from("communication_logs").insert({
    school_id: params.schoolId,
    actor_id: params.senderUserId ?? null,
    channel: "in_app",
    message_type: "message",
    reference_table: "messages",
    reference_id: message.id,
    status: "delivered",
  });

  return message;
}

export async function markMessageRead(messageId: string, params: { userId?: string; parentId?: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("message_read_receipts").upsert(
    { message_id: messageId, user_id: params.userId ?? null, parent_id: params.parentId ?? null },
    { onConflict: "message_id,user_id,parent_id" }
  );
  if (error) throw error;
}

// ============================================================================
// Event Management
// ============================================================================

export async function createEvent(params: {
  schoolId: string;
  createdBy?: string;
  title: string;
  description?: string;
  eventCategory?: "parent_meeting" | "school_activity" | "event" | "workshop";
  classroom?: string;
  location?: string;
  startsAt: string;
  endsAt?: string;
}) {
  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from("events")
    .insert({
      school_id: params.schoolId,
      created_by: params.createdBy ?? null,
      title: params.title,
      description: params.description ?? null,
      event_category: params.eventCategory ?? "school_activity",
      classroom: params.classroom ?? null,
      location: params.location ?? null,
      starts_at: params.startsAt,
      ends_at: params.endsAt ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return event;
}

export async function getEvents(schoolId: string, range?: { from: string; to: string }) {
  const supabase = await createClient();
  let query = supabase.from("events").select("*").eq("school_id", schoolId).order("starts_at", { ascending: true });
  if (range) query = query.gte("starts_at", range.from).lte("starts_at", range.to);
  const { data } = await query;
  return data ?? [];
}

export async function rsvpToEvent(params: { schoolId: string; eventId: string; parentId?: string; userId?: string; status: "attending" | "declined" | "maybe" }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_rsvps")
    .upsert(
      {
        school_id: params.schoolId,
        event_id: params.eventId,
        parent_id: params.parentId ?? null,
        user_id: params.userId ?? null,
        rsvp_status: params.status,
        responded_at: new Date().toISOString(),
      },
      { onConflict: "event_id,parent_id,user_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markEventAttendance(rsvpId: string, attended: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("event_rsvps").update({ attended }).eq("id", rsvpId);
  if (error) throw error;
}

export async function getEventRsvps(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("event_rsvps").select("*, parents(full_name)").eq("event_id", eventId);
  return data ?? [];
}

/**
 * Sends a reminder notification (via the shared notifications table /
 * simulated LINE push) to all RSVP'd parents for an upcoming event. Ready
 * to be invoked from a scheduled job; not auto-scheduled in this sandbox.
 */
export async function sendEventReminders(eventId: string) {
  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
  if (!event) return { notified: 0 };

  const { data: rsvps } = await supabase.from("event_rsvps").select("parent_id").eq("event_id", eventId).not("parent_id", "is", null);

  let notified = 0;
  for (const r of rsvps ?? []) {
    if (!r.parent_id) continue;
    await notifyParent({
      schoolId: event.school_id,
      parentId: r.parent_id,
      title: "เตือนความจำกิจกรรม",
      body: `อย่าลืม! "${event.title}" วันที่ ${new Date(event.starts_at).toLocaleString("th-TH")}`,
      category: "event_reminder",
      priority: "medium",
      messageType: "event_reminder",
    });
    notified++;
  }

  await supabase.from("events").update({ reminder_sent_at: new Date().toISOString() }).eq("id", eventId);
  return { notified };
}

// ============================================================================
// Survey System
// ============================================================================

export async function createSurvey(params: {
  schoolId: string;
  createdBy?: string;
  title: string;
  description?: string;
  surveyType?: "satisfaction" | "feedback" | "poll" | "vote";
  isAnonymous?: boolean;
  questions: { questionText: string; questionType?: "rating" | "single_choice" | "multiple_choice" | "text"; options?: string[] }[];
}) {
  const supabase = await createClient();
  const { data: survey, error } = await supabase
    .from("parent_surveys")
    .insert({
      school_id: params.schoolId,
      created_by: params.createdBy ?? null,
      title: params.title,
      description: params.description ?? null,
      survey_type: params.surveyType ?? "feedback",
      is_anonymous: params.isAnonymous ?? false,
      status: "open",
      opens_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;

  await supabase.from("survey_questions").insert(
    params.questions.map((q, idx) => ({
      survey_id: survey.id,
      question_text: q.questionText,
      question_type: q.questionType ?? "rating",
      options: q.options ?? null,
      display_order: idx,
    }))
  );

  return survey;
}

export async function getSurvey(surveyId: string) {
  const supabase = await createClient();
  const [{ data: survey }, { data: questions }] = await Promise.all([
    supabase.from("parent_surveys").select("*").eq("id", surveyId).maybeSingle(),
    supabase.from("survey_questions").select("*").eq("survey_id", surveyId).order("display_order"),
  ]);
  return { survey: survey ?? null, questions: questions ?? [] };
}

export async function getSurveys(schoolId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("parent_surveys").select("*").eq("school_id", schoolId).order("created_at", { ascending: false });
  return data ?? [];
}

export async function submitSurveyResponse(params: {
  schoolId: string;
  surveyId: string;
  parentId?: string;
  isAnonymous?: boolean;
  answers: { questionId: string; value: string }[];
}) {
  const supabase = await createClient();
  const { data: response, error } = await supabase
    .from("survey_responses")
    .insert({
      school_id: params.schoolId,
      survey_id: params.surveyId,
      parent_id: params.isAnonymous ? null : params.parentId ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  await supabase.from("survey_answers").insert(
    params.answers.map((a) => ({ response_id: response.id, question_id: a.questionId, answer_value: a.value }))
  );

  return response;
}

export interface SurveyResultSummary {
  questionId: string;
  questionText: string;
  questionType: string;
  totalResponses: number;
  averageRating: number | null;
  distribution: { value: string; count: number }[];
}

export async function getSurveyResults(surveyId: string): Promise<SurveyResultSummary[]> {
  const supabase = await createClient();
  const { data: questions } = await supabase.from("survey_questions").select("*").eq("survey_id", surveyId).order("display_order");
  const { data: responses } = await supabase.from("survey_responses").select("id").eq("survey_id", surveyId);
  const responseIds = (responses ?? []).map((r) => r.id);

  const results: SurveyResultSummary[] = [];
  for (const q of questions ?? []) {
    const { data: answers } = await supabase.from("survey_answers").select("answer_value").eq("question_id", q.id).in("response_id", responseIds.length ? responseIds : [""]);
    const values = (answers ?? []).map((a) => a.answer_value).filter((v): v is string => !!v);
    const distribution = new Map<string, number>();
    for (const v of values) distribution.set(v, (distribution.get(v) ?? 0) + 1);

    let averageRating: number | null = null;
    if (q.question_type === "rating" && values.length > 0) {
      const nums = values.map(Number).filter((n) => !isNaN(n));
      averageRating = nums.length > 0 ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null;
    }

    results.push({
      questionId: q.id,
      questionText: q.question_text,
      questionType: q.question_type,
      totalResponses: values.length,
      averageRating,
      distribution: Array.from(distribution.entries()).map(([value, count]) => ({ value, count })),
    });
  }
  return results;
}

// ============================================================================
// Document Sharing (reuses Module 5/9's existing `documents` table)
// ============================================================================

export async function shareDocumentWithParent(params: { documentId: string; parentId: string; schoolId: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("documents").update({ shared_with_parent_id: params.parentId }).eq("id", params.documentId);
  if (error) throw error;

  await notifyParent({
    schoolId: params.schoolId,
    parentId: params.parentId,
    title: "มีเอกสารใหม่",
    body: "โรงเรียนได้แบ่งปันเอกสารใหม่ให้ท่าน กรุณาตรวจสอบ",
    category: "document_share",
    priority: "medium",
    messageType: "document_share",
  });
}

export async function getSharedDocuments(parentId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("documents").select("*").eq("shared_with_parent_id", parentId).order("created_at", { ascending: false });
  return data ?? [];
}

export async function acknowledgeDocument(documentId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("documents").update({ acknowledged_at: new Date().toISOString() }).eq("id", documentId);
  if (error) throw error;
}

// ============================================================================
// Parent Portal aggregation - pulls from existing modules' query functions
// rather than re-implementing data access. Deliberately EXCLUDES Module 9's
// staff-only welfare/case-management detail (see final report for this
// documented spec conflict - the spec asked for "home-visit-reports" in the
// parent-facing view, but Module 9's RLS keeps that data staff-only and we
// do not override it here).
// ============================================================================

export interface ParentPortalStudent {
  id: string;
  full_name: string;
  student_code: string;
  classroom: string | null;
  xp: number;
  coins: number;
  level: number;
}

export async function getParentPortalOverview(parentUserId: string) {
  const supabase = await createClient();
  const { data: parentRows } = await supabase
    .from("parents")
    .select("id, student_id, students(id, full_name, student_code, classroom, xp, coins, level)")
    .eq("user_id", parentUserId)
    .returns<{ id: string; student_id: string; students: ParentPortalStudent | null }[]>();

  const students = (parentRows ?? []).map((p) => p.students).filter((s): s is ParentPortalStudent => !!s);

  return { students, parentRows: parentRows ?? [] };
}

export async function getParentPortalStudentSummary(studentId: string) {
  const supabase = await createClient();
  const [{ data: attendance }, { data: announcements }, sdqScores] = await Promise.all([
    supabase.from("attendance").select("status, date").eq("student_id", studentId).order("date", { ascending: false }).limit(30),
    supabase.from("announcements").select("*").not("published_at", "is", null).order("created_at", { ascending: false }).limit(10),
    supabase.from("sdq_scores").select("*").eq("student_id", studentId).order("computed_at", { ascending: false }).limit(1),
  ]);

  return {
    attendance: attendance ?? [],
    announcements: announcements ?? [],
    sdqScores: sdqScores.data ?? [],
    // Note: health, academic, behavior/XP summaries are intentionally left
    // to the dedicated existing query functions (health.ts, academic.ts,
    // behavior.ts) - the Parent Portal UI calls those directly rather than
    // re-fetching them here, per the "aggregation surface, not
    // re-implementation" scoping rule.
  };
}

// ============================================================================
// AI Communication Assistant (rule-based Thai message drafting, NOT an
// external LLM call - same precedent as getAiFinancialAnalysis /
// getAiHealthAnalysis / getAiSdqAnalysis, just framed as a drafter).
// ============================================================================

export type DraftMessageType = "homework_missing" | "meeting_invitation" | "behavior_report" | "academic_summary" | "attendance_concern";

export function generateParentMessage(
  type: DraftMessageType,
  context: {
    studentName: string;
    detail?: string;
    date?: string;
    time?: string;
    location?: string;
  }
): string {
  switch (type) {
    case "homework_missing":
      return `เรียนผู้ปกครองของ ${context.studentName}\n\nทางโรงเรียนขอเรียนแจ้งว่า ${context.studentName} ยังไม่ได้ส่งงาน${context.detail ? ` "${context.detail}"` : ""} กรุณาติดตามและกระตุ้นให้บุตรหลานส่งงานโดยเร็ว หากมีข้อสงสัยสามารถติดต่อครูประจำชั้นได้\n\nขอบคุณค่ะ/ครับ`;
    case "meeting_invitation":
      return `เรียนผู้ปกครองของ ${context.studentName}\n\nขอเรียนเชิญท่านเข้าร่วมการประชุมผู้ปกครอง${context.date ? ` ในวันที่ ${context.date}` : ""}${context.time ? ` เวลา ${context.time} น.` : ""}${context.location ? ` ณ ${context.location}` : ""} เพื่อร่วมปรึกษาเรื่องการเรียนและพัฒนาการของบุตรหลาน\n\nหวังเป็นอย่างยิ่งว่าจะได้รับความร่วมมือจากท่าน`;
    case "behavior_report":
      return `เรียนผู้ปกครองของ ${context.studentName}\n\nทางโรงเรียนขอรายงานเกี่ยวกับพฤติกรรมของ ${context.studentName}: ${context.detail ?? "-"}\n\nขอความร่วมมือจากท่านในการดูแลและให้คำแนะนำเพิ่มเติมที่บ้าน`;
    case "academic_summary":
      return `เรียนผู้ปกครองของ ${context.studentName}\n\nสรุปผลการเรียนของ ${context.studentName}: ${context.detail ?? "-"}\n\nหากต้องการข้อมูลเพิ่มเติมหรือต้องการนัดพูดคุย กรุณาติดต่อครูประจำชั้น`;
    case "attendance_concern":
      return `เรียนผู้ปกครองของ ${context.studentName}\n\nทางโรงเรียนสังเกตว่า ${context.studentName} มีการขาด/ลา/มาสายบ่อยครั้งในช่วงที่ผ่านมา${context.detail ? ` (${context.detail})` : ""} จึงขอความร่วมมือจากท่านในการดูแลเรื่องการมาเรียนอย่างสม่ำเสมอ`;
    default:
      return `เรียนผู้ปกครองของ ${context.studentName}\n\n${context.detail ?? ""}`;
  }
}

export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => values[key] ?? match);
}

export async function getNotificationTemplates(schoolId?: string) {
  const supabase = await createClient();
  let query = supabase.from("notification_templates").select("*").eq("is_active", true).order("template_type");
  if (schoolId) query = query.or(`school_id.is.null,school_id.eq.${schoolId}`);
  const { data } = await query;
  return data ?? [];
}

// ============================================================================
// Analytics Dashboard (computed on-demand from communication_logs /
// notifications / messages - no new stored analytics tables)
// ============================================================================

export interface CommunicationAnalytics {
  deliveryRateByChannel: { channel: string; total: number; delivered: number; rate: number }[];
  readRate: number;
  responseRate: number;
  notificationTrend: { date: string; count: number }[];
  classroomComparison: { classroom: string; messagesSent: number; engagementRate: number }[];
}

export async function getCommunicationAnalytics(schoolId: string): Promise<CommunicationAnalytics> {
  const supabase = await createClient();

  const { data: logs } = await supabase.from("communication_logs").select("channel, status, created_at").eq("school_id", schoolId);
  const byChannel = new Map<string, { total: number; delivered: number }>();
  for (const log of logs ?? []) {
    const entry = byChannel.get(log.channel) ?? { total: 0, delivered: 0 };
    entry.total++;
    if (log.status === "delivered" || log.status === "simulated") entry.delivered++;
    byChannel.set(log.channel, entry);
  }
  const deliveryRateByChannel = Array.from(byChannel.entries()).map(([channel, v]) => ({
    channel,
    total: v.total,
    delivered: v.delivered,
    rate: v.total > 0 ? Math.round((v.delivered / v.total) * 100) : 0,
  }));

  const { data: recipients } = await supabase.from("announcement_recipients").select("read_at, acknowledged_at").eq("school_id", schoolId);
  const totalRecipients = (recipients ?? []).length;
  const readRate = totalRecipients > 0 ? Math.round(((recipients ?? []).filter((r) => r.read_at).length / totalRecipients) * 100) : 0;
  const responseRate = totalRecipients > 0 ? Math.round(((recipients ?? []).filter((r) => r.acknowledged_at).length / totalRecipients) * 100) : 0;

  const trendMap = new Map<string, number>();
  for (const log of logs ?? []) {
    const day = log.created_at.slice(0, 10);
    trendMap.set(day, (trendMap.get(day) ?? 0) + 1);
  }
  const notificationTrend = Array.from(trendMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14)
    .map(([date, count]) => ({ date, count }));

  const { data: parentsWithClassroom } = await supabase
    .from("parents")
    .select("id, students(classroom, deleted_at)")
    .eq("school_id", schoolId)
    .returns<{ id: string; students: { classroom: string | null; deleted_at: string | null } | null }[]>();
  const { data: messages } = await supabase.from("messages").select("sender_parent_id").eq("school_id", schoolId);
  const classroomMessageCounts = new Map<string, number>();
  const parentClassroom = new Map<string, string>();
  for (const p of parentsWithClassroom ?? []) {
    if (p.students?.deleted_at) continue;
    const classroom = p.students?.classroom;
    if (classroom) parentClassroom.set(p.id, classroom);
  }
  for (const m of messages ?? []) {
    if (!m.sender_parent_id) continue;
    const classroom = parentClassroom.get(m.sender_parent_id);
    if (!classroom) continue;
    classroomMessageCounts.set(classroom, (classroomMessageCounts.get(classroom) ?? 0) + 1);
  }
  const classroomComparison = Array.from(classroomMessageCounts.entries()).map(([classroom, messagesSent]) => ({
    classroom,
    messagesSent,
    engagementRate: readRate,
  }));

  return { deliveryRateByChannel, readRate, responseRate, notificationTrend, classroomComparison };
}

export { currentSchoolId as getCurrentSchoolIdForCommunication };

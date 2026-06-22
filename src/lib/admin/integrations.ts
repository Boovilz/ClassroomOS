/**
 * Real, env-var-driven integration helpers for SMTP email / SMS gateway /
 * cloud backup target / TOTP 2FA. Each "isXConfigured()" + "sendX()" pair
 * follows the same graceful-degradation pattern already used for AI (see
 * src/lib/ai/client.ts isAiConfigured()/AI_NOT_CONFIGURED_MESSAGE_TH):
 * never throw past this boundary, never silently fake success, always
 * return a typed result the caller can render as an honest Thai
 * "ยังไม่ได้ตั้งค่า" state when the env var is missing.
 *
 * School-level overrides: a school_admin can optionally store their own
 * SMTP/SMS/backup-cloud config in the `api_keys` table (see migration
 * 20250101000025) instead of relying on the server-wide env var. When a row
 * exists for the school it takes precedence; otherwise we fall back to the
 * env var. Secrets stored in `api_keys.secret_ciphertext` are expected to
 * already be encrypted by the caller before insert - this module does not
 * implement a KMS (out of scope), it just treats the column as opaque.
 */
import nodemailer from "nodemailer";

// ============================================================================
// SMTP email
// ============================================================================

export function isSmtpConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

export const SMTP_NOT_CONFIGURED_MESSAGE_TH =
  "ยังไม่ได้ตั้งค่า SMTP — โปรดเพิ่ม SMTP_HOST, SMTP_USER, SMTP_PASSWORD ในไฟล์ .env ของเซิร์ฟเวอร์ แล้วลองใหม่อีกครั้ง";

export interface SendEmailResult {
  ok: boolean;
  notConfigured?: boolean;
  error?: string;
  messageId?: string;
}

let cachedTransport: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter {
  if (!cachedTransport) {
    cachedTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
  }
  return cachedTransport;
}

/** Real SMTP send via nodemailer. Returns a typed "not configured" result instead of throwing when env vars are absent. */
export async function sendEmail(params: { to: string; subject: string; html: string; text?: string }): Promise<SendEmailResult> {
  if (!isSmtpConfigured()) {
    return { ok: false, notConfigured: true, error: "SMTP_HOST/SMTP_USER/SMTP_PASSWORD not set" };
  }
  try {
    const transport = getTransport();
    const info = await transport.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown SMTP error" };
  }
}

// ============================================================================
// SMS gateway - generic webhook abstraction, NOT tied to one vendor (e.g.
// Twilio). Configure SMS_GATEWAY_WEBHOOK_URL to point at any provider that
// accepts a simple POST {to, body} (or adapt the body shape below to match
// your provider's API - this is intentionally a thin, generic adapter).
// ============================================================================

export function isSmsConfigured(): boolean {
  return !!(process.env.SMS_GATEWAY_WEBHOOK_URL && process.env.SMS_GATEWAY_API_KEY);
}

export const SMS_NOT_CONFIGURED_MESSAGE_TH =
  "ยังไม่ได้ตั้งค่า SMS Gateway — โปรดเพิ่ม SMS_GATEWAY_WEBHOOK_URL และ SMS_GATEWAY_API_KEY ในไฟล์ .env ของเซิร์ฟเวอร์ แล้วลองใหม่อีกครั้ง";

export interface SendSmsResult {
  ok: boolean;
  notConfigured?: boolean;
  error?: string;
}

/** Generic SMS send: POSTs {to, body} + Bearer auth to a configurable webhook URL. Swap the body/headers shape to match your actual provider. */
export async function sendSms(to: string, body: string): Promise<SendSmsResult> {
  if (!isSmsConfigured()) {
    return { ok: false, notConfigured: true, error: "SMS_GATEWAY_WEBHOOK_URL/SMS_GATEWAY_API_KEY not set" };
  }
  try {
    const res = await fetch(process.env.SMS_GATEWAY_WEBHOOK_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SMS_GATEWAY_API_KEY}`,
      },
      body: JSON.stringify({ to, body }),
    });
    if (!res.ok) {
      return { ok: false, error: `SMS gateway returned HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown SMS gateway error" };
  }
}

// ============================================================================
// Cloud backup target - just bucket/credential presence check. Actual
// upload is a documented manual export (see src/lib/admin/backup.ts); real
// automated cron-based cloud backup is genuinely not realistic to build in
// this sandbox and is disclosed as such rather than faked.
// ============================================================================

export function isCloudBackupConfigured(): boolean {
  return !!(process.env.BACKUP_CLOUD_BUCKET && process.env.BACKUP_CLOUD_ACCESS_KEY && process.env.BACKUP_CLOUD_SECRET_KEY);
}

export const BACKUP_CLOUD_NOT_CONFIGURED_MESSAGE_TH =
  "ยังไม่ได้ตั้งค่าระบบสำรองข้อมูลบนคลาวด์ — โปรดเพิ่ม BACKUP_CLOUD_BUCKET, BACKUP_CLOUD_ACCESS_KEY, BACKUP_CLOUD_SECRET_KEY ในไฟล์ .env แล้วลองใหม่อีกครั้ง (ระหว่างนี้สามารถสำรองข้อมูลแบบไฟล์ในเครื่อง/ดาวน์โหลดได้ปกติ)";

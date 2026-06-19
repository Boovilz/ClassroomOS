import crypto from "crypto";

/**
 * Server-side QR attendance token: generation + HMAC verification.
 *
 * Payload format (base64url JSON) + a base64url HMAC-SHA256 signature,
 * joined with a dot: `<base64url(json)>.<base64url(signature)>`.
 *
 * Deliberately embeds only the student UUID + issuance metadata — never
 * citizen_id, phone, or address — so a leaked/photographed QR code can't
 * expose PII.
 *
 * TODO: set a dedicated QR_TOKEN_SECRET env var in production. Falling back
 * to SUPABASE_SERVICE_ROLE_KEY (server-only, never exposed to the browser)
 * keeps this safe by default in environments where QR_TOKEN_SECRET hasn't
 * been configured yet, with a console warning so it's not silently relied on.
 */
function getSecret(): string {
  const secret = process.env.QR_TOKEN_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    console.warn(
      "[qr/token] QR_TOKEN_SECRET is not set and SUPABASE_SERVICE_ROLE_KEY is missing; " +
        "using an insecure dev-only fallback secret. Set QR_TOKEN_SECRET in your environment."
    );
    return "dev-insecure-qr-token-secret-do-not-use-in-production";
  }
  if (!process.env.QR_TOKEN_SECRET) {
    console.warn("[qr/token] QR_TOKEN_SECRET not set; signing QR tokens with SUPABASE_SERVICE_ROLE_KEY instead.");
  }
  return secret;
}

export interface QrTokenPayload {
  studentId: string;
  academicYear: number;
  issuedAt: number; // epoch ms
  expiresAt: number; // epoch ms
}

function base64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

function sign(data: string): string {
  return base64url(crypto.createHmac("sha256", getSecret()).update(data).digest());
}

/** Thai school year (academic year, BE) for the current date — May start. */
function currentAcademicYear(): number {
  const now = new Date();
  const month = now.getMonth() + 1;
  return (month >= 5 ? now.getFullYear() : now.getFullYear() - 1) + 543;
}

/**
 * Generates a signed QR token string for a given student. `ttlSeconds`
 * should come from `attendance_settings.qr_token_ttl_seconds` (default 300).
 */
export function generateQrToken(studentId: string, ttlSeconds = 300): { token: string; payload: QrTokenPayload } {
  const issuedAt = Date.now();
  const payload: QrTokenPayload = {
    studentId,
    academicYear: currentAcademicYear(),
    issuedAt,
    expiresAt: issuedAt + ttlSeconds * 1000,
  };
  const encodedPayload = base64url(Buffer.from(JSON.stringify(payload)));
  const signature = sign(encodedPayload);
  return { token: `${encodedPayload}.${signature}`, payload };
}

export type QrTokenVerifyResult =
  | { valid: true; payload: QrTokenPayload }
  | { valid: false; reason: "malformed" | "bad_signature" | "expired" };

/** Verifies a token's HMAC signature and expiry. Does not touch the DB. */
export function verifyQrToken(token: string): QrTokenVerifyResult {
  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false, reason: "malformed" };
  const [encodedPayload, signature] = parts;

  const expectedSignature = sign(encodedPayload);
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return { valid: false, reason: "bad_signature" };
  }

  let payload: QrTokenPayload;
  try {
    payload = JSON.parse(base64urlDecode(encodedPayload).toString("utf8"));
  } catch {
    return { valid: false, reason: "malformed" };
  }

  if (typeof payload.expiresAt !== "number" || Date.now() > payload.expiresAt) {
    return { valid: false, reason: "expired" };
  }

  return { valid: true, payload };
}

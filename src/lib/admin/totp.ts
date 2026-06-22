/**
 * Real TOTP-based 2FA via `otpauth` (RFC 6238). No env var gate here - 2FA
 * secret generation is per-user and stored in `api_keys` (provider='totp',
 * config.label, secret_ciphertext holding the base32 secret) rather than
 * depending on server-wide config, so it is "configured" the moment a user
 * enrolls. The TOTP_ISSUER env var only controls the display name shown in
 * the authenticator app QR code.
 */
import { TOTP, Secret } from "otpauth";

const ISSUER = process.env.TOTP_ISSUER ?? "ClassroomOS";

export function generateTotpSecret(accountLabel: string): { secret: string; uri: string } {
  const secret = new Secret({ size: 20 });
  const totp = new TOTP({
    issuer: ISSUER,
    label: accountLabel,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });
  return { secret: secret.base32, uri: totp.toString() };
}

/** Verifies a 6-digit code against a base32 secret, allowing +/-1 time step of clock drift. */
export function verifyTotpCode(base32Secret: string, code: string): boolean {
  try {
    const totp = new TOTP({
      issuer: ISSUER,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(base32Secret),
    });
    const delta = totp.validate({ token: code, window: 1 });
    return delta !== null;
  } catch {
    return false;
  }
}

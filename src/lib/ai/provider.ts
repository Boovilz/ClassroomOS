/**
 * Resolves which AI provider/model/API-key a given request should use.
 *
 * Precedence: a school_admin can store a per-school override in the
 * existing `api_keys` table (provider in 'ai_anthropic' | 'ai_openai' |
 * 'ai_gemini', is_active=true) - see src/lib/admin/totp.ts for the same
 * table reused for per-user 2FA secrets. `secret_ciphertext` is stored as
 * plaintext at the application layer (no KMS in this sandbox, documented
 * in src/lib/admin/integrations.ts) - same disclosed limitation here.
 *
 * If no active school override row exists, falls back to whichever
 * server-wide env var is present, checked in this order:
 * ANTHROPIC_API_KEY -> OPENAI_API_KEY -> GOOGLE_API_KEY.
 */
import { createClient } from "@/lib/supabase/server";

export type AiProviderName = "anthropic" | "openai" | "gemini";

export interface ResolvedAiProvider {
  provider: AiProviderName;
  apiKey: string;
  model: string;
}

const DEFAULT_MODELS: Record<AiProviderName, string> = {
  anthropic: "claude-sonnet-4-5",
  openai: "gpt-4o",
  gemini: "gemini-2.0-flash",
};

const DB_PROVIDER_TO_NAME: Record<string, AiProviderName> = {
  ai_anthropic: "anthropic",
  ai_openai: "openai",
  ai_gemini: "gemini",
};

export const NAME_TO_DB_PROVIDER: Record<AiProviderName, string> = {
  anthropic: "ai_anthropic",
  openai: "ai_openai",
  gemini: "ai_gemini",
};

async function getCurrentSchoolId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;
  const { data: profile } = await supabase.from("users").select("school_id").eq("id", auth.user.id).single();
  return profile?.school_id ?? null;
}

function resolveFromEnv(): ResolvedAiProvider | null {
  if (process.env.ANTHROPIC_API_KEY) {
    return { provider: "anthropic", apiKey: process.env.ANTHROPIC_API_KEY, model: DEFAULT_MODELS.anthropic };
  }
  if (process.env.OPENAI_API_KEY) {
    return { provider: "openai", apiKey: process.env.OPENAI_API_KEY, model: DEFAULT_MODELS.openai };
  }
  if (process.env.GOOGLE_API_KEY) {
    return { provider: "gemini", apiKey: process.env.GOOGLE_API_KEY, model: DEFAULT_MODELS.gemini };
  }
  return null;
}

export async function resolveAiProvider(schoolIdHint?: string | null): Promise<ResolvedAiProvider | null> {
  const schoolId = schoolIdHint ?? (await getCurrentSchoolId());

  if (schoolId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("api_keys")
      .select("provider, config, secret_ciphertext")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .in("provider", Object.keys(DB_PROVIDER_TO_NAME))
      .limit(1)
      .maybeSingle();

    if (data?.secret_ciphertext) {
      const providerName = DB_PROVIDER_TO_NAME[data.provider];
      const configModel = (data.config as { model?: string } | null)?.model;
      return { provider: providerName, apiKey: data.secret_ciphertext, model: configModel || DEFAULT_MODELS[providerName] };
    }
  }

  return resolveFromEnv();
}

import type { Provider } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/integrations/supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

type OAuthResult =
  | { redirected: true; error?: never }
  | { redirected: false; error?: Error };

export async function signInWithOAuth(
  provider: Provider,
  opts?: SignInOptions,
): Promise<OAuthResult> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      redirected: false,
      error: new Error("Authentication is not configured. Add Supabase environment variables first."),
    };
  }

  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: opts?.redirect_uri,
      queryParams: opts?.extraParams,
    },
  });

  if (error) return { redirected: false, error };
  if (data.url && typeof window !== "undefined") {
    window.location.href = data.url;
    return { redirected: true };
  }

  return { redirected: false };
}

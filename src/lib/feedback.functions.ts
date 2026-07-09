import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const submitSchema = z.object({
  name: z.string().max(100).optional(),
  email: z.string().email().max(255).optional().or(z.literal("")),
  message: z.string().min(1).max(2000),
});

function getPublicClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Feedback backend is not configured. Add Supabase environment variables to enable feedback.");
  }

  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export const submitFeedback = createServerFn({ method: "POST" })
  .inputValidator((data) => submitSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = getPublicClient();
    const { error } = await supabase.from("feedback").insert({
      name: data.name || null,
      email: data.email || null,
      message: data.message,
    });
    if (error) {
      console.error("Feedback insert error:", error);
      throw new Error("Failed to send feedback. Please try again.");
    }
    return { success: true };
  });

export const listFeedback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Feedback list error:", error);
      throw new Error("Failed to load feedback.");
    }
    return data ?? [];
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = ["admin", "moderator", "user"] as const;
type Role = (typeof ROLES)[number];

async function isAdmin(userId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) {
    console.error("isAdmin lookup error:", error);
    return false;
  }
  return !!data;
}

/** Whether the caller is admin, and whether any admin exists at all. */
export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [callerAdmin, anyAdminRes] = await Promise.all([
      isAdmin(context.userId),
      supabaseAdmin
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "admin"),
    ]);
    return {
      userId: context.userId,
      isAdmin: callerAdmin,
      anyAdminExists: (anyAdminRes.count ?? 0) > 0,
    };
  });

/** Bootstrap: if no admin exists yet, the caller can claim the admin role. */
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error: countErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countErr) throw new Error("Failed to check admin status.");
    if ((count ?? 0) > 0) {
      throw new Error("An admin already exists. Ask an existing admin to grant you access.");
    }
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) {
      console.error("claimFirstAdmin insert error:", error);
      throw new Error("Failed to grant admin role.");
    }
    return { success: true };
  });

/** List all role assignments with user emails. Admin only. */
export const listUserRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdmin(context.userId))) {
      throw new Error("Forbidden");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("user_roles")
      .select("id, user_id, role, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error("Failed to load roles.");

    // Fetch emails for the involved user ids.
    const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
    const emailById = new Map<string, string>();
    await Promise.all(
      ids.map(async (id) => {
        const { data } = await supabaseAdmin.auth.admin.getUserById(id);
        if (data?.user?.email) emailById.set(id, data.user.email);
      }),
    );

    return (rows ?? []).map((r) => ({
      ...r,
      email: emailById.get(r.user_id) ?? null,
    }));
  });

const grantSchema = z.object({
  email: z.string().email().max(255),
  role: z.enum(ROLES),
});

/** Grant a role to a user identified by email. Admin only. */
export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => grantSchema.parse(data))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) {
      throw new Error("Forbidden");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find user by email via admin listUsers pagination.
    const target = await findUserByEmail(supabaseAdmin, data.email);
    if (!target) throw new Error(`No user found with email ${data.email}.`);

    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: target.id, role: data.role }, { onConflict: "user_id,role" });
    if (error) {
      console.error("grantRole error:", error);
      throw new Error("Failed to grant role.");
    }
    return { success: true, userId: target.id, email: data.email, role: data.role };
  });

const revokeSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(ROLES),
});

/** Revoke a role from a user. Admin only. Cannot revoke your own last admin role. */
export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => revokeSchema.parse(data))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) {
      throw new Error("Forbidden");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.role === "admin") {
      const { count, error: countErr } = await supabaseAdmin
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "admin");
      if (countErr) throw new Error("Failed to verify admin count.");
      if ((count ?? 0) <= 1 && data.userId === context.userId) {
        throw new Error("Cannot revoke the last remaining admin role.");
      }
    }

    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", data.role);
    if (error) {
      console.error("revokeRole error:", error);
      throw new Error("Failed to revoke role.");
    }
    return { success: true };
  });

async function findUserByEmail(admin: any, email: string) {
  const needle = email.trim().toLowerCase();
  // Paginate through auth users (up to 10 pages of 200 = 2000 users).
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error("Failed to look up user by email.");
    const users = data?.users ?? [];
    const found = users.find((u: any) => (u.email ?? "").toLowerCase() === needle);
    if (found) return found;
    if (users.length < 200) break;
  }
  return null;
}

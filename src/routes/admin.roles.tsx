import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  getAdminStatus,
  claimFirstAdmin,
  listUserRoles,
  grantRole,
  revokeRole,
} from "@/lib/admin.functions";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ShieldCheck, UserPlus, Trash2, Loader2, Crown } from "lucide-react";

type RoleName = "admin" | "moderator" | "user";

export const Route = createFileRoute("/admin/roles")({
  head: () => ({
    meta: [
      { title: "Role Management — BharatLive" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminRolesPage,
});

function AdminRolesPage() {
  const { signedIn, ready: authReady, user } = useAuth();
  const qc = useQueryClient();

  const getStatus = useServerFn(getAdminStatus);
  const doClaim = useServerFn(claimFirstAdmin);
  const doList = useServerFn(listUserRoles);
  const doGrant = useServerFn(grantRole);
  const doRevoke = useServerFn(revokeRole);

  const statusQ = useQuery({
    queryKey: ["admin", "status"],
    queryFn: () => getStatus(),
    enabled: signedIn,
  });

  const rolesQ = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: () => doList(),
    enabled: signedIn && !!statusQ.data?.isAdmin,
  });

  const claim = useMutation({
    mutationFn: () => doClaim(),
    onSuccess: () => {
      toast.success("You are now an admin.");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RoleName>("admin");

  const grant = useMutation({
    mutationFn: (v: { email: string; role: RoleName }) => doGrant({ data: v }),
    onSuccess: (res) => {
      toast.success(`Granted ${res.role} to ${res.email}.`);
      setEmail("");
      qc.invalidateQueries({ queryKey: ["admin", "roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: (v: { userId: string; role: RoleName }) => doRevoke({ data: v }),
    onSuccess: () => {
      toast.success("Role revoked.");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!authReady) {
    return (
      <CenterMessage>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </CenterMessage>
    );
  }

  if (!signedIn) {
    return (
      <CenterMessage>
        <div className="max-w-sm text-center">
          <h1 className="font-display text-2xl font-semibold">Sign in required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You must be signed in to manage roles.
          </p>
          <Link
            to="/auth"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Sign in
          </Link>
        </div>
      </CenterMessage>
    );
  }

  if (statusQ.isLoading) {
    return (
      <CenterMessage>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </CenterMessage>
    );
  }

  const status = statusQ.data;

  // Bootstrap: no admin exists yet — offer to claim.
  if (status && !status.anyAdminExists) {
    return (
      <Shell>
        <div className="rounded-2xl border border-saffron/40 bg-saffron/5 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-saffron/20 text-saffron">
            <Crown className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-semibold">Claim admin access</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            No admin has been set up yet. As the first signed-in user to visit this page,
            you can claim the admin role for <span className="font-medium text-foreground">{user?.email}</span>.
            After this, only existing admins can grant the role to others.
          </p>
          <Button
            onClick={() => claim.mutate()}
            disabled={claim.isPending}
            className="mt-6 bg-saffron hover:bg-saffron/90 text-primary-foreground"
          >
            {claim.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Crown className="mr-2 h-4 w-4" />
            )}
            Make me an admin
          </Button>
        </div>
      </Shell>
    );
  }

  // Not admin, and admin(s) already exist.
  if (!status?.isAdmin) {
    return (
      <Shell>
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <h2 className="font-display text-xl font-semibold">Admin access required</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account ({user?.email}) does not have the admin role. Ask an existing
            admin to grant you access.
          </p>
        </div>
      </Shell>
    );
  }

  const rows = rolesQ.data ?? [];

  return (
    <Shell>
      {/* Grant form */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-saffron" />
          <h2 className="font-display text-lg font-semibold">Grant a role</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          The user must have already signed up. Enter the email they signed up with.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim()) return;
            grant.mutate({ email: email.trim(), role });
          }}
          className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto]"
        >
          <Input
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={grant.isPending}
            required
          />
          <Select value={role} onValueChange={(v) => setRole(v as RoleName)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="moderator">Moderator</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="submit"
            disabled={grant.isPending}
            className="bg-saffron hover:bg-saffron/90 text-primary-foreground"
          >
            {grant.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Grant"
            )}
          </Button>
        </form>
      </div>

      {/* Roles list */}
      <div className="mt-8 rounded-xl border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold">Current roles</h2>
        </div>
        {rolesQ.isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No role assignments yet.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const isSelf = r.user_id === status.userId;
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {r.email ?? r.user_id}
                      </span>
                      {isSelf && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          you
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                        r.role === "admin"
                          ? "bg-saffron/15 text-saffron"
                          : r.role === "moderator"
                          ? "bg-india-green/15 text-india-green"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.role === "admin" && <ShieldCheck className="h-3 w-3" />}
                      {r.role}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Revoke ${r.role} from ${r.email ?? r.user_id}?`)) {
                          revoke.mutate({ userId: r.user_id, role: r.role as RoleName });
                        }
                      }}
                      disabled={revoke.isPending}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <div className="mt-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-saffron/15 text-saffron">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Role management</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Grant or revoke admin and moderator access.
            </p>
          </div>
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

function CenterMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      {children}
    </div>
  );
}

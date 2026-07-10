import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { signInWithOAuth } from "@/integrations/auth";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Sparkles, Loader2, Mail, Lock, User } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

const signUpSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(60),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
});

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(1, "Enter your password").max(72),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in â€” BharatLive" },
      { name: "description", content: "Sign in to sync your bookmarks across devices." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { signedIn, ready, user } = useAuth();
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (ready && signedIn) {
      navigate({ to: (redirect as any) ?? "/bookmarks", replace: true });
    }
  }, [ready, signedIn, redirect, navigate]);

  const onGoogle = async () => {
    setGoogleLoading(true);
    try {
      const res = await signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (res.error) {
        toast.error(res.error.message ?? "Sign-in failed");
        setGoogleLoading(false);
        return;
      }
      if (res.redirected) return;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign-in failed");
      setGoogleLoading(false);
    }
  };

  const onEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const client = getSupabaseClient();
    if (!client) {
      toast.error("Authentication is not configured yet. Add Supabase environment variables first.");
      return;
    }

    try {
      if (mode === "signup") {
        const parsed = signUpSchema.safeParse({ name, email, password });
        if (!parsed.success) {
          const errs: Record<string, string> = {};
          for (const issue of parsed.error.issues) errs[issue.path[0] as string] = issue.message;
          setErrors(errs);
          return;
        }
        setEmailLoading(true);
        const { data, error } = await client.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: { display_name: parsed.data.name },
          },
        });
        setEmailLoading(false);
        if (error) {
          const msg = error.message || (error as any).error_description || "Sign up failed. Please try again.";
          toast.error(typeof msg === "string" ? msg : JSON.stringify(error));
          return;
        }
        
        if (data.session) {
          toast.success("Account created! Welcome to BharatLive.");
        } else {
          toast.success("Account created! Check your inbox to confirm your email.");
        }
      } else {
        const parsed = signInSchema.safeParse({ email, password });
        if (!parsed.success) {
          const errs: Record<string, string> = {};
          for (const issue of parsed.error.issues) errs[issue.path[0] as string] = issue.message;
          setErrors(errs);
          return;
        }
        setEmailLoading(true);
        const { error } = await client.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        setEmailLoading(false);
        if (error) {
          const msg = error.message || (error as any).error_description || "Sign in failed. Please try again.";
          toast.error(typeof msg === "string" ? msg : JSON.stringify(error));
          return;
        }
        toast.success("Welcome back!");
      }
    } catch (err: any) {
      setEmailLoading(false);
      const msg = err?.message || "An unexpected error occurred.";
      toast.error(typeof msg === "string" ? msg : JSON.stringify(err));
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>
      </header>
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-saffron via-primary to-india-green">
          <Sparkles className="h-6 w-6 text-background" />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {mode === "signup" ? "Create your account" : "Sign in to BharatLive"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Sync your bookmarks across devices.
        </p>

        {/* Tabs */}
        <div className="mt-6 inline-flex rounded-full border border-border bg-card p-1 text-xs">
          <button
            onClick={() => { setMode("signin"); setErrors({}); }}
            className={`rounded-full px-4 py-1.5 font-medium transition ${
              mode === "signin" ? "bg-saffron text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => { setMode("signup"); setErrors({}); }}
            className={`rounded-full px-4 py-1.5 font-medium transition ${
              mode === "signup" ? "bg-saffron text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Create account
          </button>
        </div>

        {/* Email form */}
        <form onSubmit={onEmailSubmit} className="mt-6 w-full space-y-3 text-left">
          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aditya Kumar"
                  autoComplete="name"
                  maxLength={60}
                  className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-saffron/60"
                />
              </div>
              {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                maxLength={255}
                className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-saffron/60"
              />
            </div>
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                maxLength={72}
                className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-saffron/60"
              />
            </div>
            {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={emailLoading}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-saffron px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {emailLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex w-full items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          <span>or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          onClick={onGoogle}
          disabled={googleLoading}
          className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold transition hover:border-saffron/50 disabled:opacity-60"
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.5 14.7 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12S6.8 21.5 12 21.5c6.9 0 11.5-4.8 11.5-11.6 0-.8-.1-1.4-.2-2H12z"/>
            </svg>
          )}
          Continue with Google
        </button>

        {ready && signedIn && (
          <p className="mt-6 text-xs text-muted-foreground">Signed in as {user?.email}</p>
        )}
      </main>
    </div>
  );
}


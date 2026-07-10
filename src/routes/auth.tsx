import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { signInWithOAuth } from "@/integrations/auth";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Sparkles, Loader2, Mail, Lock, User } from "lucide-react";
import { toast } from "sonner";

const getErrorMsg = (err: any) => {
  if (!err) return "An unexpected error occurred.";
  if (typeof err === "string") return err;
  if (err.message) return String(err.message);
  if (err.error_description) return String(err.error_description);
  if (err.error) return String(err.error);
  if (err.status === 429) return "Too many requests. Please wait a few minutes.";
  try {
    const str = JSON.stringify(err);
    return str === "{}" ? "Rate limit exceeded or network error." : str;
  } catch {
    return "An unknown error occurred.";
  }
};

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
          toast.error(getErrorMsg(error));
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
          toast.error(getErrorMsg(error));
          return;
        }
        toast.success("Welcome back!");
      }
    } catch (err: any) {
      setEmailLoading(false);
      toast.error(getErrorMsg(err));
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
          Sign in to BharatLive
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Sync your bookmarks across devices instantly.
        </p>

        <div className="mt-8 w-full space-y-4">
          <button
            onClick={onGoogle}
            disabled={googleLoading}
            className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-border bg-card px-5 py-3.5 text-sm font-semibold transition hover:border-saffron/50 disabled:opacity-60"
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Continue with Google
          </button>
        </div>

        {ready && signedIn && (
          <p className="mt-6 text-xs text-muted-foreground">Signed in as {user?.email}</p>
        )}
      </main>
    </div>
  );
}


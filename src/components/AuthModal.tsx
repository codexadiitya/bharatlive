import { useState, useEffect } from "react";
import { signInWithOAuth } from "@/integrations/auth";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, Loader2, Mail, Lock, X } from "lucide-react";
import { toast } from "sonner";

export default function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { signedIn, ready } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    if (ready && signedIn) onClose();
  }, [ready, signedIn, onClose]);

  if (!isOpen) return null;

  const onEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const client = getSupabaseClient();
    if (!client) return toast.error("Supabase not connected");

    setLoading(true);
    let error;
    if (mode === "signup") {
      const res = await client.auth.signUp({ email, password });
      error = res.error;
      if (!error) toast.success("Account created! Check your email to confirm.");
    } else {
      const res = await client.auth.signInWithPassword({ email, password });
      error = res.error;
      if (!error) toast.success("Welcome back!");
    }
    setLoading(false);

    if (error) toast.error(error.message);
  };

  const onGoogle = async () => {
    await signInWithOAuth("google", { redirect_uri: window.location.origin });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 pt-[10vh] backdrop-blur-sm sm:items-center sm:pt-0"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-card/80 p-6 shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-3 top-3 p-1.5 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-saffron to-orange-500">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <h2 className="text-xl font-bold">{mode === "signup" ? "Create Account" : "Sign in"}</h2>
        <p className="mb-4 text-xs text-muted-foreground">Sync your bookmarks across devices.</p>

        <div className="mb-4 inline-flex w-full rounded-lg bg-muted p-1 text-xs">
          <button
            onClick={() => setMode("signin")}
            className={`w-1/2 rounded-md py-1.5 font-medium transition ${mode === "signin" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`w-1/2 rounded-md py-1.5 font-medium transition ${mode === "signup" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            Create
          </button>
        </div>

        <form onSubmit={onEmailSubmit} className="space-y-3">
          <div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm" />
            </div>
          </div>
          <div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "signup" ? "Create a password" : "Password"} required className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-saffron py-2 text-sm font-semibold text-white hover:opacity-90">
            {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : (mode === "signup" ? "Sign Up" : "Sign in")}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-[10px] uppercase text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>

        <button onClick={onGoogle} className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background py-2 text-sm font-medium hover:bg-muted">
          <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.5 14.7 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12S6.8 21.5 12 21.5c6.9 0 11.5-4.8 11.5-11.6 0-.8-.1-1.4-.2-2H12z"/></svg>
          Google
        </button>
      </div>
    </div>
  );
}

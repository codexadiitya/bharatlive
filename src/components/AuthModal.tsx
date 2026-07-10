import { useState, useEffect } from "react";
import { signInWithOAuth } from "@/integrations/auth";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, Loader2, X } from "lucide-react";

export default function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { signedIn, ready } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (ready && signedIn) onClose();
  }, [ready, signedIn, onClose]);

  if (!isOpen) return null;

  const onGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithOAuth("google", { redirect_uri: window.location.origin });
    } catch {
      setGoogleLoading(false);
    }
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
        <h2 className="text-xl font-bold">Sign in to BharatLive</h2>
        <p className="mb-6 text-xs text-muted-foreground">Sync your bookmarks across devices instantly.</p>

        <button 
          onClick={onGoogle} 
          disabled={googleLoading}
          className="flex w-full items-center justify-center gap-3 rounded-full border border-border bg-background py-3 text-sm font-semibold transition hover:border-saffron/50 hover:bg-muted disabled:opacity-60"
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          Continue with Google
        </button>
      </div>
    </div>
  );
}

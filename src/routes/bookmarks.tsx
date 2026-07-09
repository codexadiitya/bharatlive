import { createFileRoute, Link } from "@tanstack/react-router";
import NewsCard from "@/components/NewsCard";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Bookmark, Trash2, Cloud, CloudOff, LogIn } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/bookmarks")({
  head: () => ({
    meta: [
      { title: "Your Bookmarks — BharatLive" },
      { name: "description", content: "Stories you saved to read later." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BookmarksPage,
});

function BookmarksPage() {
  const { items, ready, clear, count, synced } = useBookmarks();
  const { signedIn } = useAuth();
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to feed
          </Link>
          {count > 0 && (
            <button
              onClick={() => {
                if (confirmClear) {
                  clear();
                  setConfirmClear(false);
                  toast.success("All bookmarks cleared");
                } else {
                  setConfirmClear(true);
                  setTimeout(() => setConfirmClear(false), 3000);
                }
              }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
                confirmClear
                  ? "border-destructive bg-destructive text-destructive-foreground"
                  : "border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive"
              }`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {confirmClear ? "Tap again to confirm" : "Clear all"}
            </button>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-saffron/15 text-saffron">
            <Bookmark className="h-5 w-5" fill="currentColor" />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-3xl font-bold tracking-tight">Bookmarks</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {ready ? (
                <>
                  <span>{count} saved {count === 1 ? "story" : "stories"}</span>
                  {synced ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-india-green/15 px-2 py-0.5 text-[11px] text-india-green">
                      <Cloud className="h-3 w-3" /> Synced to cloud
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]">
                      <CloudOff className="h-3 w-3" /> On this device only
                    </span>
                  )}
                </>
              ) : (
                "Loading…"
              )}
            </p>
            {!signedIn && ready && (
              <Link
                to="/auth"
                search={{ redirect: "/bookmarks" }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-saffron px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
              >
                <LogIn className="h-3 w-3" /> Sign in to sync across devices
              </Link>
            )}
          </div>
        </div>

        {!ready ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-xl border border-border bg-card/40"
              />
            ))}
          </div>
        ) : count === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-20 text-center">
            <Bookmark className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              You haven't bookmarked any stories yet. Tap the bookmark icon on any story to save it.
            </p>
            <Link
              to="/"
              className="mt-6 inline-block rounded-full bg-saffron px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Browse the feed
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((n) => (
              <NewsCard key={n.id} item={n} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

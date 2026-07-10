import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { sportsQueryOptions, type SportFilter } from "@/lib/external-news-query";
import type { ExternalArticle } from "@/lib/external-news.functions";
import { redditQueryOptions } from "@/lib/external-news-query";
import ThemeToggle from "@/components/ThemeToggle";
import LangToggle from "@/components/LangToggle";
import { useLang } from "@/hooks/useLang";
import { ArrowLeft, ExternalLink, AlertCircle, Trophy, MessageSquare, ArrowUp, RefreshCw } from "lucide-react";

const SPORTS: { id: SportFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "cricket", label: "Cricket" },
  { id: "football", label: "Football" },
  { id: "hockey", label: "Hockey" },
  { id: "tennis", label: "Tennis" },
  { id: "kabaddi", label: "Kabaddi" },
  { id: "olympics", label: "Olympics" },
];

export const Route = createFileRoute("/sports")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(sportsQueryOptions("en", "all"));
    context.queryClient.prefetchQuery(redditQueryOptions("sports"));
  },
  head: () => ({
    meta: [
      { title: "Sports — Live from India | BharatLive" },
      {
        name: "description",
        content:
          "All Indian sports news in one place: cricket, football, hockey, tennis, kabaddi and more. Plus live community reactions from Reddit.",
      },
      { property: "og:title", content: "Sports — Live from India" },
      {
        property: "og:description",
        content: "Cricket, football, hockey, tennis and more — the full Indian sports feed.",
      },
    ],
  }),
  component: SportsPage,
});

function SportsPage() {
  const { lang } = useLang();
  const [sport, setSport] = useState<SportFilter>("all");
  const news = useQuery(sportsQueryOptions(lang, sport));
  const reddit = useQuery(redditQueryOptions("sports"));

  const items = news.data?.items ?? [];
  const redditItems = (reddit.data?.items ?? []).slice(0, 6);
  const isFallback = news.isError || news.data?.fallback === true;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <div className="flex items-center gap-2">
            <LangToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-india-green/40 bg-india-green/10 px-3 py-1 text-xs font-medium text-india-green">
            <Trophy className="h-3 w-3" /> Sports Desk
          </span>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">
            All the <span className="text-india-green">Indian sports</span>. One feed.
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Live headlines from the pitch, court, ring and field — plus what people are saying on X.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {SPORTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSport(s.id)}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                sport === s.id
                  ? "border-india-green bg-india-green text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-india-green/50 hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>



        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <h2 className="mb-4 font-display text-xl font-semibold">Headlines</h2>
            {news.isLoading && items.length === 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-44 animate-pulse rounded-xl border border-border bg-card/40" />
                ))}
              </div>
            ) : news.isError && items.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-destructive/40 bg-destructive/5 py-12 text-center text-sm">
                <AlertCircle className="h-6 w-6 text-destructive" />
                <p className="text-muted-foreground">Couldn't load sports news.</p>
                <button
                  onClick={() => news.refetch()}
                  disabled={news.isFetching}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium transition hover:border-saffron/50 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${news.isFetching ? "animate-spin" : ""}`} />
                  Retry
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
                No sports stories right now.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {items.map((a) => (
                  <SportsCard key={a.id} article={a} />
                ))}
              </div>
            )}
          </div>

          <aside>
            <h2 className="mb-4 font-display text-xl font-semibold">What people say on X</h2>
            {reddit.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card/40" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {redditItems.map((p) => (
                  <a
                    key={p.id}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl border border-border bg-card p-3 transition hover:border-saffron/50"
                  >
                    <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold text-muted-foreground">
                      <span className="text-foreground">𝕏 User</span>
                      <span>@{p.source.replace("r/", "").toLowerCase()}_fan</span>
                    </div>
                    <div className="text-sm leading-snug">{p.title}</div>
                    <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1 hover:text-india-green">
                        <MessageSquare className="h-3 w-3" />
                        {p.comments}
                      </span>
                      <span className="inline-flex items-center gap-1 hover:text-red-500">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                        {p.score}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}

function SportsCard({ article }: { article: ExternalArticle }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:border-india-green/50 hover:shadow-lg"
    >
      {article.thumbnail && (
        <img
          src={article.thumbnail}
          alt=""
          loading="lazy"
          className="h-40 w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          {article.source}
        </div>
        <h3 className="font-display text-base font-semibold leading-snug group-hover:text-india-green">
          {article.title}
        </h3>
        {article.summary && (
          <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{article.summary}</p>
        )}
        <div className="mt-auto pt-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
            Read <ExternalLink className="h-3 w-3" />
          </span>
        </div>
      </div>
    </a>
  );
}

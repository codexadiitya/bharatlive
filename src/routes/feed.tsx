import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MOCK_NEWS, type NewsCategory } from "@/lib/mock-news";
import { newsQueryOptions } from "@/lib/news-query";
import NewsCard from "@/components/NewsCard";
import { NewsCardSkeletonGrid } from "@/components/NewsCardSkeleton";
import { T, useLang, CATEGORY_HI } from "@/hooks/useLang";
import { ArrowLeft, Search, AlertCircle, RefreshCw } from "lucide-react";

const CATEGORIES: (NewsCategory | "All")[] = ["All", "Politics", "Business", "Tech", "Sports", "Culture"];

export const Route = createFileRoute("/feed")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(newsQueryOptions("en"));
  },
  head: () => ({
    meta: [
      { title: "Live Feed — BharatLive" },
      { name: "description", content: "All India live feed: politics, business, tech, sports and culture from every state." },
      { property: "og:title", content: "Live Feed — BharatLive" },
      { property: "og:description", content: "Every state, every beat — one live feed." },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
  const [category, setCategory] = useState<NewsCategory | "All">("All");
  const [query, setQuery] = useState("");
  const { lang } = useLang();
  const t = T[lang];

  const { data, isLoading, isError, isFetching, refetch } = useQuery(newsQueryOptions(lang));
  const hasData = !!data?.items?.length;
  const news = data?.items ?? MOCK_NEWS;
  const isFallback = data?.fallback === true;
  const showSkeleton = isLoading && !hasData;
  const showHardError = isError && !hasData;


  const filtered = useMemo(
    () =>
      news.filter((n) => {
        if (category !== "All" && n.category !== category) return false;
        if (query && !`${n.title} ${n.summary}`.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      }),
    [news, category, query],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-saffron">
          <ArrowLeft className="h-4 w-4" /> {t.backHome}
        </Link>

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">{t.allIndiaLive}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>
                {filtered.length} {filtered.length === 1 ? t.story : t.storiesPlural}
              </span>
              {isLoading && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                  {t.loadingFeed}
                </span>
              )}
              {isFallback && !isLoading && (
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] text-destructive">
                  <AlertCircle className="h-3 w-3" /> {t.showingSample}
                </span>
              )}
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchHead}
              className="w-full rounded-full border border-border bg-card py-2.5 pl-9 pr-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-saffron/60"
            />
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                category === c
                  ? "border-saffron bg-saffron text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-saffron/50 hover:text-foreground"
              }`}
            >
              {lang === "hi" ? CATEGORY_HI[c] ?? c : c}
            </button>
          ))}
        </div>

        {showSkeleton ? (
          <NewsCardSkeletonGrid count={6} />
        ) : showHardError ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-destructive/40 bg-destructive/5 py-12 text-center text-sm">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <p className="text-muted-foreground">
              {lang === "hi" ? "समाचार लोड नहीं हो सका।" : "Couldn't load the latest news."}
            </p>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium transition hover:border-saffron/50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              {t.refresh}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            {t.noMatch}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((n) => (
              <NewsCard key={n.id} item={n} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

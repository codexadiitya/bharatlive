import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { INDIA_STATES, MOCK_NEWS, type NewsItem } from "@/lib/mock-news";
import { newsQueryOptions, stateNewsQueryOptions } from "@/lib/news-query";

import NewsCard from "@/components/NewsCard";
import { NewsCardSkeletonGrid } from "@/components/NewsCardSkeleton";
import LangToggle from "@/components/LangToggle";
import ThemeToggle from "@/components/ThemeToggle";
import { ArrowLeft, MapPin, Newspaper, Building2, AlertCircle, RefreshCw } from "lucide-react";
import { T, useLang } from "@/hooks/useLang";

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

export const Route = createFileRoute("/state/$code")({
  loader: ({ params, context }) => {
    const state = INDIA_STATES.find((s) => slugify(s.name) === params.code);
    if (!state) throw notFound();
    // Prime the shared news cache; component reads it via useQuery.
    context.queryClient.prefetchQuery(newsQueryOptions("en"));
    return { state };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "State not found — BharatLive" }, { name: "robots", content: "noindex" }] };
    }
    const { state } = loaderData;
    return {
      meta: [
        { title: `${state.name} Live News — BharatLive` },
        { name: "description", content: `Live headlines from ${state.name}. Capital: ${state.capital}.` },
        { property: "og:title", content: `${state.name} — Live News` },
      ],
    };
  },
  notFoundComponent: NotFound,
  component: StatePage,
});

function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-3xl font-bold">State not found</h1>
      <Link to="/" className="mt-6 rounded-full bg-saffron px-5 py-2.5 text-sm font-semibold text-primary-foreground">
        Back home
      </Link>
    </div>
  );
}

function StatePage() {
  const { state } = Route.useLoaderData();
  const { lang } = useLang();
  const t = T[lang];

  const { data, isLoading, isError, isFetching, refetch } = useQuery(newsQueryOptions(lang));
  const hasCountryData = !!data?.items?.length;
  const allNews: NewsItem[] = data?.items ?? MOCK_NEWS;
  const isFallback = data?.fallback === true;
  const fromCountry = allNews.filter((n) => n.state === state.name);

  // If the country-wide feed has nothing for this state, ask for state-specific headlines.
  const stateQuery = useQuery({
    ...stateNewsQueryOptions(state.name, lang),
    enabled: !isLoading && fromCountry.length === 0,
  });
  const news = fromCountry.length > 0 ? fromCountry : stateQuery.data?.items ?? [];
  const showSkeleton =
    (isLoading && !hasCountryData) ||
    (fromCountry.length === 0 && stateQuery.isLoading && !stateQuery.data);
  const showHardError =
    isError && !hasCountryData && (stateQuery.isError || !stateQuery.data);



  const byCat: Record<string, number> = {};
  for (const n of news) byCat[n.category] = (byCat[n.category] ?? 0) + 1;
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            {t.backHome}
          </Link>
          <div className="flex items-center gap-2">
            <LangToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 bg-gradient-to-br from-saffron/10 via-transparent to-india-green/10" />
        <div className="relative mx-auto max-w-7xl px-6 py-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-saffron/40 bg-saffron/10 px-3 py-1 text-xs font-medium text-saffron">
            <MapPin className="h-3 w-3" /> {state.code}
          </span>
          <h1 className="mt-4 font-display text-5xl font-bold tracking-tight md:text-6xl">
            {state.name}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">{t.liveNews(state.name)}</p>
          <div className="mt-8 grid max-w-2xl grid-cols-3 gap-6 border-t border-border/60 pt-6">
            <Stat icon={<Building2 className="h-4 w-4" />} label={t.capital} value={state.capital} />
            <Stat icon={<Newspaper className="h-4 w-4" />} label={t.stories} value={String(news.length)} />
            <Stat icon={<MapPin className="h-4 w-4" />} label={t.topBeat} value={topCat} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <h2 className="font-display text-2xl font-bold">{t.latestFrom(state.name)}</h2>
          {isLoading && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
              {lang === "hi" ? "लोड हो रहा है…" : "Loading…"}
            </span>
          )}

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
              onClick={() => {
                refetch();
                stateQuery.refetch();
              }}
              disabled={isFetching || stateQuery.isFetching}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium transition hover:border-saffron/50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching || stateQuery.isFetching ? "animate-spin" : ""}`} />
              {lang === "hi" ? "पुनः प्रयास" : "Retry"}
            </button>
          </div>
        ) : news.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            {t.noStories(state.name)}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {news.map((n) => (
              <NewsCard key={n.id} item={n} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-display text-xl font-bold">{value}</div>
    </div>
  );
}

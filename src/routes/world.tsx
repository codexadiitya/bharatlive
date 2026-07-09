import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { worldQueryOptions, type WorldRegion } from "@/lib/external-news-query";
import type { ExternalArticle } from "@/lib/external-news.functions";
import ThemeToggle from "@/components/ThemeToggle";
import LangToggle from "@/components/LangToggle";
import { useLang } from "@/hooks/useLang";
import { ArrowLeft, ExternalLink, AlertCircle, Globe2, RefreshCw } from "lucide-react";

const REGIONS: { id: WorldRegion; label: string; flag: string }[] = [
  { id: "all", label: "All World", flag: "🌍" },
  { id: "us", label: "USA", flag: "🇺🇸" },
  { id: "gb", label: "UK", flag: "🇬🇧" },
  { id: "eu", label: "Europe", flag: "🇪🇺" },
  { id: "asia", label: "Asia", flag: "🌏" },
  { id: "middle_east", label: "Middle East", flag: "🕌" },
  { id: "africa", label: "Africa", flag: "🌍" },
  { id: "americas", label: "Americas", flag: "🌎" },
];

export const Route = createFileRoute("/world")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(worldQueryOptions("en", "all"));
  },
  head: () => ({
    meta: [
      { title: "World News — Global headlines | BharatLive" },
      {
        name: "description",
        content:
          "Global news for Indian readers: USA, UK, Europe, Asia, Middle East, Africa and the Americas — headlines plus Reddit community reactions.",
      },
      { property: "og:title", content: "World News — Global headlines" },
      {
        property: "og:description",
        content: "Trusted global headlines and Reddit community discussion, curated for Indian readers.",
      },
    ],
  }),
  component: WorldPage,
});

function WorldPage() {
  const { lang } = useLang();
  const [region, setRegion] = useState<WorldRegion>("all");
  const world = useQuery(worldQueryOptions(lang, region));

  const items = world.data?.items ?? [];
  const isFallback = world.isError || world.data?.fallback === true;

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
          <span className="inline-flex items-center gap-2 rounded-full border border-chakra/40 bg-chakra/10 px-3 py-1 text-xs font-medium text-chakra">
            <Globe2 className="h-3 w-3" /> World Desk
          </span>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">
            The <span className="text-chakra">world</span>, in one feed.
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Global headlines from trusted wires and top community discussion — curated for Indian readers.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {REGIONS.map((r) => (
            <button
              key={r.id}
              onClick={() => setRegion(r.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition ${
                region === r.id
                  ? "border-chakra bg-chakra text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-chakra/50 hover:text-foreground"
              }`}
            >
              <span aria-hidden>{r.flag}</span>
              {r.label}
            </button>
          ))}
        </div>

        {isFallback && !world.isLoading && items.length > 0 && (
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-saffron/10 px-3 py-1 text-xs text-saffron">
            <AlertCircle className="h-3 w-3" />
            Wire feed at limit — showing top global stories from Reddit.
          </div>
        )}

        {world.isLoading && items.length === 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl border border-border bg-card/40" />
            ))}
          </div>
        ) : world.isError && items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-destructive/40 bg-destructive/5 py-12 text-center text-sm">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <p className="text-muted-foreground">Couldn't load world news.</p>
            <button
              onClick={() => world.refetch()}
              disabled={world.isFetching}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium transition hover:border-chakra/50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${world.isFetching ? "animate-spin" : ""}`} />
              Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            No world stories right now.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((a) => (
              <WorldCard key={a.id} article={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function WorldCard({ article }: { article: ExternalArticle }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:border-chakra/50 hover:shadow-lg"
    >
      {article.thumbnail && (
        <img
          src={article.thumbnail}
          alt=""
          loading="lazy"
          className="h-44 w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          {article.source}
        </div>
        <h3 className="font-display text-base font-semibold leading-snug group-hover:text-chakra">
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

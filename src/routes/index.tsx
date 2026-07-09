import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MOCK_NEWS, type NewsCategory, type StateInfo } from "@/lib/mock-news";
import { newsQueryOptions } from "@/lib/news-query";
import { weatherQueryOptions } from "@/lib/weather-query";
import NewsCard from "@/components/NewsCard";
import { NewsCardSkeletonGrid } from "@/components/NewsCardSkeleton";
import IndiaMap from "@/components/IndiaMap";
import StateList from "@/components/StateList";
import ThemeToggle from "@/components/ThemeToggle";
import LangToggle from "@/components/LangToggle";
import { T, useLang, CATEGORY_HI } from "@/hooks/useLang";
import { usePreferences } from "@/hooks/usePreferences";
import { useAuth } from "@/hooks/useAuth";

import { Search, Radio, Sparkles, Bookmark, AlertCircle, Wand2, RotateCcw, LogIn, LogOut, Trophy, Globe2, Menu, X, RefreshCw, Bot, MessageSquare } from "lucide-react";
import Logo from "@/components/Logo";
import WeatherWidget from "@/components/WeatherWidget";
import FeedbackForm from "@/components/FeedbackForm";
import AuthModal from "@/components/AuthModal";


const CATEGORIES: (NewsCategory | "All")[] = ["All", "Politics", "Business", "Tech", "Sports", "Culture"];

export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    // Prime caches during SSR/navigation; don't await so slow APIs can't block render.
    context.queryClient.prefetchQuery(newsQueryOptions("en"));
    context.queryClient.prefetchQuery(weatherQueryOptions(28.61, 77.2));
  },
  head: () => ({
    meta: [
      { title: "BharatLive — India, one click at a time" },
      {
        name: "description",
        content:
          "Explore live news from every Indian state on an interactive 3D globe. Real-time headlines, filtered by region, category, and source.",
      },
      { property: "og:title", content: "BharatLive — India, one click at a time" },
      {
        property: "og:description",
        content: "An interactive 3D India news explorer. Click any state to see what's happening right now.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selected, setSelected] = useState<StateInfo | null>(null);
  const [category, setCategory] = useState<NewsCategory | "All">("All");
  const [query, setQuery] = useState("");
  const [forYou, setForYou] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { lang } = useLang();
  const t = T[lang];
  const { rank, hasSignal, topCategories, topStates, reset, prefs } = usePreferences();
  const { signedIn, user, signOut } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, isFetching, refetch } = useQuery(newsQueryOptions(lang));
  const hasData = !!data?.items?.length;
  const news = data?.items ?? MOCK_NEWS;
  const isFallback = data?.fallback === true;
  const showSkeleton = isLoading && !hasData;
  const showHardError = isError && !hasData;

  const filtered = useMemo(() => {
    const base = news.filter((n) => {
      if (selected && n.state !== selected.name) return false;
      if (category !== "All" && n.category !== category) return false;
      if (query && !(`${n.title} ${n.summary}`.toLowerCase().includes(query.toLowerCase()))) return false;
      return true;
    });
    return forYou && hasSignal ? rank(base) : base;
  }, [news, selected, category, query, forYou, hasSignal, rank]);

  const tickerItems = news.slice(0, 8);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top nav — editorial masthead with live ticker sub-row */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[auto_1fr_auto]">
          {/* Brand */}
          <Link to="/" className="group flex min-w-0 items-center gap-2">
            <Logo className="h-8 w-auto shrink-0 transition-transform group-hover:scale-105 sm:h-9" />
          </Link>

          {/* Primary nav */}
          <nav className="hidden items-center justify-center gap-8 text-sm font-medium text-foreground/80 lg:flex">
            <Link to="/explore" className="transition-colors hover:text-saffron">{t.explore}</Link>
            <Link to="/feed" className="transition-colors hover:text-saffron">{t.feed}</Link>
            <Link to="/sports" className="inline-flex items-center gap-1.5 transition-colors hover:text-saffron">
              <Trophy className="h-4 w-4" /> {t.sports}
            </Link>
            <Link to="/world" className="inline-flex items-center gap-1.5 transition-colors hover:text-saffron">
              <Globe2 className="h-4 w-4" /> {t.world}
            </Link>
            <Link to="/bot" className="inline-flex items-center gap-1.5 transition-colors hover:text-saffron">
              <Bot className="h-4 w-4" /> Bot
            </Link>
            <a href="#about" className="text-muted-foreground transition-colors hover:text-foreground">{t.about}</a>
          </nav>

          {/* Utilities */}
          <div className="flex items-center gap-2 sm:gap-3">
            <LangToggle />
            <div className="hidden h-6 w-px bg-border/70 sm:block" />
            <Link
              to="/bookmarks"
              aria-label={T[lang].bookmarks}
              className="hidden text-muted-foreground transition-colors hover:text-saffron sm:inline-flex"
            >
              <Bookmark className="h-[18px] w-[18px]" />
            </Link>
            <ThemeToggle />
            {signedIn ? (
              <button
                onClick={signOut}
                title={user?.email ?? ""}
                className="ml-1 hidden items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-background shadow-lg shadow-foreground/10 transition-all hover:bg-saffron hover:text-primary-foreground active:scale-95 sm:inline-flex"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.signOut}</span>
              </button>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="ml-1 hidden items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-background shadow-lg shadow-foreground/10 transition-all hover:bg-saffron hover:text-primary-foreground active:scale-95 sm:inline-flex"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.signIn}</span>
              </button>
            )}
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition hover:border-saffron/50 lg:hidden"
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile nav panel */}
        {menuOpen && (
          <div className="border-t border-border/60 bg-background/95 backdrop-blur-xl lg:hidden">
            <nav className="mx-auto flex max-w-7xl flex-col px-4 py-3 text-sm font-medium sm:px-6">
              <Link to="/explore" onClick={() => setMenuOpen(false)} className="rounded-md px-2 py-2.5 transition-colors hover:bg-card hover:text-saffron">{t.explore}</Link>
              <Link to="/feed" onClick={() => setMenuOpen(false)} className="rounded-md px-2 py-2.5 transition-colors hover:bg-card hover:text-saffron">{t.feed}</Link>
              <Link to="/sports" onClick={() => setMenuOpen(false)} className="inline-flex items-center gap-2 rounded-md px-2 py-2.5 transition-colors hover:bg-card hover:text-saffron">
                <Trophy className="h-4 w-4" /> {t.sports}
              </Link>
              <Link to="/world" onClick={() => setMenuOpen(false)} className="inline-flex items-center gap-2 rounded-md px-2 py-2.5 transition-colors hover:bg-card hover:text-saffron">
                <Globe2 className="h-4 w-4" /> {t.world}
              </Link>
              <Link to="/bot" onClick={() => setMenuOpen(false)} className="inline-flex items-center gap-2 rounded-md px-2 py-2.5 transition-colors hover:bg-card hover:text-saffron">
                <Bot className="h-4 w-4" /> Bot
              </Link>
              <Link to="/bookmarks" onClick={() => setMenuOpen(false)} className="inline-flex items-center gap-2 rounded-md px-2 py-2.5 transition-colors hover:bg-card hover:text-saffron">
                <Bookmark className="h-4 w-4" /> {t.bookmarks}
              </Link>
              <div className="mt-2 border-t border-border/60 pt-3">
                {signedIn ? (
                  <button
                    onClick={() => { setMenuOpen(false); signOut(); }}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-foreground px-4 py-2.5 text-xs font-semibold text-background"
                  >
                    <LogOut className="h-3.5 w-3.5" /> {t.signOut}
                  </button>
                ) : (
                  <Link
                    to="/auth"
                    onClick={() => setMenuOpen(false)}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-foreground px-4 py-2.5 text-xs font-semibold text-background"
                  >
                    <LogIn className="h-3.5 w-3.5" /> {t.signIn}
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}

        {/* Live ticker sub-header */}
        <div className="border-t border-border/40 bg-card/60 overflow-hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2 sm:px-6">
            <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-saffron">
              <Radio className="h-3 w-3" /> {t.breaking}
            </span>
            <div className="relative min-w-0 flex-1 overflow-hidden">
              <div className="flex w-max animate-ticker gap-10 whitespace-nowrap text-[13px] text-muted-foreground">
                {[...tickerItems, ...tickerItems].map((n, i) => (
                  <span key={i}>
                    <span className="font-semibold text-foreground">{n.city}</span> · {n.title}
                  </span>
                ))}
              </div>
            </div>
            <span className="hidden shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-india-green md:inline-flex">
              <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-india-green" />
              {T[lang].live}
            </span>
          </div>
        </div>
      </header>



      {/* Hero + globe */}
      <section id="explore" className="mx-auto max-w-7xl px-6 py-12 md:py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-saffron/40 bg-saffron/10 px-3 py-1 text-xs font-medium text-saffron">
              {t.interactiveBadge}
            </span>
            <h1 className="mt-5 font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              {t.heroLead} <span className="text-saffron">{t.heroClick}</span> {t.heroTail}
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
              {t.heroDesc}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#feed"
                className="rounded-full bg-saffron px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                {t.readFeed}
              </a>
              <button
                onClick={() => setSelected(null)}
                className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium transition hover:border-saffron/50"
              >
                {t.resetView}
              </button>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 border-t border-border/60 pt-6">
              <Stat label={t.states} value="28+" />
              <Stat label={t.sources} value="40+" />
              <Stat label={t.refresh} value={lang === "hi" ? "5 मि" : "5 min"} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
            <div className="relative aspect-[10/11] w-full">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-saffron/20 via-transparent to-india-green/20 blur-3xl" />
              <IndiaMap onSelect={setSelected} selected={selected} />
              {selected && (
                <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-saffron/40 bg-background/90 px-4 py-1.5 text-xs backdrop-blur-md">
                  <span className="text-muted-foreground">{t.viewing}</span>{" "}
                  <span className="font-semibold text-saffron">{selected.name}</span>
                </div>
              )}
            </div>
            <div className="flex h-[420px] flex-col gap-4 sm:h-auto sm:max-h-[560px]">
              <div className="min-h-0 flex-1 overflow-hidden">
                <StateList onSelect={setSelected} selected={selected} />
              </div>
              <WeatherWidget
                lat={selected?.lat ?? 28.61}
                lng={selected?.lng ?? 77.20}
                place={selected ? `${selected.capital}, ${selected.name}` : t.newDelhi}
              />
            </div>
          </div>


        </div>
      </section>

      {/* Feed */}
      <section id="feed" className="mx-auto max-w-7xl px-6 pb-24">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight">
              {selected ? `${selected.name} · ${t.live}` : t.allIndiaLive}
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
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
                  <AlertCircle className="h-3 w-3" />
                  {t.showingSample}
                </span>
              )}
            </p>
          </div>
          <div className="flex w-full max-w-sm items-center gap-2">
            <button
              type="button"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["news", lang] })}
              disabled={isLoading}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2.5 text-xs font-medium text-muted-foreground transition hover:border-saffron/50 hover:text-foreground disabled:opacity-50"
              title={t.refresh}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{t.refresh}</span>
            </button>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.searchHead}
                className="w-full rounded-full border border-border bg-card py-2.5 pl-9 pr-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-saffron/60"
              />
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setForYou((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition ${
              forYou
                ? "border-chakra bg-chakra text-primary-foreground"
                : "border-chakra/40 bg-chakra/10 text-chakra hover:bg-chakra/20"
            }`}
            title={hasSignal ? undefined : t.forYouTitle}
          >
            <Wand2 className="h-3.5 w-3.5" />
            {t.forYou}
            {forYou && hasSignal && <span className="ml-1 text-[10px] opacity-80">AI</span>}
          </button>
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

        {forYou && hasSignal && (
          <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-chakra/30 bg-chakra/5 px-4 py-3 text-xs">
            <span className="font-semibold text-chakra">
              {t.yourInterests}
            </span>
            {topCategories.map(([name]) => (
              <span key={`c-${name}`} className="rounded-full bg-saffron/15 px-2 py-0.5 text-saffron">
                {lang === "hi" ? CATEGORY_HI[name] ?? name : name}
              </span>
            ))}
            {topStates.map(([name]) => (
              <span key={`s-${name}`} className="rounded-full bg-india-green/15 px-2 py-0.5 text-india-green">
                {name}
              </span>
            ))}
            <span className="text-muted-foreground">
              · {prefs.events} {t.signals}
            </span>
            <button
              onClick={reset}
              className="ml-auto inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              {t.reset}
            </button>
          </div>
        )}

        {forYou && !hasSignal && (
          <div className="mb-6 rounded-xl border border-dashed border-chakra/40 bg-chakra/5 px-4 py-3 text-xs text-muted-foreground">
            {t.forYouHint}
          </div>
        )}


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
      </section>

      <section id="about" className="border-t border-border/60 bg-card/30">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight">BharatLive</h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                {t.footerBlurb}
              </p>
            </div>
            <FeedbackForm
              labels={{
                title: t.feedbackTitle,
                subtitle: t.feedbackSubtitle,
                name: t.feedbackName,
                email: t.feedbackEmail,
                message: t.feedbackMessage,
                send: t.feedbackSend,
                sending: t.feedbackSending,
                success: t.feedbackSuccess,
                error: t.feedbackError,
              }}
            />
          </div>

          <div className="mt-8 rounded-xl border border-border/60 bg-card/50 p-5">
            <h3 className="text-sm font-semibold text-foreground">Contact the Admin</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Found a bug, have a story tip, or just want to say hi? Ping me on Discord — I read every message.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a
                href="discord://-/users/854936390303612949"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                <MessageSquare className="h-4 w-4" />
                Open in Discord
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText("854936390303612949");
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-xs font-medium text-foreground transition hover:bg-background"
                title="Copy my Discord user ID"
              >
                Copy ID: 854936390303612949
              </button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              In Discord, paste the ID in the search bar (or use "Add Friend") to reach me directly.
            </p>
          </div>
        </div>
        <div className="border-t border-border/40">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-6 py-6 text-sm text-muted-foreground md:flex-row md:items-center">
            <p>
              <span className="font-semibold text-foreground">BharatLive</span> · {t.footerBlurb}
            </p>
            <p>© {new Date().getFullYear()}</p>
          </div>
        </div>
      </section>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-display text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

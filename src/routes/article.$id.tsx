import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { MOCK_NEWS, timeAgo, newsImage, type NewsItem } from "@/lib/mock-news";
import { newsQueryOptions } from "@/lib/news-query";
import { ArrowLeft, MapPin, Bookmark, Share2 } from "lucide-react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { usePreferences } from "@/hooks/usePreferences";
import { useLang } from "@/hooks/useLang";
import { useQuery } from "@tanstack/react-query";
import { generateFullArticle } from "@/lib/article.functions";
import { useEffect } from "react";
import { toast } from "sonner";
import NewsCard from "@/components/NewsCard";

export const Route = createFileRoute("/article/$id")({
  loader: async ({ params, context }) => {
    const data = await context.queryClient.ensureQueryData(newsQueryOptions("en"));
    const item =
      data.items.find((n) => n.id === params.id) ??
      MOCK_NEWS.find((n) => n.id === params.id);
    if (!item) throw notFound();
    const related = data.items.filter((n) => n.state === item.state && n.id !== item.id).slice(0, 3);
    return { item, related };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Story not found — BharatLive" }, { name: "robots", content: "noindex" }] };
    }
    const { item } = loaderData;
    return {
      meta: [
        { title: `${item.title} — BharatLive` },
        { name: "description", content: item.summary },
        { property: "og:title", content: item.title },
        { property: "og:description", content: item.summary },
        { property: "og:type", content: "article" },
        ...(newsImage(item) ? [
          { property: "og:image", content: newsImage(item)! },
          { name: "twitter:card", content: "summary_large_image" },
          { name: "twitter:image", content: newsImage(item)! },
        ] : []),
      ],
    };
  },
  notFoundComponent: NotFound,
  component: ArticlePage,
});

function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-3xl font-bold">Story not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">The article you're looking for doesn't exist.</p>
      <Link to="/" className="mt-6 rounded-full bg-saffron px-5 py-2.5 text-sm font-semibold text-primary-foreground">
        Back to feed
      </Link>
    </div>
  );
}

function ArticlePage() {
  const { item, related } = Route.useLoaderData();
  const { has, toggle } = useBookmarks();
  const { log } = usePreferences();
  const { lang } = useLang();
  const saved = has(item.id);

  const articleQuery = useQuery({
    queryKey: ["article-body", item.id, lang],
    queryFn: () => generateFullArticle({
      data: {
        title: item.title,
        summary: item.summary,
        source: item.source,
        city: item.city,
        state: item.state,
        lang
      }
    })
  });

  useEffect(() => {
    log(item, "view");
    const t = setTimeout(() => log(item, "dwell"), 10_000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const onShare = async () => {
    log(item, "share");
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: item.title, text: item.summary, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      }
    } catch {}
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            {lang === "hi" ? "फ़ीड पर वापस" : "Back to feed"}
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const nowSaved = toggle(item);
                toast.success(nowSaved ? "Bookmarked" : "Removed from bookmarks");
              }}
              className={`inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs transition hover:border-saffron/50 ${
                saved ? "text-saffron" : ""
              }`}
            >
              <Bookmark className="h-3.5 w-3.5" fill={saved ? "currentColor" : "none"} />
              {saved ? (lang === "hi" ? "सहेजा गया" : "Saved") : (lang === "hi" ? "सहेजें" : "Save")}
            </button>
            <button
              onClick={onShare}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs transition hover:border-saffron/50"
            >
              <Share2 className="h-3.5 w-3.5" />
              {lang === "hi" ? "साझा करें" : "Share"}
            </button>
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-saffron/30 bg-saffron/10 px-2.5 py-0.5 font-medium text-saffron">
            {item.category}
          </span>
          <Link
            to="/state/$code"
            params={{ code: item.state.toLowerCase().replace(/\s+/g, "-") }}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <MapPin className="h-3 w-3" />
            {item.city}, {item.state}
          </Link>
          <span className="text-muted-foreground">· {timeAgo(item.publishedAt)}</span>
          <span className="text-muted-foreground">· {item.source}</span>
        </div>

        <h1 className="font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          {item.title}
        </h1>

        {newsImage(item) && (
          <div className="mt-8 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border bg-muted">
            <img
              src={newsImage(item)!}
              alt={item.title}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.parentElement!.style.display = "none";
              }}
            />
          </div>
        )}

        <p className="mt-6 text-xl leading-relaxed text-muted-foreground">{item.summary}</p>

        <div className="mt-10 space-y-5 text-base leading-relaxed text-foreground/90">
          {articleQuery.isLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-5/6"></div>
              <div className="h-4 bg-muted rounded w-4/5"></div>
              <div className="pt-4 space-y-4">
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-11/12"></div>
              </div>
            </div>
          ) : articleQuery.data ? (
            articleQuery.data.map((p, idx) => <p key={idx}>{p}</p>)
          ) : (
            <p>{lang === "hi" ? "आलेख लोड करने में विफल।" : "Failed to load article."}</p>
          )}
        </div>

        {related.length > 0 && (
          <div className="mt-16 border-t border-border/60 pt-10">
            <h2 className="font-display text-xl font-bold">
              {lang === "hi" ? `${item.state} से और अधिक` : `More from ${item.state}`}
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {related.map((n: NewsItem) => (
                <NewsCard key={n.id} item={n} />
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}

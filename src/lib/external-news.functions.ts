import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sanitizeImageUrl } from "./mock-news";

export interface ExternalArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  thumbnail?: string | null;
  score?: number;
  comments?: number;
  category?: string;
}

const CACHE_TTL_MS = 3 * 60 * 1000;
export const WORLD_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const WORLD_MAX_ITEMS = 60;
const cache = new Map<string, { at: number; items: ExternalArticle[] }>();

/**
 * Pure helper: dedupe by id, drop items older than maxAgeMs (relative to now),
 * sort newest-first by publishedAt, and cap at maxItems.
 * Exported for unit tests.
 */
export function mergeWorldItems(
  items: ExternalArticle[],
  now: number,
  maxAgeMs = WORLD_MAX_AGE_MS,
  maxItems = WORLD_MAX_ITEMS,
): ExternalArticle[] {
  const seen = new Set<string>();
  const cutoff = now - maxAgeMs;
  return items
    .filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
    .filter((a) => {
      const t = new Date(a.publishedAt).getTime();
      return Number.isFinite(t) && t >= cutoff;
    })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, maxItems);
}

// ---------------- Reddit ----------------

interface RedditChild {
  data: {
    id: string;
    title: string;
    selftext?: string;
    url: string;
    permalink: string;
    subreddit_name_prefixed: string;
    created_utc: number;
    score: number;
    num_comments: number;
    thumbnail?: string;
    preview?: { images?: { source?: { url?: string } }[] };
    over_18?: boolean;
    stickied?: boolean;
  };
}

async function fetchSubreddit(sub: string, sort: string, limit = 25): Promise<ExternalArticle[]> {
  const url = `https://www.reddit.com/r/${sub}/${sort}.json?limit=${limit}&t=day`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "BharatLive/1.0 (news aggregator)",
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    console.error("Reddit fetch failed", sub, res.status);
    return [];
  }
  const json = (await res.json()) as { data?: { children?: RedditChild[] } };
  const children = json.data?.children ?? [];
  return children
    .map((c) => c.data)
    .filter((d) => !d.stickied && !d.over_18 && d.title)
    .map<ExternalArticle>((d) => {
      const previewUrl = d.preview?.images?.[0]?.source?.url?.replace(/&amp;/g, "&");
      const thumb =
        sanitizeImageUrl(previewUrl) ??
        sanitizeImageUrl(d.thumbnail);
      return {
        id: d.id,
        title: d.title,
        summary: (d.selftext ?? "").slice(0, 280),
        url: `https://www.reddit.com${d.permalink}`,
        source: d.subreddit_name_prefixed,
        publishedAt: new Date(d.created_utc * 1000).toISOString(),
        thumbnail: thumb,
        score: d.score,
        comments: d.num_comments,
      };
    });
}

export const fetchRedditNews = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({ topic: z.enum(["india", "sports"]).default("india") })
      .parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<{ items: ExternalArticle[]; fallback: boolean }> => {
    const key = `reddit:${data.topic}`;
    const now = Date.now();
    const cached = cache.get(key);
    if (cached && now - cached.at < CACHE_TTL_MS) {
      return { items: cached.items, fallback: false };
    }

    const subs =
      data.topic === "sports"
        ? ["Cricket", "IndianFootball", "sports", "formula1"]
        : ["india", "IndiaSpeaks", "unitedstatesofindia", "IndianNews"];

    try {
      const batches = await Promise.all(subs.map((s) => fetchSubreddit(s, "top", 15)));
      const merged = batches.flat();
      // De-dupe and sort by score desc, then recency.
      const seen = new Set<string>();
      const items = merged
        .filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 60);

      if (items.length === 0) return { items: cached?.items ?? [], fallback: true };
      cache.set(key, { at: now, items });
      return { items, fallback: false };
    } catch (err) {
      console.error("Reddit fetch error", err);
      return { items: cached?.items ?? [], fallback: true };
    }
  });

// ---------------- Sports (NewsData) ----------------

interface NewsDataArticle {
  article_id: string;
  title: string;
  description: string | null;
  link?: string;
  pubDate: string;
  source_id?: string;
  source_name?: string;
  image_url?: string | null;
  category?: string[];
}

export const fetchSportsNews = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        lang: z.enum(["en", "hi"]).default("en"),
        sport: z
          .enum(["all", "cricket", "football", "hockey", "tennis", "kabaddi", "olympics"])
          .default("all"),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<{ items: ExternalArticle[]; fallback: boolean }> => {
    const key = `sports:${data.lang}:${data.sport}`;
    const now = Date.now();
    const cached = cache.get(key);
    if (cached && now - cached.at < CACHE_TTL_MS) {
      return { items: cached.items, fallback: false };
    }

    // Sport → subreddits for Reddit fallback
    const sportSubs: Record<string, string[]> = {
      all: ["Cricket", "IndianFootball", "sports", "IndianTennis"],
      cricket: ["Cricket", "ipl"],
      football: ["IndianFootball", "soccer"],
      hockey: ["hockey", "FieldHockey"],
      tennis: ["tennis", "IndianTennis"],
      kabaddi: ["Kabaddi"],
      olympics: ["olympics"],
    };

    const apiKey = process.env.NEWSDATA_API_KEY;
    let newsDataItems: ExternalArticle[] = [];
    let newsDataFailed = false;

    if (apiKey) {
      try {
        const MAX_PAGES = 2;
        const collected: NewsDataArticle[] = [];
        let nextPage: string | undefined;

        for (let i = 0; i < MAX_PAGES; i++) {
          const url = new URL("https://newsdata.io/api/1/latest");
          url.searchParams.set("apikey", apiKey);
          url.searchParams.set("country", "in");
          url.searchParams.set("language", data.lang === "hi" ? "hi" : "en");
          url.searchParams.set("category", "sports");
          url.searchParams.set("size", "10");
          if (data.sport !== "all") url.searchParams.set("q", data.sport);
          if (nextPage) url.searchParams.set("page", nextPage);

          const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
          if (!res.ok) {
            newsDataFailed = true;
            break;
          }
          const json = (await res.json()) as {
            status: string;
            results?: NewsDataArticle[];
            nextPage?: string;
          };
          if (json.status !== "success" || !Array.isArray(json.results)) {
            newsDataFailed = true;
            break;
          }
          collected.push(...json.results);
          if (!json.nextPage) break;
          nextPage = json.nextPage;
        }

        const seen = new Set<string>();
        for (const a of collected) {
          if (!a.title || seen.has(a.article_id)) continue;
          seen.add(a.article_id);
          newsDataItems.push({
            id: a.article_id,
            title: a.title,
            summary: a.description?.slice(0, 280) ?? "",
            url: a.link ?? "#",
            source: a.source_name || a.source_id || "News",
            publishedAt: new Date(a.pubDate.replace(" ", "T") + "Z").toISOString(),
            thumbnail: sanitizeImageUrl(a.image_url),
            category: "Sports",
          });
        }
      } catch (err) {
        console.error("Sports NewsData error", err);
        newsDataFailed = true;
      }
    }

    // Always augment/backup with Reddit so the feed is never empty.
    let redditItems: ExternalArticle[] = [];
    try {
      const subs = sportSubs[data.sport] ?? sportSubs.all;
      const batches = await Promise.all(subs.map((s) => fetchSubreddit(s, "hot", 15)));
      redditItems = batches
        .flat()
        .filter((p) => (p.thumbnail ? true : (p.summary?.length ?? 0) > 40 || p.title.length > 30))
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 30)
        .map((p) => ({ ...p, category: "Sports" }));
    } catch (err) {
      console.error("Sports Reddit fallback error", err);
    }

    const seenIds = new Set<string>();
    const merged = [...newsDataItems, ...redditItems].filter((a) =>
      seenIds.has(a.id) ? false : (seenIds.add(a.id), true),
    );

    if (merged.length === 0) {
      const fallbackItems = cached?.items && cached.items.length > 0
        ? cached.items
        : [
            {
              id: "sports-1",
              title: "Virat Kohli's century leads India to victory in thrilling final",
              summary: "A spectacular performance by the former captain secured the win...",
              url: "#",
              source: "SportsNet",
              publishedAt: new Date().toISOString(),
              thumbnail: "https://image.pollinations.ai/prompt/cricket%20stadium%20india?width=800&height=450&nologo=true",
              category: "Sports",
            },
            {
              id: "sports-2",
              title: "Indian Football team secures spot in Asian Cup knockout stages",
              summary: "A 2-1 victory against the rivals ensured qualification...",
              url: "#",
              source: "Goal India",
              publishedAt: new Date(Date.now() - 3600000).toISOString(),
              thumbnail: "https://image.pollinations.ai/prompt/football%20match%20india?width=800&height=450&nologo=true",
              category: "Sports",
            }
          ];
      return { items: fallbackItems, fallback: true };
    }

    cache.set(key, { at: now, items: merged });
    return { items: merged, fallback: newsDataFailed || newsDataItems.length === 0 };
  });


// ---------------- World News ----------------

const WORLD_REGIONS = [
  "all", "us", "gb", "eu", "asia", "middle_east", "africa", "americas",
] as const;
type WorldRegion = (typeof WORLD_REGIONS)[number];

const REGION_COUNTRIES: Record<WorldRegion, string> = {
  all: "us,gb,ca,au,de,fr,jp,cn,ru,br,za,ae",
  us: "us",
  gb: "gb",
  eu: "de,fr,it,es,nl,se",
  asia: "jp,cn,kr,sg,id,th,vn",
  middle_east: "ae,sa,il,tr,eg",
  africa: "za,ng,ke,eg,ma",
  americas: "us,ca,br,mx,ar",
};

// GDELT uses ISO 3166-1 alpha-2 uppercased.
const REGION_GDELT: Record<WorldRegion, string> = {
  all: "(sourcecountry:US OR sourcecountry:UK OR sourcecountry:CA OR sourcecountry:AU OR sourcecountry:DE OR sourcecountry:FR OR sourcecountry:JP OR sourcecountry:CN OR sourcecountry:RU OR sourcecountry:BR)",
  us: "sourcecountry:US",
  gb: "sourcecountry:UK",
  eu: "(sourcecountry:DE OR sourcecountry:FR OR sourcecountry:IT OR sourcecountry:ES OR sourcecountry:NL OR sourcecountry:SE)",
  asia: "(sourcecountry:JP OR sourcecountry:CN OR sourcecountry:KR OR sourcecountry:SG OR sourcecountry:ID OR sourcecountry:TH OR sourcecountry:VN)",
  middle_east: "(sourcecountry:AE OR sourcecountry:SA OR sourcecountry:IS OR sourcecountry:TU OR sourcecountry:EG)",
  africa: "(sourcecountry:SF OR sourcecountry:NI OR sourcecountry:KE OR sourcecountry:EG OR sourcecountry:MO)",
  americas: "(sourcecountry:US OR sourcecountry:CA OR sourcecountry:BR OR sourcecountry:MX OR sourcecountry:AR)",
};

const REGION_SUBS: Record<WorldRegion, string[]> = {
  all: ["worldnews", "geopolitics", "anime_titties"],
  us: ["news", "politics"],
  gb: ["ukpolitics", "unitedkingdom"],
  eu: ["europe", "europeannews"],
  asia: ["asia", "geopolitics"],
  middle_east: ["MiddleEastNews", "geopolitics"],
  africa: ["Africa", "worldnews"],
  americas: ["LatinAmerica", "worldnews"],
};

// Google News RSS locale per region — no API key, no strict rate limits.
const REGION_GNEWS: Record<WorldRegion, { hl: string; gl: string; ceid: string; q?: string }> = {
  all:         { hl: "en-US", gl: "US", ceid: "US:en", q: "world" },
  us:          { hl: "en-US", gl: "US", ceid: "US:en" },
  gb:          { hl: "en-GB", gl: "GB", ceid: "GB:en" },
  eu:          { hl: "en-US", gl: "US", ceid: "US:en", q: "europe" },
  asia:        { hl: "en-US", gl: "US", ceid: "US:en", q: "asia" },
  middle_east: { hl: "en-US", gl: "US", ceid: "US:en", q: "middle+east" },
  africa:      { hl: "en-US", gl: "US", ceid: "US:en", q: "africa" },
  americas:    { hl: "en-US", gl: "US", ceid: "US:en", q: "americas" },
};

interface GdeltArticle {
  url: string;
  title: string;
  seendate: string;
  socialimage?: string;
  domain: string;
  language: string;
  sourcecountry: string;
}

function gdeltDateToISO(d: string): string {
  if (!/^\d{8}T\d{6}Z$/.test(d)) return new Date().toISOString();
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${d.slice(9, 11)}:${d.slice(11, 13)}:${d.slice(13, 15)}Z`;
}

async function fetchGdeltWorld(query: string, maxRecords = 50): Promise<GdeltArticle[]> {
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  url.searchParams.set("query", query);
  url.searchParams.set("mode", "ArtList");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", String(maxRecords));
  url.searchParams.set("sort", "DateDesc");
  url.searchParams.set("timespan", "1d");
  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json", "User-Agent": "BharatLive/1.0" },
    });
    if (!res.ok) return [];
    const text = await res.text();
    try {
      return (JSON.parse(text) as { articles?: GdeltArticle[] }).articles ?? [];
    } catch {
      return [];
    }
  } catch (err) {
    console.error("GDELT world fetch error", err);
    return [];
  }
}

// Decode common HTML entities and strip tags for plain-text titles/summaries.
function decodeHtml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

interface GNewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary: string;
}

async function fetchGoogleNews(region: WorldRegion, limit = 40): Promise<GNewsItem[]> {
  const cfg = REGION_GNEWS[region];
  const base = cfg.q
    ? `https://news.google.com/rss/search?q=${cfg.q}&hl=${cfg.hl}&gl=${cfg.gl}&ceid=${cfg.ceid}`
    : `https://news.google.com/rss?hl=${cfg.hl}&gl=${cfg.gl}&ceid=${cfg.ceid}`;
  try {
    const res = await fetch(base, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; BharatLive/1.0; +https://bharatlive.app)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });
    if (!res.ok) {
      console.error("GoogleNews fetch failed", region, res.status);
      return [];
    }
    const xml = await res.text();
    const items: GNewsItem[] = [];
    const itemRe = /<item>([\s\S]*?)<\/item>/g;
    let m: RegExpExecArray | null;
    while ((m = itemRe.exec(xml)) && items.length < limit) {
      const block = m[1];
      const pick = (tag: string) => {
        const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
        const hit = block.match(re);
        return hit ? decodeHtml(hit[1]) : "";
      };
      const title = pick("title");
      const link = pick("link");
      const pubDate = pick("pubDate");
      const description = pick("description");
      const source = pick("source") || "Google News";
      if (!title || !link) continue;
      items.push({
        id: link,
        title,
        url: link,
        source,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        summary: description.slice(0, 280),
      });
    }
    return items;
  } catch (err) {
    console.error("GoogleNews error", region, err);
    return [];
  }
}



export const fetchWorldNews = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        lang: z.enum(["en", "hi"]).default("en"),
        region: z.enum(WORLD_REGIONS).default("all"),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<{ items: ExternalArticle[]; fallback: boolean }> => {
    const key = `world:${data.lang}:${data.region}`;
    const now = Date.now();
    const cached = cache.get(key);
    if (cached && now - cached.at < CACHE_TTL_MS) {
      return { items: cached.items, fallback: false };
    }

    const apiKey = process.env.NEWSDATA_API_KEY;
    let newsDataItems: ExternalArticle[] = [];
    let newsDataFailed = false;

    if (apiKey) {
      try {
        const url = new URL("https://newsdata.io/api/1/latest");
        url.searchParams.set("apikey", apiKey);
        url.searchParams.set("country", REGION_COUNTRIES[data.region]);
        url.searchParams.set("language", data.lang === "hi" ? "hi" : "en");
        url.searchParams.set("category", "top,world,politics");
        url.searchParams.set("size", "10");

        const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
        if (!res.ok) {
          newsDataFailed = true;
        } else {
          const json = (await res.json()) as { status: string; results?: NewsDataArticle[] };
          if (json.status !== "success" || !Array.isArray(json.results)) {
            newsDataFailed = true;
          } else {
            const seen = new Set<string>();
            for (const a of json.results) {
              if (!a.title || seen.has(a.article_id)) continue;
              seen.add(a.article_id);
              newsDataItems.push({
                id: a.article_id,
                title: a.title,
                summary: a.description?.slice(0, 280) ?? "",
                url: a.link ?? "#",
                source: a.source_name || a.source_id || "News",
                publishedAt: new Date(a.pubDate.replace(" ", "T") + "Z").toISOString(),
                thumbnail: sanitizeImageUrl(a.image_url),
                category: "World",
              });
            }
          }
        }
      } catch (err) {
        console.error("World NewsData error", err);
        newsDataFailed = true;
      }
    }

    // GDELT: latest genuine world news with images (no API key required).
    let gdeltItems: ExternalArticle[] = [];
    try {
      const gdeltArticles = await fetchGdeltWorld(REGION_GDELT[data.region], 60);
      gdeltItems = gdeltArticles
        .filter((a) => a.title && a.url)
        .map((a) => ({
          id: a.url,
          title: a.title,
          summary: a.domain,
          url: a.url,
          source: a.domain,
          publishedAt: gdeltDateToISO(a.seendate),
          thumbnail: sanitizeImageUrl(a.socialimage),
          category: "World",
        }));
    } catch (err) {
      console.error("World GDELT error", err);
    }

    // Google News RSS: reliable free source, no rate limits.
    let gnewsItems: ExternalArticle[] = [];
    try {
      const gn = await fetchGoogleNews(data.region, 40);
      gnewsItems = gn.map((a) => ({
        id: a.id,
        title: a.title,
        summary: a.summary,
        url: a.url,
        source: a.source,
        publishedAt: a.publishedAt,
        thumbnail: null,
        category: "World",
      }));
    } catch (err) {
      console.error("World GoogleNews error", err);
    }

    let redditItems: ExternalArticle[] = [];
    try {
      const subs = REGION_SUBS[data.region];
      const batches = await Promise.all(subs.map((s) => fetchSubreddit(s, "hot", 15)));
      redditItems = batches
        .flat()
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 30)
        .map((p) => ({ ...p, category: "World" }));
    } catch (err) {
      console.error("World Reddit fallback error", err);
    }

    const merged = mergeWorldItems(
      [...newsDataItems, ...gnewsItems, ...gdeltItems, ...redditItems],
      now,
    );

    if (merged.length === 0) {
      const fallbackItems = cached?.items && cached.items.length > 0
        ? cached.items
        : [
            {
              id: "world-1",
              title: "Global Summit discusses new climate action targets",
              summary: "World leaders gathered today to announce new commitments...",
              url: "#",
              source: "Global News",
              publishedAt: new Date().toISOString(),
              thumbnail: "https://image.pollinations.ai/prompt/united%20nations%20summit?width=800&height=450&nologo=true",
              category: "World",
            },
            {
              id: "world-2",
              title: "Tech innovations shaping the future of global finance",
              summary: "New frameworks are being adopted across major economies...",
              url: "#",
              source: "Tech World",
              publishedAt: new Date(Date.now() - 3600000).toISOString(),
              thumbnail: "https://image.pollinations.ai/prompt/global%20finance%20technology?width=800&height=450&nologo=true",
              category: "World",
            }
          ];
      return { items: fallbackItems, fallback: true };
    }

    cache.set(key, { at: now, items: merged });
    return { items: merged, fallback: newsDataFailed || newsDataItems.length === 0 };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { chatCompletionsUrl, getAiGatewayConfig } from "./ai-gateway.server";
import { INDIA_STATES, MOCK_NEWS, sanitizeImageUrl, type NewsCategory, type NewsItem } from "./mock-news";

// City -> state map, used to tag NewsData articles to an Indian state.
const CITY_TO_STATE: Array<{ city: string; state: string }> = [
  { city: "Mumbai", state: "Maharashtra" },
  { city: "Pune", state: "Maharashtra" },
  { city: "Nagpur", state: "Maharashtra" },
  { city: "Thane", state: "Maharashtra" },
  { city: "New Delhi", state: "Delhi" },
  { city: "Delhi", state: "Delhi" },
  { city: "Bengaluru", state: "Karnataka" },
  { city: "Bangalore", state: "Karnataka" },
  { city: "Mysuru", state: "Karnataka" },
  { city: "Mysore", state: "Karnataka" },
  { city: "Chennai", state: "Tamil Nadu" },
  { city: "Coimbatore", state: "Tamil Nadu" },
  { city: "Madurai", state: "Tamil Nadu" },
  { city: "Kolkata", state: "West Bengal" },
  { city: "Howrah", state: "West Bengal" },
  { city: "Siliguri", state: "West Bengal" },
  { city: "Ahmedabad", state: "Gujarat" },
  { city: "Surat", state: "Gujarat" },
  { city: "Vadodara", state: "Gujarat" },
  { city: "Gandhinagar", state: "Gujarat" },
  { city: "Rajkot", state: "Gujarat" },
  { city: "Jaipur", state: "Rajasthan" },
  { city: "Udaipur", state: "Rajasthan" },
  { city: "Jodhpur", state: "Rajasthan" },
  { city: "Lucknow", state: "Uttar Pradesh" },
  { city: "Kanpur", state: "Uttar Pradesh" },
  { city: "Varanasi", state: "Uttar Pradesh" },
  { city: "Noida", state: "Uttar Pradesh" },
  { city: "Ghaziabad", state: "Uttar Pradesh" },
  { city: "Agra", state: "Uttar Pradesh" },
  { city: "Kochi", state: "Kerala" },
  { city: "Thiruvananthapuram", state: "Kerala" },
  { city: "Kozhikode", state: "Kerala" },
  { city: "Alleppey", state: "Kerala" },
  { city: "Hyderabad", state: "Telangana" },
  { city: "Warangal", state: "Telangana" },
  { city: "Chandigarh", state: "Punjab" },
  { city: "Amritsar", state: "Punjab" },
  { city: "Ludhiana", state: "Punjab" },
  { city: "Guwahati", state: "Assam" },
  { city: "Dispur", state: "Assam" },
  { city: "Patna", state: "Bihar" },
  { city: "Gaya", state: "Bihar" },
  { city: "Bhubaneswar", state: "Odisha" },
  { city: "Cuttack", state: "Odisha" },
  { city: "Bhopal", state: "Madhya Pradesh" },
  { city: "Indore", state: "Madhya Pradesh" },
  { city: "Gwalior", state: "Madhya Pradesh" },
];

// Also match by state name directly (e.g. "Maharashtra govt announcesâ€¦")
const STATE_NAMES = INDIA_STATES.map((s) => s.name);

const CATEGORY_MAP: Record<string, NewsCategory> = {
  politics: "Politics",
  business: "Business",
  technology: "Tech",
  science: "Tech",
  sports: "Sports",
  entertainment: "Culture",
  lifestyle: "Culture",
  food: "Culture",
  tourism: "Culture",
};

function tagStateAndCity(text: string): { state: string; city: string } | null {
  const lower = text.toLowerCase();
  for (const { city, state } of CITY_TO_STATE) {
    if (lower.includes(city.toLowerCase())) return { city, state };
  }
  for (const state of STATE_NAMES) {
    if (lower.includes(state.toLowerCase())) {
      const info = INDIA_STATES.find((s) => s.name === state)!;
      return { city: info.capital, state };
    }
  }
  return null;
}

function mapCategory(cats: unknown): NewsCategory {
  if (Array.isArray(cats)) {
    for (const c of cats) {
      const mapped = CATEGORY_MAP[String(c).toLowerCase()];
      if (mapped) return mapped;
    }
  }
  return "Politics";
}

interface NewsDataArticle {
  article_id: string;
  title: string;
  description: string | null;
  link?: string;
  pubDate: string;
  source_id?: string;
  source_name?: string;
  category?: string[];
  image_url?: string | null;
}

// ---------------- GDELT (free, no key, includes images) ----------------
interface GdeltArticle {
  url: string;
  url_mobile?: string;
  title: string;
  seendate: string; // "20260703T120000Z"
  socialimage?: string;
  domain: string;
  language: string;
  sourcecountry: string;
}

function gdeltDateToISO(d: string): string {
  // 20260703T120000Z -> 2026-07-03T12:00:00Z
  if (!/^\d{8}T\d{6}Z$/.test(d)) return new Date().toISOString();
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${d.slice(9, 11)}:${d.slice(11, 13)}:${d.slice(13, 15)}Z`;
}

async function fetchGdelt(query: string, maxRecords = 60): Promise<GdeltArticle[]> {
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  url.searchParams.set("query", query);
  url.searchParams.set("mode", "ArtList");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", String(maxRecords));
  url.searchParams.set("sort", "DateDesc");
  // Force last 3 days so results survive quiet news windows.
  url.searchParams.set("timespan", "3d");
  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json", "User-Agent": "BharatLive/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const text = await res.text();
    // GDELT sometimes returns HTML errors; guard JSON parse.
    try {
      const json = JSON.parse(text) as { articles?: GdeltArticle[] };
      return json.articles ?? [];
    } catch {
      return [];
    }
  } catch (err) {
    console.error("GDELT fetch error", err);
    return [];
  }
}

// Freshness window: drop anything older than this.
const MAX_AGE_MS = 72 * 60 * 60 * 1000; // 72 hours â€” wider window so fresh but rare feeds still show
const FETCH_TIMEOUT_MS = 8000; // don't stall SSR on slow upstreams

// Simple in-isolate cache to reduce quota burn across SSR renders / repeat calls.
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes â€” keep it fresh
const cache = new Map<string, { at: number; items: NewsItem[] }>();

// Persistent per-string translation cache so we don't re-translate the same headline.
const translationCache = new Map<string, string>();

async function translateBatchToHindi(strings: string[]): Promise<string[]> {
  const aiConfig = getAiGatewayConfig();
  if (!aiConfig || strings.length === 0) return strings;

  // Devanagari passes through untouched; only translate the rest.
  const hasDevanagari = (s: string) => /[\u0900-\u097F]/.test(s);
  const toDo: { idx: number; text: string }[] = [];
  const result = [...strings];
  strings.forEach((s, i) => {
    if (!s) return;
    if (hasDevanagari(s)) return;
    const cached = translationCache.get(s);
    if (cached) {
      result[i] = cached;
      return;
    }
    toDo.push({ idx: i, text: s });
  });
  if (toDo.length === 0) return result;

  // Chunk to keep prompts small.
  const CHUNK = 20;
  for (let c = 0; c < toDo.length; c += CHUNK) {
    const chunk = toDo.slice(c, c + CHUNK);
    const numbered = chunk.map((x, i) => `${i + 1}. ${x.text}`).join("\n");
    try {
      const res = await fetch(chatCompletionsUrl(aiConfig), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...aiConfig.headers,
        },
        body: JSON.stringify({
          model: aiConfig.model,
          messages: [
            {
              role: "system",
              content:
                "You translate English news headlines and summaries into natural Hindi (Devanagari script). Preserve names of people, places, organizations and numbers as-is. Return ONLY a JSON array of strings, one per numbered input, in order. No prose, no keys.",
            },
            { role: "user", content: numbered },
          ],
        }),
      });
      if (!res.ok) {
        console.error("Hindi translate failed", res.status, await res.text());
        continue;
      }
      const j: any = await res.json();
      const raw: string = j.choices?.[0]?.message?.content ?? "";
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) continue;
      let arr: unknown;
      try {
        arr = JSON.parse(match[0]);
      } catch {
        continue;
      }
      if (!Array.isArray(arr)) continue;
      arr.forEach((val, i) => {
        const target = chunk[i];
        if (!target || typeof val !== "string") return;
        translationCache.set(target.text, val);
        result[target.idx] = val;
      });
    } catch (err) {
      console.error("Hindi translate error", err);
    }
  }
  return result;
}

async function translateItemsToHindi(items: NewsItem[]): Promise<NewsItem[]> {
  if (items.length === 0) return items;
  const titles = items.map((i) => i.title);
  const summaries = items.map((i) => i.summary ?? "");
  const [tHi, sHi] = await Promise.all([
    translateBatchToHindi(titles),
    translateBatchToHindi(summaries),
  ]);
  return items.map((it, i) => ({
    ...it,
    title: tHi[i] || it.title,
    summary: sHi[i] || it.summary,
  }));
}



export const fetchNews = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ lang: z.enum(["en", "hi"]).default("en") }).parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<{ items: NewsItem[]; fallback: boolean }> => {
    const key = data.lang;
    const now = Date.now();
    const cached = cache.get(key);
    if (cached && now - cached.at < CACHE_TTL_MS) {
      return { items: cached.items, fallback: false };
    }

    const apiKey = process.env.NEWSDATA_API_KEY;

    try {
      const items: NewsItem[] = [];
      const seen = new Set<string>();

      // 1) Prefer NewsData when configured for stronger India coverage.
      if (apiKey) {
        const MAX_PAGES = 5;
        const collected: NewsDataArticle[] = [];
        let nextPage: string | undefined;

        for (let i = 0; i < MAX_PAGES; i++) {
          const url = new URL("https://newsdata.io/api/1/latest");
          url.searchParams.set("apikey", apiKey);
          url.searchParams.set("country", "in");
          url.searchParams.set("language", data.lang === "hi" ? "hi" : "en");
          url.searchParams.set("size", "10");
          if (nextPage) url.searchParams.set("page", nextPage);

          const res = await fetch(url.toString(), {
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          }).catch((err) => {
            console.error("NewsData fetch error", err);
            return null;
          });
          if (!res || !res.ok) {
            if (res) console.error("NewsData fetch failed", res.status, await res.text().catch(() => ""));
            break;
          }
          const json = (await res.json().catch(() => null)) as {
            status: string;
            results?: NewsDataArticle[];
            nextPage?: string;
          } | null;
          if (!json || json.status !== "success" || !Array.isArray(json.results)) break;
          collected.push(...json.results);
          if (!json.nextPage) break;
          nextPage = json.nextPage;
        }

        for (const a of collected) {
          if (!a.title) continue;
          if (seen.has(a.article_id)) continue;
          // Try to tag to a state, but DON'T drop untagged items â€” bucket as National so
          // major India stories still show even when no city/state is named in the text.
          const tagged = tagStateAndCity(`${a.title} ${a.description ?? ""}`) ?? {
            state: "National",
            city: "India",
          };
          seen.add(a.article_id);
          items.push({
            id: a.article_id,
            title: a.title,
            summary: a.description?.slice(0, 240) ?? a.title,
            state: tagged.state,
            city: tagged.city,
            category: mapCategory(a.category),
            source: a.source_name || a.source_id || "News",
            publishedAt: new Date(a.pubDate.replace(" ", "T") + "Z").toISOString(),
            image: sanitizeImageUrl(a.image_url),
          });
        }
      }

      // 2) Always augment with GDELT latest India coverage for fresher stories and more genuine images.
      const gdeltQuery = data.lang === "hi"
        ? '(india OR bharat) AND sourcecountry:IN AND sourcelang:Hindi'
        : '(india OR bharat) AND sourcecountry:IN';
      const gdeltArticles = await fetchGdelt(gdeltQuery, 75);

      for (const a of gdeltArticles) {
        if (!a.title || !a.url) continue;
        const dedupeKey = a.url;
        if (seen.has(dedupeKey)) continue;
        const tagged = tagStateAndCity(a.title) ?? { state: "National", city: "India" };
        seen.add(dedupeKey);
        items.push({
          id: Buffer.from(dedupeKey).toString("base64url"),
          title: a.title,
          summary: a.domain,
          state: tagged.state,
          city: tagged.city,
          category: "Politics",
          source: a.domain,
          publishedAt: gdeltDateToISO(a.seendate),
          image: sanitizeImageUrl(a.socialimage),
        });
      }

      // For English mode, drop any Hindi leftovers. For Hindi mode we keep
      // everything and translate below so nothing gets dropped.
      const hasDevanagari = (s: string) => /[\u0900-\u097F]/.test(s);
      const langFiltered = data.lang === "hi"
        ? items
        : items.filter((it) => !hasDevanagari(it.title));

      const cutoff = now - MAX_AGE_MS;
      let finalItems = langFiltered
        .filter((it) => {
          const t = new Date(it.publishedAt).getTime();
          return Number.isFinite(t) && t >= cutoff;
        })
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        .slice(0, 40);

      if (data.lang === "hi") {
        finalItems = await translateItemsToHindi(finalItems);
      }

      if (finalItems.length === 0) {
        const fallbackItems =
          data.lang === "hi"
            ? await translateItemsToHindi(cached?.items ?? MOCK_NEWS)
            : cached?.items ?? MOCK_NEWS;
        return { items: fallbackItems, fallback: true };
      }

      cache.set(key, { at: now, items: finalItems });
      return { items: finalItems, fallback: false };
    } catch (err) {
      console.error("Latest news fetch error", err);
      const fallbackItems =
        data.lang === "hi"
          ? await translateItemsToHindi(cached?.items ?? MOCK_NEWS)
          : cached?.items ?? MOCK_NEWS;
      return { items: fallbackItems, fallback: true };
    }
  });


// Per-state fetch (used on state pages when the country feed has no tagged items).
const stateCache = new Map<string, { at: number; items: NewsItem[] }>();

export const fetchStateNews = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        state: z.string().min(1),
        lang: z.enum(["en", "hi"]).default("en"),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ items: NewsItem[]; fallback: boolean }> => {
    const key = `${data.lang}:${data.state.toLowerCase()}`;
    const now = Date.now();
    const cached = stateCache.get(key);
    if (cached && now - cached.at < CACHE_TTL_MS) {
      return { items: cached.items, fallback: false };
    }

    const apiKey = process.env.NEWSDATA_API_KEY;
    if (!apiKey) return { items: [], fallback: true };

    const stateInfo = INDIA_STATES.find((s) => s.name === data.state);
    const cityHints = CITY_TO_STATE.filter((c) => c.state === data.state).map((c) => c.city);
    // NewsData `q` supports OR terms; keep it tight to state + main cities.
    const terms = [data.state, ...cityHints.slice(0, 5)];
    const q = terms.map((t) => `"${t}"`).join(" OR ");

    try {
      const url = new URL("https://newsdata.io/api/1/latest");
      url.searchParams.set("apikey", apiKey);
      url.searchParams.set("country", "in");
      url.searchParams.set("language", data.lang === "hi" ? "hi" : "en");
      url.searchParams.set("size", "10");
      url.searchParams.set("q", q);

      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      }).catch((err) => {
        console.error("NewsData state fetch error", err);
        return null;
      });
      if (!res || !res.ok) {
        if (res) console.error("NewsData state fetch failed", res.status, await res.text().catch(() => ""));
        return { items: [], fallback: true };
      }
      const json = (await res.json().catch(() => null)) as { status: string; results?: NewsDataArticle[] } | null;
      if (!json || json.status !== "success" || !Array.isArray(json.results)) {
        return { items: [], fallback: true };
      }

      const hasDevanagari = (s: string) => /[\u0900-\u097F]/.test(s);
      const items: NewsItem[] = [];
      for (const a of json.results) {
        if (!a.title) continue;
        // In Hindi mode keep everything and translate; in English drop Hindi leftovers.
        if (data.lang === "en" && hasDevanagari(a.title)) continue;
        const tagged = tagStateAndCity(`${a.title} ${a.description ?? ""}`) ?? {
          state: data.state,
          city: stateInfo?.capital ?? data.state,
        };
        items.push({
          id: a.article_id,
          title: a.title,
          summary: a.description?.slice(0, 240) ?? a.title,
          state: tagged.state === data.state ? tagged.state : data.state,
          city: tagged.city,
          category: mapCategory(a.category),
          source: a.source_name || a.source_id || "News",
          publishedAt: new Date(a.pubDate.replace(" ", "T") + "Z").toISOString(),
          image: sanitizeImageUrl(a.image_url),
        });
      }

      const cutoff = now - MAX_AGE_MS;
      const fresh = items
        .filter((it) => {
          const t = new Date(it.publishedAt).getTime();
          return Number.isFinite(t) && t >= cutoff;
        })
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      const finalItems = data.lang === "hi" ? await translateItemsToHindi(fresh) : fresh;
      stateCache.set(key, { at: now, items: finalItems });
      return { items: finalItems, fallback: false };
    } catch (err) {
      console.error("NewsData state fetch error", err);
      return { items: [], fallback: true };
    }
  });





export type NewsCategory = "Politics" | "Business" | "Tech" | "Sports" | "Culture";

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  state: string;
  city: string;
  category: NewsCategory;
  source: string;
  publishedAt: string; // ISO
  image?: string | null;
}

// Keyword-matched fallback image. Uses loremflickr which returns real photos
// tagged with the given keywords (no API key needed).
const STOPWORDS = new Set([
  "the","a","an","and","or","of","to","in","on","for","with","by","at","from",
  "is","are","was","were","be","been","as","that","this","it","its","after",
  "over","into","new","up","down","out","amid","says","said","will","has","have",
]);

function keywordsFor(item: Pick<NewsItem, "title" | "category" | "state" | "city">): string {
  const words = (item.title || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w))
    .slice(0, 3);
  const tags = [...words, item.category.toLowerCase(), "india"];
  return Array.from(new Set(tags)).join(",");
}

export function fallbackImage(seed: string, keywords = "india,news"): string {
  const s = encodeURIComponent(seed || "bharat").slice(0, 24);
  const kw = encodeURIComponent(keywords);
  return `https://loremflickr.com/800/450/${kw}?lock=${s}`;
}

// Hosts that never serve an image on a public https origin (tracking beacons,
// ad networks, HTML redirectors). Extend as needed.
const IMAGE_HOST_BLOCKLIST = new Set([
  "doubleclick.net",
  "googlesyndication.com",
  "googleadservices.com",
  "feeds.feedburner.com",
  "feedsportal.com",
  "feedads.g.doubleclick.net",
  "stats.wp.com",
  "pixel.wp.com",
  "sb.scorecardresearch.com",
  "b.scorecardresearch.com",
]);

// Common non-image extensions we sometimes see wired into `image` fields.
const NON_IMAGE_EXT_RE = /\.(html?|php|aspx?|jsp|xml|json|txt|pdf|svg)(?:[?#]|$)/i;

// Sanitize a candidate image URL. Returns a safe https URL or null.
// - Trims whitespace and rejects control chars.
// - Requires http/https, upgrades http -> https (published site is https,
//   browsers block mixed-content images otherwise).
// - Rejects protocol-relative (`//...`), data:, javascript:, and other schemes.
// - Rejects known trackers/beacons, non-image extensions, and 1x1 pixels.
// - Rejects localhost/private/loopback hosts that won't resolve for visitors.
export function sanitizeImageUrl(input: string | null | undefined): string | null {
  if (!input || typeof input !== "string") return null;
  let raw = input.trim();
  if (!raw) return null;
  if (raw.length > 2000) return null;
  // Reject any control characters or whitespace inside the URL.
  if (/[\x00-\x1F\x7F\s]/.test(raw)) return null;

  // Reject obvious tracker pixels / placeholders / 1x1 beacons.
  if (/(?:^|[\/_?&=-])(?:1x1|pixel|tracker|beacon|blank\.gif|spacer\.gif|clear\.gif|transparent\.gif)(?:[\/_?&=.-]|$)/i.test(raw)) {
    return null;
  }
  // Explicit 1x1 sizing via query string.
  if (/[?&](?:w|width)=1(?:&|$)/i.test(raw) && /[?&](?:h|height)=1(?:&|$)/i.test(raw)) {
    return null;
  }

  // Only allow http(s); upgrade http -> https.
  if (/^http:\/\//i.test(raw)) raw = "https://" + raw.slice(7);
  if (!/^https:\/\//i.test(raw)) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;

  const host = parsed.hostname.toLowerCase();
  if (!host || host === "localhost") return null;
  if (/^(?:127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host)) return null;
  if (/^172\.(?:1[6-9]|2\d|3[01])\./.test(host)) return null;
  if (host === "::1" || host.startsWith("[")) return null;

  // Blocklisted hosts (exact or suffix match on registrable domain).
  for (const bad of IMAGE_HOST_BLOCKLIST) {
    if (host === bad || host.endsWith("." + bad)) return null;
  }

  // Non-image endpoints occasionally sneak into `image` fields.
  if (NON_IMAGE_EXT_RE.test(parsed.pathname + parsed.search)) return null;

  // Normalized href keeps encoding consistent.
  const out = parsed.toString();
  if (out.length > 2000) return null;
  return out;
}

// Back-compat wrapper — narrows the type for existing call sites.
export function isLikelyValidImage(url: string | null | undefined): url is string {
  return sanitizeImageUrl(url) !== null;
}

export function newsImage(item: Pick<NewsItem, "id" | "image" | "title" | "category" | "state" | "city">): string {
  const clean = sanitizeImageUrl(item.image);
  return clean ?? fallbackImage(item.id, keywordsFor(item));
}



export interface StateInfo {
  name: string;
  code: string;
  lat: number;
  lng: number;
  capital: string;
}

export const INDIA_STATES: StateInfo[] = [
  { name: "Maharashtra", code: "MH", lat: 19.75, lng: 75.71, capital: "Mumbai" },
  { name: "Delhi", code: "DL", lat: 28.61, lng: 77.20, capital: "New Delhi" },
  { name: "Karnataka", code: "KA", lat: 15.31, lng: 75.71, capital: "Bengaluru" },
  { name: "Tamil Nadu", code: "TN", lat: 11.12, lng: 78.65, capital: "Chennai" },
  { name: "West Bengal", code: "WB", lat: 22.98, lng: 87.85, capital: "Kolkata" },
  { name: "Gujarat", code: "GJ", lat: 22.25, lng: 71.19, capital: "Gandhinagar" },
  { name: "Rajasthan", code: "RJ", lat: 27.02, lng: 74.21, capital: "Jaipur" },
  { name: "Uttar Pradesh", code: "UP", lat: 26.84, lng: 80.94, capital: "Lucknow" },
  { name: "Kerala", code: "KL", lat: 10.85, lng: 76.27, capital: "Thiruvananthapuram" },
  { name: "Telangana", code: "TS", lat: 17.38, lng: 78.48, capital: "Hyderabad" },
  { name: "Punjab", code: "PB", lat: 31.14, lng: 75.34, capital: "Chandigarh" },
  { name: "Assam", code: "AS", lat: 26.20, lng: 92.93, capital: "Dispur" },
  { name: "Bihar", code: "BR", lat: 25.09, lng: 85.31, capital: "Patna" },
  { name: "Odisha", code: "OD", lat: 20.95, lng: 85.09, capital: "Bhubaneswar" },
  { name: "Madhya Pradesh", code: "MP", lat: 22.97, lng: 78.65, capital: "Bhopal" },
  { name: "Jammu and Kashmir", code: "JK", lat: 33.77, lng: 76.57, capital: "Srinagar" },
  { name: "Himachal Pradesh", code: "HP", lat: 31.10, lng: 77.17, capital: "Shimla" },
  { name: "Uttarakhand", code: "UK", lat: 30.06, lng: 79.01, capital: "Dehradun" },
];

export const MOCK_NEWS: NewsItem[] = [
  {
    id: "1",
    title: "Mumbai coastal road opens final phase; commute times halved",
    summary: "The BMC inaugurated the last stretch of the coastal expressway, connecting Worli to Nariman Point in under 12 minutes.",
    state: "Maharashtra", city: "Mumbai", category: "Politics",
    source: "The Hindu", publishedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    title: "Bengaluru startup raises $80M Series C to scale AI code review",
    summary: "The Koramangala-based firm is now among India's top 20 SaaS unicorns, with plans to expand US operations.",
    state: "Karnataka", city: "Bengaluru", category: "Tech",
    source: "YourStory", publishedAt: new Date(Date.now() - 34 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    title: "Delhi assembly clears free metro rides for students under 25",
    summary: "The scheme kicks in next month and is expected to benefit over 4.5 lakh college-goers across the NCR.",
    state: "Delhi", city: "New Delhi", category: "Politics",
    source: "Hindustan Times", publishedAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
  },
  {
    id: "4",
    title: "Chennai Super Kings sign new spinner ahead of IPL 2027 auction",
    summary: "The 22-year-old from Salem broke into the Tamil Nadu Ranji squad last season with 42 wickets.",
    state: "Tamil Nadu", city: "Chennai", category: "Sports",
    source: "ESPNcricinfo", publishedAt: new Date(Date.now() - 78 * 60 * 1000).toISOString(),
  },
  {
    id: "5",
    title: "Kolkata Durga Puja pandals to feature AR heritage walks this year",
    summary: "A collective of 14 pujas across South Kolkata will let visitors scan idols for 3D history overlays.",
    state: "West Bengal", city: "Kolkata", category: "Culture",
    source: "Telegraph India", publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "6",
    title: "Gujarat solar park hits 4 GW capacity, largest in Asia",
    summary: "The Khavda plant in Kutch now powers roughly 3 million homes and exports surplus to neighboring states.",
    state: "Gujarat", city: "Gandhinagar", category: "Business",
    source: "Economic Times", publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "7",
    title: "Kerala backwater tourism sees 38% surge in monsoon bookings",
    summary: "Alleppey and Kumarakom houseboats are booked solid through August as domestic travel rebounds.",
    state: "Kerala", city: "Alleppey", category: "Business",
    source: "Mint", publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "8",
    title: "Hyderabad Metro Phase 2 gets Cabinet nod; 76 km new lines",
    summary: "The expansion will connect the airport, financial district, and Old City in one continuous corridor.",
    state: "Telangana", city: "Hyderabad", category: "Politics",
    source: "Deccan Chronicle", publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "9",
    title: "Jaipur Literature Festival announces 2027 headliners",
    summary: "Arundhati Roy, Yuval Harari and Perumal Murugan lead a 300-author lineup at Diggi Palace this January.",
    state: "Rajasthan", city: "Jaipur", category: "Culture",
    source: "The Wire", publishedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "10",
    title: "Lucknow's Chikankari artisans get GI-tagged e-commerce platform",
    summary: "A UP government portal launches to sell direct-to-consumer, cutting middlemen for 2.5 lakh artisans.",
    state: "Uttar Pradesh", city: "Lucknow", category: "Business",
    source: "Times of India", publishedAt: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
  },
];

export function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "recent";
  const diff = Date.now() - t;
  if (diff < 0) return "just now"; // future date → treat as fresh
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d > 30) return "recent"; // clearly bogus feed date — hide it
  return `${d}d ago`;
}

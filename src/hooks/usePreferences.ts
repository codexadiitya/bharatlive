import { useCallback, useEffect, useState } from "react";
import type { NewsItem } from "@/lib/mock-news";

/**
 * Personalized News Recommendation
 * --------------------------------
 * Lightweight, on-device recommender. Tracks user interactions with articles
 * and builds three affinity vectors: category, state, source. Newer signals
 * decay slowly so tastes can drift. Score(article) = weighted dot-product.
 */

const KEY = "bharatlive:prefs:v1";

export type Prefs = {
  category: Record<string, number>;
  state: Record<string, number>;
  source: Record<string, number>;
  events: number;
  updatedAt: number;
};

export type InteractionKind = "view" | "dwell" | "bookmark" | "verify" | "share";

// Weight per interaction — bookmark > verify/share > dwell > view.
const WEIGHTS: Record<InteractionKind, number> = {
  view: 1,
  dwell: 2,
  bookmark: 4,
  verify: 2,
  share: 3,
};

// Slight decay each time we log so older interests fade.
const DECAY = 0.995;

const empty = (): Prefs => ({
  category: {},
  state: {},
  source: {},
  events: 0,
  updatedAt: 0,
});

function read(): Prefs {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    return { ...empty(), ...(JSON.parse(raw) as Prefs) };
  } catch {
    return empty();
  }
}

const listeners = new Set<() => void>();

function decay(map: Record<string, number>) {
  for (const k of Object.keys(map)) {
    map[k] = map[k] * DECAY;
    if (map[k] < 0.05) delete map[k];
  }
}

function topEntries(map: Record<string, number>, n = 3): [string, number][] {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<Prefs>(() => read());

  useEffect(() => {
    const l = () => setPrefs(read());
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const log = useCallback((item: NewsItem, kind: InteractionKind) => {
    const cur = read();
    decay(cur.category);
    decay(cur.state);
    decay(cur.source);
    const w = WEIGHTS[kind];
    cur.category[item.category] = (cur.category[item.category] ?? 0) + w;
    cur.state[item.state] = (cur.state[item.state] ?? 0) + w;
    cur.source[item.source] = (cur.source[item.source] ?? 0) + w * 0.5;
    cur.events += 1;
    cur.updatedAt = Date.now();
    try {
      localStorage.setItem(KEY, JSON.stringify(cur));
    } catch {}
    listeners.forEach((fn) => fn());
  }, []);

  const score = useCallback(
    (item: NewsItem): number => {
      const c = prefs.category[item.category] ?? 0;
      const s = prefs.state[item.state] ?? 0;
      const src = prefs.source[item.source] ?? 0;
      return c * 1.0 + s * 0.8 + src * 0.4;
    },
    [prefs],
  );

  const rank = useCallback(
    <T extends NewsItem>(items: T[]): T[] => {
      if (prefs.events < 2) return items;
      return [...items]
        .map((it) => ({ it, s: score(it) + Math.random() * 0.001 }))
        .sort((a, b) => b.s - a.s)
        .map((x) => x.it);
    },
    [prefs.events, score],
  );

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    listeners.forEach((fn) => fn());
  }, []);

  const hasSignal = prefs.events >= 2;

  return {
    prefs,
    log,
    score,
    rank,
    reset,
    hasSignal,
    topCategories: topEntries(prefs.category),
    topStates: topEntries(prefs.state),
    topSources: topEntries(prefs.source),
  };
}

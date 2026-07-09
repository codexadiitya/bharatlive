import { queryOptions } from "@tanstack/react-query";
import { fetchRedditNews, fetchSportsNews } from "./external-news.functions";
import type { Lang } from "@/hooks/useLang";

const retry = 3;
const retryDelay = (attempt: number) => Math.min(1000 * 2 ** attempt, 8000);

export const redditQueryOptions = (topic: "india" | "sports") =>
  queryOptions({
    queryKey: ["reddit", topic],
    queryFn: () => fetchRedditNews({ data: { topic } }),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry,
    retryDelay,
  });

export type SportFilter =
  | "all"
  | "cricket"
  | "football"
  | "hockey"
  | "tennis"
  | "kabaddi"
  | "olympics";

export const sportsQueryOptions = (lang: Lang, sport: SportFilter) =>
  queryOptions({
    queryKey: ["sports", lang, sport],
    queryFn: () => fetchSportsNews({ data: { lang, sport } }),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry,
    retryDelay,
  });

import { fetchWorldNews } from "./external-news.functions";

export type WorldRegion =
  | "all" | "us" | "gb" | "eu" | "asia" | "middle_east" | "africa" | "americas";

export const worldQueryOptions = (lang: Lang, region: WorldRegion) =>
  queryOptions({
    queryKey: ["world", lang, region],
    queryFn: () => fetchWorldNews({ data: { lang, region } }),
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchInterval: 3 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry,
    retryDelay,
  });

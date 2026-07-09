import { queryOptions } from "@tanstack/react-query";
import { fetchNews, fetchStateNews } from "./news.functions";
import type { Lang } from "@/hooks/useLang";

// Exponential backoff, capped — retry transient failures a few times before
// surfacing an error to the UI.
const retry = 3;
const retryDelay = (attempt: number) =>
  Math.min(1000 * 2 ** attempt, 8000);

export const newsQueryOptions = (lang: Lang) =>
  queryOptions({
    queryKey: ["news", lang],
    queryFn: () => fetchNews({ data: { lang } }),
    staleTime: 2 * 60 * 1000, // 2 min — refetch aggressively for freshness
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 3 * 60 * 1000, // background refresh every 3 min
    retry,
    retryDelay,
  });

export const stateNewsQueryOptions = (state: string, lang: Lang) =>
  queryOptions({
    queryKey: ["news", "state", state, lang],
    queryFn: () => fetchStateNews({ data: { state, lang } }),
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry,
    retryDelay,
  });

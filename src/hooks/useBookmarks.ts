import { useCallback, useEffect, useState } from "react";
import type { NewsItem } from "@/lib/mock-news";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Bookmark store.
 *
 * - Signed out: persists NewsItem snapshots in localStorage (device-local).
 * - Signed in: persists to the Supabase `bookmarks` table (RLS-scoped to user)
 *   and, on first sign-in, migrates any local bookmarks to the backend.
 */

const KEY = "bharatlive:bookmarks:v2";
const LEGACY_KEY = "bharatlive:bookmarks";

type Store = Record<string, NewsItem>;

function readLocal(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Store;
    if (localStorage.getItem(LEGACY_KEY)) localStorage.removeItem(LEGACY_KEY);
    return {};
  } catch {
    return {};
  }
}

function writeLocal(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {}
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

export function useBookmarks() {
  const { user, ready: authReady } = useAuth();
  const [store, setStore] = useState<Store>({});
  const [ready, setReady] = useState(false);

  // Hydrate + subscribe to cross-tab / cross-hook updates.
  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;

    const hydrate = async () => {
      if (user) {
        // Signed-in: pull from backend. Migrate local first if any.
        const local = readLocal();
        const localIds = Object.keys(local);
        if (localIds.length) {
          const rows = localIds.map((id) => ({
            user_id: user.id,
            item_id: id,
            item: local[id] as any,
          }));
          await supabase.from("bookmarks").upsert(rows, { onConflict: "user_id,item_id" });
          writeLocal({});
        }
        const { data } = await supabase
          .from("bookmarks")
          .select("item_id, item")
          .order("created_at", { ascending: false });
        if (cancelled) return;
        const next: Store = {};
        for (const r of data ?? []) next[r.item_id] = r.item as unknown as NewsItem;
        setStore(next);
      } else {
        setStore(readLocal());
      }
      setReady(true);
    };

    hydrate();
    const l = () => (user ? hydrate() : setStore(readLocal()));
    listeners.add(l);
    const onStorage = (e: StorageEvent) => {
      if (!user && e.key === KEY) setStore(readLocal());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      listeners.delete(l);
      window.removeEventListener("storage", onStorage);
    };
  }, [authReady, user?.id]);

  const has = useCallback((id: string) => Boolean(store[id]), [store]);

  const toggle = useCallback(
    (item: NewsItem): boolean => {
      const wasSaved = Boolean(store[item.id]);
      const next: Store = { ...store };
      if (wasSaved) delete next[item.id];
      else next[item.id] = item;
      setStore(next); // optimistic

      if (user) {
        if (wasSaved) {
          supabase.from("bookmarks").delete().eq("user_id", user.id).eq("item_id", item.id).then(notify);
        } else {
          supabase
            .from("bookmarks")
            .upsert(
              { user_id: user.id, item_id: item.id, item: item as any },
              { onConflict: "user_id,item_id" },
            )
            .then(notify);
        }
      } else {
        writeLocal(next);
        notify();
      }
      return !wasSaved;
    },
    [store, user],
  );

  const remove = useCallback(
    (id: string) => {
      if (!store[id]) return;
      const next = { ...store };
      delete next[id];
      setStore(next);
      if (user) {
        supabase.from("bookmarks").delete().eq("user_id", user.id).eq("item_id", id).then(notify);
      } else {
        writeLocal(next);
        notify();
      }
    },
    [store, user],
  );

  const clear = useCallback(() => {
    setStore({});
    if (user) {
      supabase.from("bookmarks").delete().eq("user_id", user.id).then(notify);
    } else {
      writeLocal({});
      notify();
    }
  }, [user]);

  const items: NewsItem[] = Object.values(store);
  const ids = items.map((i) => i.id);

  return {
    ids,
    items,
    has,
    toggle,
    remove,
    clear,
    ready,
    count: items.length,
    synced: !!user,
  };
}

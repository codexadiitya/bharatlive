import { useCallback, useEffect, useState } from "react";
import type { UIMessage } from "ai";
import { useAuth } from "./useAuth";
import {
  listThreads,
  createThread,
  deleteThread as deleteThreadFn,
  getThreadMessages,
  appendMessages,
} from "@/lib/chat.functions";

export type ThreadSummary = { id: string; title: string; updated_at: string };

const LS_THREADS = "bharatbot.threads.v1";
const LS_MESSAGES = (id: string) => `bharatbot.messages.${id}`;

function readLocalThreads(): ThreadSummary[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LS_THREADS) ?? "[]");
  } catch {
    return [];
  }
}
function writeLocalThreads(t: ThreadSummary[]) {
  localStorage.setItem(LS_THREADS, JSON.stringify(t));
}
function readLocalMessages(id: string): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LS_MESSAGES(id)) ?? "[]");
  } catch {
    return [];
  }
}

export function useChatThreads() {
  const { signedIn, ready } = useAuth();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!ready) return;
    setLoading(true);
    if (signedIn) {
      try {
        const rows = await listThreads();
        setThreads(rows as ThreadSummary[]);
      } catch (err) {
        console.error("listThreads failed", err);
        setThreads([]);
      }
    } else {
      setThreads(readLocalThreads());
    }
    setLoading(false);
  }, [signedIn, ready]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const newThread = useCallback(async (): Promise<ThreadSummary> => {
    if (signedIn) {
      const row = (await createThread({ data: { title: "New chat" } })) as ThreadSummary;
      setThreads((cur) => [row, ...cur]);
      return row;
    }
    const row: ThreadSummary = {
      id: crypto.randomUUID(),
      title: "New chat",
      updated_at: new Date().toISOString(),
    };
    const next = [row, ...readLocalThreads()];
    writeLocalThreads(next);
    setThreads(next);
    return row;
  }, [signedIn]);

  const removeThread = useCallback(
    async (id: string) => {
      if (signedIn) {
        await deleteThreadFn({ data: { id } });
      } else {
        const next = readLocalThreads().filter((t) => t.id !== id);
        writeLocalThreads(next);
        localStorage.removeItem(LS_MESSAGES(id));
      }
      setThreads((cur) => cur.filter((t) => t.id !== id));
    },
    [signedIn],
  );

  const renameThreadLocal = useCallback(
    (id: string, title: string) => {
      setThreads((cur) => cur.map((t) => (t.id === id ? { ...t, title } : t)));
      if (!signedIn) {
        const next = readLocalThreads().map((t) => (t.id === id ? { ...t, title } : t));
        writeLocalThreads(next);
      }
    },
    [signedIn],
  );

  return { threads, loading, ready, signedIn, refresh, newThread, removeThread, renameThreadLocal };
}

export async function loadThreadMessages(
  id: string,
  signedIn: boolean,
): Promise<UIMessage[]> {
  if (signedIn) {
    try {
      const rows = await getThreadMessages({ data: { threadId: id } });
      return rows as unknown as UIMessage[];
    } catch (err) {
      console.error("getThreadMessages failed", err);
      return [];
    }
  }
  return readLocalMessages(id);
}

export async function persistNewMessages(opts: {
  threadId: string;
  signedIn: boolean;
  allMessages: UIMessage[];
  newMessages: UIMessage[];
  title?: string;
}) {
  const { threadId, signedIn, allMessages, newMessages, title } = opts;
  if (signedIn) {
    if (newMessages.length === 0 && !title) return;
    try {
      await appendMessages({
        data: {
          threadId,
          messages: newMessages as unknown as {
            id: string;
            role: "user" | "assistant" | "system";
            parts: unknown[];
          }[],
          title,
        },
      });
    } catch (err) {
      console.error("appendMessages failed", err);
    }
  } else {
    localStorage.setItem(LS_MESSAGES(threadId), JSON.stringify(allMessages));
    if (title) {
      const next = readLocalThreads().map((t) =>
        t.id === threadId ? { ...t, title, updated_at: new Date().toISOString() } : t,
      );
      writeLocalThreads(next);
    } else {
      const next = readLocalThreads().map((t) =>
        t.id === threadId ? { ...t, updated_at: new Date().toISOString() } : t,
      );
      writeLocalThreads(next);
    }
  }
}

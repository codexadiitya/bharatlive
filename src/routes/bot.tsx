import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, MessageSquarePlus, Trash2, Sparkles as SparkIcon, Newspaper } from "lucide-react";
import { toast } from "sonner";

import Logo from "@/components/Logo";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { useChatThreads, loadThreadMessages, persistNewMessages } from "@/hooks/useChatThreads";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bot")({
  head: () => ({
    meta: [
      { title: "BharatBot — Ask for the news you care about" },
      {
        name: "description",
        content:
          "Tell BharatBot what interests you — cricket, tech in Bangalore, Kerala politics — and get live India headlines matched to your interests.",
      },
      { property: "og:title", content: "BharatBot — Personal India news assistant" },
      {
        property: "og:description",
        content: "Chat with BharatBot to get live India news tailored to your interests.",
      },
    ],
  }),
  component: BotPage,
});

const SUGGESTIONS = [
  "Latest cricket news",
  "Tech news from Bangalore",
  "Politics in Kerala today",
  "Top business headlines",
];

function BotPage() {
  const navigate = useNavigate();
  const {
    threads,
    loading: threadsLoading,
    ready,
    signedIn,
    newThread,
    removeThread,
    renameThreadLocal,
    refresh,
  } = useChatThreads();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [hydrating, setHydrating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Bootstrap: pick first thread or create one.
  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (!ready || threadsLoading || bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    (async () => {
      if (threads.length > 0) {
        setActiveId(threads[0].id);
      } else {
        const t = await newThread();
        setActiveId(t.id);
      }
    })();
  }, [ready, threadsLoading, threads, newThread]);

  // Load messages when active thread changes.
  useEffect(() => {
    if (!activeId) return;
    setHydrating(true);
    loadThreadMessages(activeId, signedIn)
      .then((m) => setInitialMessages(m))
      .finally(() => setHydrating(false));
  }, [activeId, signedIn]);

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);

  const { messages, sendMessage, status, error, setMessages } = useChat({
    id: activeId ?? "pending",
    messages: initialMessages,
    transport,
    onError: (err) => {
      console.error("chat error", err);
      toast.error("Something went wrong. Please try again.");
    },
  });

  // Keep chat window in sync when switching threads.
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages, setMessages]);

  // Persist newly completed messages.
  const persistedCountRef = useRef(0);
  useEffect(() => {
    persistedCountRef.current = initialMessages.length;
  }, [initialMessages]);

  useEffect(() => {
    if (!activeId) return;
    if (status !== "ready") return;
    if (messages.length <= persistedCountRef.current) return;
    const newOnes = messages.slice(persistedCountRef.current);
    // Auto-title: use the first user prompt if the thread is still "New chat".
    const currentTitle = threads.find((t) => t.id === activeId)?.title;
    let title: string | undefined;
    if (currentTitle === "New chat") {
      const firstUser = messages.find((m) => m.role === "user");
      if (firstUser) {
        const text = firstUser.parts
          .map((p) => (p.type === "text" ? p.text : ""))
          .join(" ")
          .trim()
          .slice(0, 60);
        if (text) title = text;
      }
    }
    persistNewMessages({
      threadId: activeId,
      signedIn,
      allMessages: messages,
      newMessages: newOnes,
      title,
    }).then(() => {
      persistedCountRef.current = messages.length;
      if (title) {
        renameThreadLocal(activeId, title);
        if (signedIn) refresh();
      }
    });
  }, [messages, status, activeId, signedIn, threads, renameThreadLocal, refresh]);

  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    textareaRef.current?.focus();
  }, [activeId]);
  useEffect(() => {
    if (status === "ready") textareaRef.current?.focus();
  }, [status]);

  const busy = status === "submitted" || status === "streaming";

  const submit = async (text: string) => {
    const value = text.trim();
    if (!value || busy || !activeId) return;
    setInput("");
    await sendMessage({ text: value });
  };

  const handleNewThread = async () => {
    const t = await newThread();
    setActiveId(t.id);
    setSidebarOpen(false);
  };

  const handleSelect = (id: string) => {
    setActiveId(id);
    setSidebarOpen(false);
  };

  const handleDelete = async (id: string) => {
    await removeThread(id);
    if (id === activeId) {
      const remaining = threads.filter((t) => t.id !== id);
      if (remaining.length > 0) setActiveId(remaining[0].id);
      else {
        const t = await newThread();
        setActiveId(t.id);
      }
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <div className="hidden h-5 w-px bg-border sm:block" />
          <Link to="/" className="hidden sm:block">
            <Logo className="h-7 w-auto" />
          </Link>
          <div className="hidden items-center gap-2 sm:flex">
            <SparkIcon className="h-4 w-4 text-saffron" />
            <span className="text-sm font-semibold">BharatBot</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-card lg:hidden"
        >
          {sidebarOpen ? "Close" : "Chats"}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            "w-72 shrink-0 flex-col border-r border-border/60 bg-card/40",
            sidebarOpen ? "flex" : "hidden lg:flex",
          )}
        >
          <div className="p-3">
            <button
              type="button"
              onClick={handleNewThread}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-foreground px-3 py-2 text-sm font-semibold text-background transition hover:bg-saffron hover:text-primary-foreground"
            >
              <MessageSquarePlus className="h-4 w-4" /> New chat
            </button>
            {!signedIn && ready && (
              <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                Saved in this browser.{" "}
                <Link to="/auth" className="underline hover:text-foreground">
                  Sign in
                </Link>{" "}
                to sync chats to your account.
              </p>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {threadsLoading ? (
              <div className="px-2 py-3 text-xs text-muted-foreground">Loading…</div>
            ) : threads.length === 0 ? (
              <div className="px-2 py-3 text-xs text-muted-foreground">No chats yet.</div>
            ) : (
              <ul className="flex flex-col gap-1">
                {threads.map((t) => (
                  <li key={t.id} className="group flex items-center">
                    <button
                      type="button"
                      onClick={() => handleSelect(t.id)}
                      className={cn(
                        "flex-1 truncate rounded-l-md px-3 py-2 text-left text-sm transition-colors",
                        t.id === activeId
                          ? "bg-card text-foreground"
                          : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
                      )}
                    >
                      {t.title || "New chat"}
                    </button>
                    <button
                      type="button"
                      aria-label="Delete chat"
                      onClick={() => handleDelete(t.id)}
                      className={cn(
                        "rounded-r-md px-2 py-2 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive",
                        t.id === activeId && "opacity-100",
                      )}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Main chat */}
        <main className="flex min-w-0 flex-1 flex-col">
          <Conversation className="flex-1">
            <ConversationContent className="mx-auto w-full max-w-3xl px-4 py-6">
              {hydrating ? (
                <div className="py-8 text-sm text-muted-foreground">Loading conversation…</div>
              ) : messages.length === 0 ? (
                <EmptyState onPick={submit} />
              ) : (
                messages.map((m) => <BotMessage key={m.id} message={m} />)
              )}
              {status === "submitted" && (
                <div className="mt-4">
                  <Shimmer>Fetching your news…</Shimmer>
                </div>
              )}
              {error && (
                <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error.message}
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          {/* Composer */}
          <div className="border-t border-border/60 bg-background/95 px-4 py-3">
            <div className="mx-auto w-full max-w-3xl">
              <PromptInput
                onSubmit={(msg, e) => {
                  e.preventDefault();
                  submit(msg.text || input);
                }}
              >
                <PromptInputTextarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Tell me what news you care about… e.g. tech in Bangalore, cricket, Kerala politics"
                  disabled={!activeId}
                />
                <PromptInputFooter className="justify-end">
                  <PromptInputSubmit status={status} disabled={!input.trim() || !activeId} />
                </PromptInputFooter>
              </PromptInput>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                BharatBot fetches live headlines from BharatLive feeds.
              </p>
            </div>
          </div>
        </main>
      </div>

      {/* Navigation hint back to app */}
      <button
        type="button"
        onClick={() => navigate({ to: "/" })}
        className="hidden"
        aria-hidden
      />
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-saffron/15 text-saffron">
        <Newspaper className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">What are you interested in?</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Tell BharatBot the topics, states, or categories you care about and it will pull matching stories from the live India feed.
      </p>
      <div className="mt-6 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-lg border border-border bg-card px-4 py-3 text-left text-sm text-foreground transition hover:border-saffron/50 hover:bg-card/80"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

type NewsItem = {
  id?: string;
  title: string;
  summary?: string;
  state?: string;
  city?: string;
  category?: string;
  source?: string;
  publishedAt?: string;
  image?: string | null;
  url?: string;
};

function extractNewsItems(output: unknown): NewsItem[] | null {
  if (!output) return null;
  let data: unknown = output;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }
  if (data && typeof data === "object" && "content" in data) {
    const c = (data as { content?: Array<{ type?: string; text?: string }> }).content;
    if (Array.isArray(c)) {
      const textPart = c.find((x) => x?.type === "text" && typeof x.text === "string");
      if (textPart?.text) {
        try {
          data = JSON.parse(textPart.text);
        } catch {
          /* ignore */
        }
      }
    }
  }
  if (data && typeof data === "object" && "structuredContent" in data) {
    data = (data as { structuredContent: unknown }).structuredContent;
  }
  if (data && typeof data === "object" && "items" in data) {
    const items = (data as { items: unknown }).items;
    if (Array.isArray(items)) return items as NewsItem[];
  }
  if (Array.isArray(data)) return data as NewsItem[];
  return null;
}

function formatWhen(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function NewsResults({ items }: { items: NewsItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No stories found.</p>;
  }
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((n, idx) => (
        <a
          key={n.id ?? `${idx}-${n.title}`}
          href={n.url ?? (n.id ? `/article/${n.id}` : "#")}
          target={n.url ? "_blank" : undefined}
          rel={n.url ? "noreferrer" : undefined}
          className="group flex gap-3 rounded-xl border border-border/60 bg-card/60 p-3 transition hover:border-saffron/50 hover:bg-card"
        >
          {n.image ? (
            <img
              src={n.image}
              alt=""
              loading="lazy"
              className="h-16 w-16 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-saffron/10 text-saffron">
              <Newspaper className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-saffron">
              {n.title}
            </h3>
            {n.summary && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{n.summary}</p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
              {n.category && (
                <span className="rounded-full bg-saffron/10 px-2 py-0.5 font-medium text-saffron">
                  {n.category}
                </span>
              )}
              {(n.city || n.state) && <span>{[n.city, n.state].filter(Boolean).join(", ")}</span>}
              {n.source && <span>· {n.source}</span>}
              {n.publishedAt && <span>· {formatWhen(n.publishedAt)}</span>}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

function BotMessage({ message }: { message: UIMessage }) {
  return (
    <Message from={message.role}>
      <MessageContent>
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return <MessageResponse key={i}>{part.text}</MessageResponse>;
          }
          if (part.type?.startsWith("tool-")) {
            const p = part as unknown as {
              type: string;
              toolCallId?: string;
              state?: "input-streaming" | "input-available" | "output-available" | "output-error";
              input?: unknown;
              output?: unknown;
              errorText?: string;
            };
            const toolName = p.type.replace(/^tool-/, "");
            const isNewsTool =
              toolName === "get_latest_news" ||
              toolName === "get_state_news" ||
              toolName === "web_news_search";
            const label =
              toolName === "get_latest_news"
                ? "Latest India news"
                : toolName === "get_state_news"
                  ? "State news"
                  : toolName === "web_news_search"
                    ? "Web news"
                    : toolName.replace(/_/g, " ");

            const newsItems = isNewsTool && p.output ? extractNewsItems(p.output) : null;

            // Completed news fetch → render clean cards.
            if (isNewsTool && newsItems && p.state === "output-available") {
              if (newsItems.length === 0) return null;
              return (
                <div key={p.toolCallId ?? i} className="my-2">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Newspaper className="h-3.5 w-3.5 text-saffron" />
                    {label}
                    <span className="text-muted-foreground/60">· {newsItems.length}</span>
                  </div>
                  <NewsResults items={newsItems} />
                </div>
              );
            }

            // In-flight → subtle shimmer, no JSON.
            if (p.state !== "output-available" && p.state !== "output-error") {
              return (
                <div key={p.toolCallId ?? i} className="my-1">
                  <Shimmer>{`Searching ${label.toLowerCase()}…`}</Shimmer>
                </div>
              );
            }

            // Errored or non-news completed tool → hide.
            return null;
          }
          return null;
        })}
      </MessageContent>
    </Message>
  );
}

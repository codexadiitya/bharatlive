import { createAiGatewayProvider, getAiGatewayConfig } from "@/lib/ai-gateway.server";
import { fetchNews, fetchStateNews } from "@/lib/news.functions";
import { INDIA_STATES, type NewsCategory } from "@/lib/mock-news";
import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  stepCountIs,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";

type ChatRequestBody = { messages?: unknown };

const CATEGORIES: NewsCategory[] = ["Politics", "Business", "Tech", "Sports", "Culture"];
const STATE_NAMES = INDIA_STATES.map((s) => s.name);

const systemPrompt = `You are BharatBot, a friendly assistant for the BharatLive India news app.

Your job: help users discover India news matching their interests. Users tell you what they care about (topics, states, cities, categories) and you fetch matching stories using tools.

Rules:
- ALWAYS use the tools to fetch real news. Never invent headlines.
- Pick the right tool:
  - get_state_news when the user names one of the app's listed Indian states.
  - get_latest_news for national/general topics covered by the app feed.
  - web_news_search for ANY other query - smaller states (e.g. Chhattisgarh, Jharkhand), cities, world topics, specific people/companies, or when get_state_news / get_latest_news returned no items or fallback:true.
- Do NOT tell the user "no stories found" until you have also tried web_news_search. Never suggest checking neighboring states as a substitute for actually searching.
- After fetching, filter/rank by the user's stated interests and reply with a concise, friendly summary of the top 3-6 headlines. Format each as a markdown bullet: **Title** - one-line summary (Source).
- Keep replies compact. Use markdown. No preamble.
- Available categories: ${CATEGORIES.join(", ")}.
- Available app-feed states: ${STATE_NAMES.join(", ")}.`;

function getMessageText(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ")
    .trim();
}

function fallbackStreamResponse(text: string, originalMessages: UIMessage[]) {
  const stream = createUIMessageStream({
    originalMessages,
    execute: ({ writer }) => {
      const id = "fallback-text";
      writer.write({ type: "text-start", id });
      writer.write({ type: "text-delta", id, delta: text });
      writer.write({ type: "text-end", id });
    },
  });

  return createUIMessageStreamResponse({ stream });
}

async function buildFeedFallback(messages: UIMessage[]) {
  const lastUserText = [...messages]
    .reverse()
    .find((message) => message.role === "user");
  const query = lastUserText ? getMessageText(lastUserText).toLowerCase() : "";
  const state = INDIA_STATES.find((item) => {
    const haystack = `${item.name} ${item.capital}`.toLowerCase();
    return haystack.split(" ").some((token) => token.length > 2 && query.includes(token));
  });

  const result = state
    ? await fetchStateNews({ data: { state: state.name, lang: "en" } })
    : await fetchNews({ data: { lang: "en" } });

  const items = result.items.slice(0, 5);
  if (items.length === 0) {
    return "AI chat is not configured yet, and the public feed did not return stories right now. Add AI_GATEWAY_API_KEY for full BharatBot answers.";
  }

  const heading = state
    ? `AI chat is not configured yet, so here are recent ${state.name} stories from the live feed:`
    : "AI chat is not configured yet, so here are recent stories from the live feed:";

  return [
    heading,
    "",
    ...items.map(
      (item) =>
        `- **${item.title}** - ${item.summary || item.city || item.state || "Latest update"} (${item.source})`,
    ),
    "",
    "Add AI_GATEWAY_API_KEY, AI_GATEWAY_BASE_URL, and AI_GATEWAY_MODEL to enable full conversational answers.",
  ].join("\n");
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const uiMessages = messages as UIMessage[];
        const aiConfig = getAiGatewayConfig();
        if (!aiConfig) {
          return fallbackStreamResponse(await buildFeedFallback(uiMessages), uiMessages);
        }

        const gateway = createAiGatewayProvider(aiConfig);
        const model = gateway(aiConfig.model);

        const tools = {
          get_latest_news: tool({
            description:
              "Fetch the latest India news across all states and categories. Use for national or general-interest queries.",
            inputSchema: z.object({
              lang: z.enum(["en", "hi"]).default("en"),
              limit: z.number().int().min(1).max(30).default(15),
            }),
            execute: async ({ lang, limit }) => {
              const { items, fallback } = await fetchNews({ data: { lang } });
              return {
                fallback,
                items: items.slice(0, limit).map((i) => ({
                  title: i.title,
                  summary: i.summary,
                  state: i.state,
                  city: i.city,
                  category: i.category,
                  source: i.source,
                  publishedAt: i.publishedAt,
                })),
              };
            },
          }),
          get_state_news: tool({
            description:
              "Fetch recent news scoped to a specific Indian state. Use when the user mentions a state or city.",
            inputSchema: z.object({
              state: z.string().min(1).describe("Exact state name, e.g. 'Karnataka'"),
              lang: z.enum(["en", "hi"]).default("en"),
              limit: z.number().int().min(1).max(20).default(10),
            }),
            execute: async ({ state, lang, limit }) => {
              const { items, fallback } = await fetchStateNews({ data: { state, lang } });
              return {
                fallback,
                items: items.slice(0, limit).map((i) => ({
                  title: i.title,
                  summary: i.summary,
                  state: i.state,
                  city: i.city,
                  category: i.category,
                  source: i.source,
                  publishedAt: i.publishedAt,
                })),
              };
            },
          }),
          web_news_search: tool({
            description:
              "Search the open web (Google News) for any topic, place, person, or company. Use for smaller Indian states, cities, world events, or anything not covered by get_latest_news / get_state_news.",
            inputSchema: z.object({
              query: z
                .string()
                .min(1)
                .describe("Free-text search, e.g. 'Chhattisgarh politics', 'ISRO launch', 'Manchester United'."),
              lang: z.enum(["en", "hi"]).default("en"),
              limit: z.number().int().min(1).max(15).default(8),
            }),
            execute: async ({ query, lang, limit }) => {
              try {
                const hl = lang === "hi" ? "hi-IN" : "en-IN";
                const gl = "IN";
                const ceid = lang === "hi" ? "IN:hi" : "IN:en";
                const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
                const res = await fetch(url, {
                  headers: {
                    "User-Agent":
                      "Mozilla/5.0 (compatible; BharatLive/1.0; +https://bharatlive.app)",
                    Accept: "application/rss+xml, application/xml, text/xml",
                  },
                });
                if (!res.ok) return { fallback: true, items: [] };
                const xml = await res.text();
                const decode = (s: string) =>
                  s
                    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
                    .replace(/<[^>]+>/g, "")
                    .replace(/&amp;/g, "&")
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">")
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/&nbsp;/g, " ")
                    .trim();
                const items: Array<{
                  title: string;
                  summary: string;
                  source: string;
                  url: string;
                  publishedAt: string;
                }> = [];
                const itemRe = /<item>([\s\S]*?)<\/item>/g;
                let m: RegExpExecArray | null;
                while ((m = itemRe.exec(xml)) && items.length < limit) {
                  const block = m[1];
                  const pick = (tag: string) => {
                    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
                    const hit = block.match(re);
                    return hit ? decode(hit[1]) : "";
                  };
                  const title = pick("title");
                  const link = pick("link");
                  if (!title || !link) continue;
                  const pubDate = pick("pubDate");
                  items.push({
                    title,
                    summary: pick("description").slice(0, 280),
                    source: pick("source") || "Google News",
                    url: link,
                    publishedAt: pubDate
                      ? new Date(pubDate).toISOString()
                      : new Date().toISOString(),
                  });
                }
                return { fallback: items.length === 0, items };
              } catch (err) {
                console.error("web_news_search error", err);
                return { fallback: true, items: [] };
              }
            },
          }),
        };

        const result = streamText({
          model,
          system: systemPrompt,
          messages: await convertToModelMessages(uiMessages),
          tools,
          stopWhen: stepCountIs(50),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: uiMessages,
        });
      },
    },
  },
});

import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fetchNews } from "@/lib/news.functions";

export default defineTool({
  name: "get_latest_news",
  title: "Get latest India news",
  description:
    "Fetch the latest India news headlines from the app's live feed. Returns up to 40 recent items across states and categories (Politics, Business, Tech, Sports, Culture).",
  inputSchema: {
    lang: z
      .enum(["en", "hi"])
      .default("en")
      .describe("Language of the returned items: 'en' (English) or 'hi' (Hindi)."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(40)
      .default(15)
      .describe("Maximum number of items to return (1-40)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: true },
  handler: async ({ lang, limit }) => {
    const { items, fallback } = await fetchNews({ data: { lang } });
    const trimmed = items.slice(0, limit).map((i) => ({
      id: i.id,
      title: i.title,
      summary: i.summary,
      state: i.state,
      city: i.city,
      category: i.category,
      source: i.source,
      publishedAt: i.publishedAt,
      image: i.image ?? null,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify({ fallback, items: trimmed }, null, 2) }],
      structuredContent: { fallback, items: trimmed },
    };
  },
});

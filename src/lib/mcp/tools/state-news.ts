import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fetchStateNews } from "@/lib/news.functions";

export default defineTool({
  name: "get_state_news",
  title: "Get news for an Indian state",
  description:
    "Fetch recent news filtered to a specific Indian state or union territory (e.g. 'Maharashtra', 'Kerala'). Use `list_states` to see valid names.",
  inputSchema: {
    state: z
      .string()
      .min(1)
      .describe("The state name exactly as returned by `list_states` (e.g. 'Karnataka')."),
    lang: z
      .enum(["en", "hi"])
      .default("en")
      .describe("Language of the returned items: 'en' (English) or 'hi' (Hindi)."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(10)
      .describe("Maximum number of items to return (1-20)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: true },
  handler: async ({ state, lang, limit }) => {
    const { items, fallback } = await fetchStateNews({ data: { state, lang } });
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

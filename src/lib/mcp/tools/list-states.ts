import { defineTool } from "@lovable.dev/mcp-js";
import { INDIA_STATES } from "@/lib/mock-news";

export default defineTool({
  name: "list_states",
  title: "List Indian states",
  description:
    "List all Indian states and union territories covered by the news app, with their capital cities and ISO codes.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const rows = INDIA_STATES.map((s) => ({
      name: s.name,
      code: s.code,
      capital: s.capital,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { states: rows },
    };
  },
});

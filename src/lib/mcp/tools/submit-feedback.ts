import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { submitFeedback } from "@/lib/feedback.functions";

export default defineTool({
  name: "submit_feedback",
  title: "Submit feedback",
  description:
    "Send feedback about the news app on behalf of the caller. Message is required; name and email are optional.",
  inputSchema: {
    message: z
      .string()
      .min(1)
      .max(2000)
      .describe("Feedback message (1-2000 characters)."),
    name: z
      .string()
      .max(100)
      .optional()
      .describe("Optional name of the person sending feedback."),
    email: z
      .string()
      .email()
      .max(255)
      .optional()
      .describe("Optional email for follow-up."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  handler: async ({ message, name, email }) => {
    try {
      await submitFeedback({ data: { message, name, email } });
      return {
        content: [{ type: "text", text: "Feedback submitted. Thank you!" }],
        structuredContent: { ok: true },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit feedback";
      return { content: [{ type: "text", text: msg }], isError: true };
    }
  },
});

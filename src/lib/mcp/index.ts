import { defineMcp } from "@lovable.dev/mcp-js";
import listStatesTool from "./tools/list-states";
import latestNewsTool from "./tools/latest-news";
import stateNewsTool from "./tools/state-news";
import submitFeedbackTool from "./tools/submit-feedback";

export default defineMcp({
  name: "bharat-live-mcp",
  title: "Bharat Live News",
  version: "0.1.0",
  instructions:
    "Tools for the Bharat Live India news app. Use `list_states` to discover coverage, `get_latest_news` for the national feed, `get_state_news` to filter by an Indian state, and `submit_feedback` to send user feedback. News is available in English and Hindi.",
  tools: [listStatesTool, latestNewsTool, stateNewsTool, submitFeedbackTool],
});

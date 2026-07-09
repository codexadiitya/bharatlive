import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export type AiGatewayConfig = {
  apiKey: string;
  baseURL: string;
  model: string;
  headers: Record<string, string>;
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getAiGatewayConfig(): AiGatewayConfig | null {
  const apiKey =
    process.env.AI_GATEWAY_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.OPENROUTER_API_KEY;

  if (!apiKey) return null;

  const usingOpenRouter = Boolean(process.env.OPENROUTER_API_KEY && !process.env.AI_GATEWAY_API_KEY);
  const baseURL = trimTrailingSlash(
    process.env.AI_GATEWAY_BASE_URL ||
      process.env.OPENAI_BASE_URL ||
      (usingOpenRouter ? "https://openrouter.ai/api/v1" : "https://api.openai.com/v1"),
  );

  return {
    apiKey,
    baseURL,
    model: process.env.AI_GATEWAY_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  };
}

export function createAiGatewayProvider(config: AiGatewayConfig) {
  return createOpenAICompatible({
    name: "bharat-live-ai",
    baseURL: config.baseURL,
    headers: config.headers,
  });
}

export function chatCompletionsUrl(config: AiGatewayConfig) {
  return `${config.baseURL}/chat/completions`;
}

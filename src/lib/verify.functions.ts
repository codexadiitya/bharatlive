import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { chatCompletionsUrl, getAiGatewayConfig } from "./ai-gateway.server";

const VerifyInput = z.object({
  title: z.string().min(1),
  summary: z.string().default(""),
  source: z.string().default(""),
  lang: z.enum(["en", "hi"]).default("en"),
});

export type VerifyResult = {
  score: number;
  verdict: "likely_true" | "unclear" | "likely_false";
  reasoning: string;
  redFlags: string[];
  suggestions: string[];
};

const SYSTEM_EN = `You are a fake-news analyst for Indian news. Given a headline + summary + source, judge how credible the CLAIM sounds and whether the framing shows red flags of misinformation (sensational language, unnamed sources, unverifiable stats, deepfake tells, communal bait, clickbait).
You are NOT fact-checking against the live web. You're rating linguistic and structural credibility signals only. Say so if the claim needs external verification.
Return STRICT JSON with keys: score (0-100 integer), verdict ("likely_true"|"unclear"|"likely_false"), reasoning (2-3 short sentences), redFlags (array of short strings), suggestions (array of 1-3 short verification tips). No prose outside JSON.`;

const SYSTEM_HI = `Aap Indian news ke liye fake-news analyst hain. Headline + summary + source dekhkar batayein ki claim kitna credible lagta hai aur misinformation ke red flags hain ya nahi (sensational bhasha, un-named sources, unverifiable numbers, communal bait, clickbait).
Aap live web fact-check NAHI kar rahe hain. Sirf linguistic aur structural credibility rate kar rahe hain. Zaroori ho toh bata dein ki external verification chahiye.
STRICT JSON return karein keys ke saath: score (0-100 integer), verdict ("likely_true"|"unclear"|"likely_false"), reasoning (2-3 chhote Hindi vaakya), redFlags (chhoti strings ka array), suggestions (1-3 verification tips ka array). JSON ke bahar kuch nahi.`;

function localVerify(data: z.infer<typeof VerifyInput>): VerifyResult {
  const text = `${data.title} ${data.summary}`.toLowerCase();
  const redFlags: string[] = [];
  let score = 76;

  if (!data.source.trim()) {
    redFlags.push("Missing source");
    score -= 14;
  }
  if (/breaking|shocking|viral|must watch|you won't believe|exposed|secret/.test(text)) {
    redFlags.push("Sensational framing");
    score -= 12;
  }
  if (/communal|religion|caste|riot|violence/.test(text)) {
    redFlags.push("Sensitive social claim needs extra verification");
    score -= 10;
  }
  if (/\b\d{3,}%|crore|lakh|million|billion\b/.test(text) && !data.summary) {
    redFlags.push("Large number without supporting summary");
    score -= 8;
  }
  if (data.title.length < 18) {
    redFlags.push("Very short headline");
    score -= 6;
  }

  score = Math.max(25, Math.min(92, score));
  const verdict = score >= 70 ? "likely_true" : score >= 45 ? "unclear" : "likely_false";

  return {
    score,
    verdict,
    reasoning:
      data.lang === "hi"
        ? "AI key configured nahi hai, isliye yeh local credibility check hai. Source, bhasha, aur claim structure ke base par score diya gaya hai; final fact-check ke liye trusted sources verify karein."
        : "AI is not configured, so this is a local credibility check. The score is based on source, wording, and claim structure; verify with trusted sources before treating it as fact.",
    redFlags,
    suggestions:
      data.lang === "hi"
        ? ["Same story ko 2-3 trusted outlets par check karein.", "Official statement ya primary source dhoondein."]
        : ["Check the same story on 2-3 trusted outlets.", "Look for an official statement or primary source."],
  };
}

export const verifyArticle = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => VerifyInput.parse(d))
  .handler(async ({ data }): Promise<VerifyResult> => {
    const aiConfig = getAiGatewayConfig();
    if (!aiConfig) return localVerify(data);

    const userMsg = `Headline: ${data.title}\nSummary: ${data.summary}\nSource: ${data.source || "unknown"}`;

    const res = await fetch(chatCompletionsUrl(aiConfig), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...aiConfig.headers,
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [
          { role: "system", content: data.lang === "hi" ? SYSTEM_HI : SYSTEM_EN },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("Rate limit. Try again in a minute.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    if (!res.ok) return localVerify(data);

    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "{}";
    let parsed: VerifyResult;
    try {
      parsed = JSON.parse(content);
    } catch {
      return localVerify(data);
    }

    return {
      score: Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0))),
      verdict: ["likely_true", "unclear", "likely_false"].includes(parsed.verdict)
        ? parsed.verdict
        : "unclear",
      reasoning: String(parsed.reasoning || ""),
      redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags.slice(0, 6).map(String) : [],
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.slice(0, 4).map(String)
        : [],
    };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { chatCompletionsUrl, getAiGatewayConfig } from "./ai-gateway.server";

const ArticleInput = z.object({
  title: z.string(),
  summary: z.string(),
  source: z.string(),
  city: z.string(),
  state: z.string(),
  lang: z.enum(["en", "hi"]).default("en"),
});

function localMockArticle(data: z.infer<typeof ArticleInput>): string[] {
  if (data.lang === "hi") {
    return [
      `${data.summary} ${data.city} (राज्य: ${data.state}) से मिल रही इस ताज़ा खबर ने पूरे क्षेत्र में लोगों का ध्यान आकर्षित किया है। स्थानीय संवाददाताओं और प्रत्यक्षदर्शियों के अनुसार, स्थिति पर नज़र रखी जा रही है।`,
      `सूत्रों के हवाले से ${data.source} को मिली जानकारी के अनुसार, आने वाले घंटों में आधिकारिक बयान जारी होने की उम्मीद है। संबंधित अधिकारी इस मामले की जांच कर रहे हैं।`,
      `इस विकासशील कहानी पर अधिक अपडेट के लिए भारतलाइव (BharatLive) के साथ बने रहें। हम जैसे ही नई जानकारी आएगी, खबर को अपडेट करते रहेंगे।`
    ];
  }
  return [
    `${data.summary} This developing story from ${data.city} is drawing significant attention across ${data.state} and beyond, with local reporters on the ground and community leaders weighing in throughout the day.`,
    `Sources familiar with the matter tell ${data.source} that further official updates are expected in the coming hours as investigation details are compiled.`,
    `BharatLive will continue to track the story as it evolves and add fresh context as new details emerge.`
  ];
}

// Simple in-memory cache to save API credits on route refresh.
const articleCache = new Map<string, string[]>();

export const generateFullArticle = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ArticleInput.parse(d))
  .handler(async ({ data }): Promise<string[]> => {
    const cacheKey = `${data.lang}:${data.title}`;
    if (articleCache.has(cacheKey)) {
      return articleCache.get(cacheKey)!;
    }

    const aiConfig = getAiGatewayConfig();
    if (!aiConfig) return localMockArticle(data);

    try {
      const systemPrompt = data.lang === "hi"
        ? `Aap ek professional Indian journalist hain jo kisi bade national news organization ke liye likh rahe hain. 
Diye gaye headline, summary, source, city aur state ke aadhar par ek detailed, realistic 3-paragraph news article likhein:
- Paragraph 1: Headline aur summary ko expand karein aur zaroori facts (who, what, where, when, why) batayein.
- Paragraph 2: Kuch background detail aur local leaders ya logo ke quotes (simulated) jodkar ise sachchi report jaisa banayein.
- Paragraph 3: Aage kya hone wala hai ya local authorities kya kar rahi hain, is par focus karein.
Bhasha: Hindi (Devanagari script) mein hi likhein.
Markdown titles (# ya ##) ya main title NAHI chahiye. Sirf paragraphs ko double newlines se separate karke return karein.`
        : `You are a professional Indian news journalist writing for a national news outlet.
Given a headline, a short summary, source, city, and state:
Write a detailed, comprehensive 3-paragraph news article.
- Paragraph 1: Expand on the headline, introducing the key facts (who, what, where, when, why).
- Paragraph 2: Provide context, background information, or quotes from simulated officials/citizens to make it look like a real, detailed report.
- Paragraph 3: Explain the future outlook, next steps, or what local authorities are doing.
Language: Write the article in English.
Do NOT include markdown headers (like # or ##) or titles. Just return the paragraphs separated by double newlines.`;

      const userMsg = `Headline: ${data.title}\nSummary: ${data.summary}\nSource: ${data.source}\nCity: ${data.city}\nState: ${data.state}`;

      const res = await fetch(chatCompletionsUrl(aiConfig), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...aiConfig.headers,
        },
        body: JSON.stringify({
          model: aiConfig.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMsg },
          ],
        }),
      });

      if (!res.ok) return localMockArticle(data);

      const json = await res.json();
      const content: string = json?.choices?.[0]?.message?.content ?? "";
      const paragraphs = content
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean);

      if (paragraphs.length >= 2) {
        articleCache.set(cacheKey, paragraphs);
        return paragraphs;
      }
    } catch (err) {
      console.error("Failed to generate article", err);
    }

    return localMockArticle(data);
  });

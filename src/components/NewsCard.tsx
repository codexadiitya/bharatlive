import { type NewsItem, timeAgo, newsImage, fallbackImage } from "@/lib/mock-news";
import { Link } from "@tanstack/react-router";
import { MapPin, Bookmark, Share2, ShieldCheck, Loader2, AlertTriangle, CheckCircle2, HelpCircle, X } from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { verifyArticle, type VerifyResult } from "@/lib/verify.functions";
import { useBookmarks } from "@/hooks/useBookmarks";
import { usePreferences } from "@/hooks/usePreferences";
import { useLang, CATEGORY_HI } from "@/hooks/useLang";
import { toast } from "sonner";


const categoryColor: Record<string, string> = {
  Politics: "bg-saffron/15 text-saffron border-saffron/30",
  Business: "bg-india-green/15 text-india-green border-india-green/30",
  Tech: "bg-chakra/15 text-chakra border-chakra/30",
  Sports: "bg-primary/15 text-primary border-primary/30",
  Culture: "bg-accent/15 text-accent border-accent/30",
};

export default function NewsCard({ item }: { item: NewsItem }) {
  const { has, toggle } = useBookmarks();
  const { log } = usePreferences();
  const { lang } = useLang();
  const saved = has(item.id);
  const catLabel = lang === "hi" ? CATEGORY_HI[item.category] ?? item.category : item.category;

  const verify = useServerFn(verifyArticle);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [open, setOpen] = useState(false);

  const onVerify = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
    if (result || verifying) return;
    log(item, "verify");
    setVerifying(true);
    try {
      const r = await verify({ data: { title: item.title, summary: item.summary, source: item.source, lang } });
      setResult(r);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
      setOpen(false);
    } finally {
      setVerifying(false);
    }
  };


  const onShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/article/${item.id}`;
    log(item, "share");
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, text: item.summary, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      }
    } catch {
      /* user cancelled */
    }
  };

  const onBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nowSaved = toggle(item);
    if (nowSaved) log(item, "bookmark");
    toast.success(nowSaved ? "Bookmarked" : "Removed from bookmarks");
  };

  return (
    <article className="group relative overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-saffron/50 hover:bg-card/80">
      <Link
        to="/article/$id"
        params={{ id: item.id }}
        className="absolute inset-0 z-0 rounded-xl"
        aria-label={item.title}
      />
      <div className="relative z-[1] aspect-[16/9] w-full overflow-hidden bg-muted">
        <img
          src={newsImage(item)}
          alt={item.title}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            const img = e.currentTarget;
            const fb = fallbackImage(item.id);
            if (img.src !== fb) img.src = fb;
          }}
          onLoad={(e) => {
            const img = e.currentTarget;
            // Some publishers return 1x1 tracker pixels or broken tiny images
            // that decode to garbage/glitch on mobile browsers — swap to fallback.
            if (img.naturalWidth < 100 || img.naturalHeight < 60) {
              const fb = fallbackImage(item.id);
              if (img.src !== fb) img.src = fb;
            }
          }}
        />
      </div>
      <div className="relative z-[1] p-5">

      <div className="relative z-10 mb-3 flex items-center justify-between gap-2">
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${
            categoryColor[item.category] ?? "bg-muted text-muted-foreground border-border"
          }`}
        >
          {catLabel}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onBookmark}
            className={`relative z-10 rounded-full p-1.5 transition hover:bg-muted ${
              saved ? "text-saffron" : "text-muted-foreground"
            }`}
            aria-label={saved ? "Remove bookmark" : "Bookmark"}
          >
            <Bookmark className="h-3.5 w-3.5" fill={saved ? "currentColor" : "none"} />
          </button>
          <button
            onClick={onShare}
            className="relative z-10 rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Share"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
          <span className="ml-1 text-[11px] text-muted-foreground">{timeAgo(item.publishedAt)}</span>
        </div>
      </div>
      <h3 className="relative z-[1] text-base font-semibold leading-snug text-foreground group-hover:text-saffron">
        {item.title}
      </h3>
      <p className="relative z-[1] mt-2 text-sm leading-relaxed text-muted-foreground">{item.summary}</p>
      <div className="relative z-[1] mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {item.city}, {item.state}
        </span>
        <span className="font-medium text-foreground/70">{item.source}</span>
      </div>
      <button
        onClick={onVerify}
        className="relative z-10 mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-chakra/40 bg-chakra/10 px-3 py-1.5 text-xs font-medium text-chakra transition hover:bg-chakra/20"
      >
        {verifying ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
        {lang === "hi" ? "AI से सत्यापित करें" : "Verify with AI"}
      </button>
      </div>



      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          onClick={(e) => { e.stopPropagation(); setOpen(false); }}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-chakra" />
              <h4 className="font-display text-lg font-bold">
                {lang === "hi" ? "AI विश्वसनीयता जाँच" : "AI Credibility Check"}
              </h4>
            </div>

            {verifying && (
              <div className="flex flex-col items-center gap-3 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-chakra" />
                {lang === "hi" ? "AI विश्लेषण कर रहा है…" : "AI is analyzing…"}
              </div>
            )}

            {result && !verifying && (() => {
              const isTrue = result.verdict === "likely_true";
              const isFalse = result.verdict === "likely_false";
              const Icon = isTrue ? CheckCircle2 : isFalse ? AlertTriangle : HelpCircle;
              const color = isTrue ? "text-india-green" : isFalse ? "text-destructive" : "text-muted-foreground";
              const bar = isTrue ? "bg-india-green" : isFalse ? "bg-destructive" : "bg-muted-foreground";
              const label =
                lang === "hi"
                  ? isTrue ? "संभवतः सही" : isFalse ? "संदिग्ध" : "अस्पष्ट"
                  : isTrue ? "Likely true" : isFalse ? "Suspicious" : "Unclear";
              return (
                <div className="space-y-4">
                  <div>
                    <div className={`flex items-center gap-2 ${color}`}>
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-semibold">{label}</span>
                      <span className="ml-auto text-2xl font-bold text-foreground">{result.score}<span className="text-xs text-muted-foreground">/100</span></span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full ${bar} transition-all`} style={{ width: `${result.score}%` }} />
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed text-foreground">{result.reasoning}</p>

                  {result.redFlags.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-destructive">
                        {lang === "hi" ? "चेतावनी संकेत" : "Red flags"}
                      </p>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {result.redFlags.map((f, i) => (
                          <li key={i} className="flex gap-2"><span className="text-destructive">•</span>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.suggestions.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-chakra">
                        {lang === "hi" ? "सत्यापन सुझाव" : "How to verify"}
                      </p>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {result.suggestions.map((s, i) => (
                          <li key={i} className="flex gap-2"><span className="text-chakra">→</span>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="border-t border-border pt-3 text-[10px] text-muted-foreground">
                    {lang === "hi"
                      ? "यह AI आकलन है, अंतिम फैसला नहीं। मूल स्रोत से पुष्टि करें।"
                      : "This is an AI assessment, not a verdict. Always confirm with primary sources."}
                  </p>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </article>
  );

}

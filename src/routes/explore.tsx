import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { type StateInfo } from "@/lib/mock-news";
import IndiaMap from "@/components/IndiaMap";
import StateList from "@/components/StateList";
import WeatherWidget from "@/components/WeatherWidget";
import { T, useLang } from "@/hooks/useLang";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore India — BharatLive" },
      { name: "description", content: "Spin the interactive map of India and tap any state to see live weather and headlines from that region." },
      { property: "og:title", content: "Explore India — BharatLive" },
      { property: "og:description", content: "Interactive India map with live weather and regional news." },
    ],
  }),
  component: ExplorePage,
});

function ExplorePage() {
  const [selected, setSelected] = useState<StateInfo | null>(null);
  const { lang } = useLang();
  const t = T[lang];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-saffron">
          <ArrowLeft className="h-4 w-4" /> {t.backHome}
        </Link>
        <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
          {lang === "hi" ? "भारत खोजें" : "Explore India"}
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          {lang === "hi"
            ? "किसी राज्य पर टैप कीजिए — मौसम और ताज़ा समाचार देखिए।"
            : "Tap any state on the map to see live weather and the latest news from that region."}
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="relative aspect-[10/11] w-full">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-saffron/20 via-transparent to-india-green/20 blur-3xl" />
            <IndiaMap onSelect={setSelected} selected={selected} />
            {selected && (
              <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-saffron/40 bg-background/90 px-4 py-1.5 text-xs backdrop-blur-md">
                <span className="text-muted-foreground">{t.viewing}</span>{" "}
                <span className="font-semibold text-saffron">{selected.name}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-4">
            <div className="min-h-0 flex-1 overflow-hidden">
              <StateList onSelect={setSelected} selected={selected} />
            </div>
            <WeatherWidget
              lat={selected?.lat ?? 28.61}
              lng={selected?.lng ?? 77.2}
              place={selected ? `${selected.capital}, ${selected.name}` : t.newDelhi}
            />
            {selected && (
              <Link
                to="/state/$code"
                params={{ code: selected.code }}
                className="rounded-xl bg-saffron px-4 py-3 text-center text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                {t.latestFrom(selected.name)} →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { INDIA_STATES, MOCK_NEWS, type StateInfo } from "@/lib/mock-news";
import { Search, MapPin, ArrowRight } from "lucide-react";
import { useLang } from "@/hooks/useLang";

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

export default function StateList({
  onSelect,
  selected,
}: {
  onSelect: (s: StateInfo | null) => void;
  selected: StateInfo | null;
}) {
  const [q, setQ] = useState("");
  const { lang } = useLang();

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const n of MOCK_NEWS) m[n.state] = (m[n.state] ?? 0) + 1;
    return m;
  }, []);

  const list = useMemo(() => {
    const arr = [...INDIA_STATES].sort((a, b) => a.name.localeCompare(b.name));
    if (!q.trim()) return arr;
    const needle = q.toLowerCase();
    return arr.filter((s) => s.name.toLowerCase().includes(needle));
  }, [q]);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border/60 bg-card/60 backdrop-blur">
      <div className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-saffron" />
          {lang === "hi" ? "सभी राज्य" : "All States & UTs"}
        </div>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={lang === "hi" ? "राज्य खोजें…" : "Search state…"}
            className="w-full rounded-full border border-border bg-background/60 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-saffron/60"
          />
        </div>
      </div>

      <ul className="scroll-thin flex-1 overflow-y-auto p-2 space-y-1.5">
        {list.map((s) => {
          const active = selected?.name === s.name;
          const count = counts[s.name] ?? 0;
          return (
            <li key={s.name} className="group/row flex items-center gap-1">
              <button
                onClick={() => onSelect(active ? null : s)}
                className={`flex flex-1 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-all ${
                  active
                    ? "bg-saffron/15 border-saffron text-saffron"
                    : count > 0
                    ? "bg-card/80 border-india-green/40 hover:border-india-green/80 text-foreground"
                    : "bg-transparent border-transparent hover:bg-card/50 text-muted-foreground"
                }`}
              >
                <span className="min-w-0 truncate font-medium leading-tight">{s.name}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                    active
                      ? "bg-saffron text-primary-foreground"
                      : count > 0
                      ? "bg-india-green text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
              <Link
                to="/state/$code"
                params={{ code: slugify(s.name) }}
                className="rounded-md p-1.5 text-muted-foreground opacity-0 transition hover:bg-muted hover:text-saffron group-hover/row:opacity-100"
                aria-label={`Open ${s.name}`}
              >
                <ArrowRight className="h-3 w-3" />
              </Link>
            </li>
          );
        })}
        {list.length === 0 && (
          <li className="px-4 py-6 text-center text-xs text-muted-foreground">
            {lang === "hi" ? `"${q}" से मेल नहीं` : `No state matches "${q}"`}
          </li>
        )}
      </ul>
    </div>
  );
}

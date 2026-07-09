import indiaStates from "@/lib/india-states.json";
import { useMemo, useState } from "react";
import type { StateInfo } from "@/lib/mock-news";
import { INDIA_STATES, MOCK_NEWS } from "@/lib/mock-news";
import { useIsDark } from "@/hooks/useIsDark";

// Some names in the source dataset use older spellings — normalize to our data
const NAME_ALIAS: Record<string, string> = {
  Orissa: "Odisha",
  Uttaranchal: "Uttarakhand",
};

function normalize(name: string) {
  return NAME_ALIAS[name] ?? name;
}

// Short label for tiny states (shown when full name won't fit)
const SHORT: Record<string, string> = {
  "Jammu and Kashmir": "J&K",
  "Himachal Pradesh": "HP",
  "Arunachal Pradesh": "Arunachal",
  "Andhra Pradesh": "AP",
  "Madhya Pradesh": "MP",
  "Uttar Pradesh": "UP",
  "Tamil Nadu": "TN",
  "West Bengal": "W. Bengal",
  "Andaman and Nicobar": "A & N",
  "Dadra and Nagar Haveli": "DNH",
  "Daman and Diu": "Daman",
  Chandigarh: "Chd",
  Puducherry: "Pdy",
};

// Compute a rough centroid + bbox size from an SVG path string
function pathMetrics(d: string) {
  const nums = d.match(/-?\d+\.?\d*/g)?.map(Number) ?? [];
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < nums.length - 1; i += 2) {
    xs.push(nums[i]);
    ys.push(nums[i + 1]);
  }
  if (!xs.length) return { cx: 0, cy: 0, w: 0, h: 0 };
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    w: maxX - minX,
    h: maxY - minY,
  };
}

export default function IndiaMap({
  onSelect,
  selected,
}: {
  onSelect: (s: StateInfo | null) => void;
  selected: StateInfo | null;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const isDark = useIsDark();

  const newsCount = useMemo(() => {
    const m: Record<string, number> = {};
    for (const n of MOCK_NEWS) m[n.state] = (m[n.state] ?? 0) + 1;
    return m;
  }, []);
  const maxCount = Math.max(1, ...Object.values(newsCount));

  const stateByName = useMemo(() => {
    const m: Record<string, StateInfo> = {};
    for (const s of INDIA_STATES) m[s.name] = s;
    return m;
  }, []);

  const paths = useMemo(
    () =>
      (indiaStates as { name: string; d: string }[]).map((s) => ({
        ...s,
        metrics: pathMetrics(s.d),
      })),
    [],
  );

  const baseL = isDark ? 0.30 : 0.82;
  const activeFill = isDark ? "oklch(0.78 0.16 60)" : "oklch(0.65 0.16 60)";
  const activeStroke = isDark ? "oklch(0.88 0.14 60)" : "oklch(0.75 0.14 60)";
  const inactiveStroke = isDark ? "oklch(0.55 0.03 265)" : "oklch(0.70 0.03 265)";

  const labelActiveFill = "oklch(0.15 0.02 265)";
  const labelInactiveFill = isDark ? "oklch(0.92 0.02 265)" : "oklch(0.35 0.02 265)";
  const labelActiveStroke = "oklch(0.98 0.05 60)";
  const labelInactiveStroke = isDark ? "oklch(0.18 0.02 265)" : "oklch(0.97 0.01 265)";

  return (
    <div className="relative h-full w-full">
      <svg
        viewBox="0 0 1000 1100"
        className="h-full w-full"
        style={{ filter: "drop-shadow(0 20px 40px rgba(246,164,74,0.15))" }}
      >
        <defs>
          <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(246,164,74,0.15)" />
            <stop offset="100%" stopColor="rgba(246,164,74,0)" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="1000" height="1100" fill="url(#mapGlow)" />

        {paths.map((s) => {
          const displayName = normalize(s.name);
          const info = stateByName[displayName];
          const isSelected = selected?.name === displayName;
          const isHover = hover === s.name;
          const heat = (newsCount[displayName] ?? 0) / maxCount;
          const active = isSelected || isHover;

          return (
            <path
              key={s.name}
              d={s.d}
              fill={
                active
                  ? activeFill
                  : `oklch(${baseL} ${0.04 + heat * 0.08} 265)`
              }
              stroke={active ? activeStroke : inactiveStroke}
              strokeWidth={active ? 1.5 : 0.6}
              className="cursor-pointer transition-[fill,stroke] duration-200"
              onMouseEnter={() => setHover(s.name)}
              onMouseLeave={() => setHover(null)}
              onClick={() => {
                if (!info) return;
                onSelect(isSelected ? null : info);
              }}
            >
              <title>
                {`${displayName}${info ? ` — ${newsCount[displayName] ?? 0} stories` : ""}`}
              </title>
            </path>
          );
        })}

        {/* State name labels — placed at bbox centroid, sized by bbox */}
        {paths.map((s) => {
          const displayName = normalize(s.name);
          const { cx, cy, w, h } = s.metrics;
          const size = Math.min(w, h);
          // Skip labels for tiny slivers (islands, UTs) — they get tooltip on hover
          if (size < 25) return null;
          const isActive = hover === s.name || selected?.name === displayName;
          const label =
            size < 55 ? SHORT[displayName] ?? displayName.slice(0, 3) : displayName;
          const fontSize = Math.max(8, Math.min(14, size * 0.22));
          return (
            <text
              key={`lbl-${s.name}`}
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={fontSize}
              fontWeight={600}
              fill={isActive ? labelActiveFill : labelInactiveFill}
              opacity={isActive ? 1 : 0.75}
              style={{
                pointerEvents: "none",
                paintOrder: "stroke",
                stroke: isActive ? labelActiveStroke : labelInactiveStroke,
                strokeWidth: 2.5,
                strokeLinejoin: "round",
              }}
            >
              {label}
            </text>
          );
        })}
      </svg>

      {hover && (
        <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-saffron/40 bg-background/90 px-4 py-1.5 text-xs backdrop-blur-md">
          <span className="font-semibold text-saffron">{normalize(hover)}</span>
          <span className="ml-2 text-muted-foreground">
            {newsCount[normalize(hover)] ?? 0} stories
          </span>
        </div>
      )}
    </div>
  );
}

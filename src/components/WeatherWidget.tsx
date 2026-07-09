import { useQuery } from "@tanstack/react-query";
import { Cloud, CloudRain, CloudSnow, Sun, CloudFog, CloudLightning, Droplets, Wind, Moon } from "lucide-react";
import type { WeatherData } from "@/lib/weather-query";
import { weatherQueryOptions } from "@/lib/weather-query";
import { T, useLang } from "@/hooks/useLang";

const WMO_HI: Record<number, string> = {
  0: "साफ़ आसमान", 1: "मुख्यतः साफ़", 2: "आंशिक बादल", 3: "बादल छाए",
  45: "कोहरा", 48: "बर्फ़ीला कोहरा",
  51: "हल्की बूँदाबाँदी", 53: "बूँदाबाँदी", 55: "तेज़ बूँदाबाँदी",
  61: "हल्की बारिश", 63: "बारिश", 65: "तेज़ बारिश",
  71: "हल्की बर्फ़", 73: "बर्फ़", 75: "भारी बर्फ़",
  80: "बौछारें", 81: "तेज़ बौछारें", 82: "प्रचंड बौछारें",
  95: "आँधी-तूफ़ान", 96: "ओलों के साथ तूफ़ान", 99: "भीषण तूफ़ान",
};
const WEEKDAY_HI = ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"];

function iconFor(code: number, isDay = true) {
  if (code === 0 || code === 1) return isDay ? Sun : Moon;
  if (code === 2 || code === 3) return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if (code >= 51 && code <= 67) return CloudRain;
  if (code >= 71 && code <= 77) return CloudSnow;
  if (code >= 80 && code <= 82) return CloudRain;
  if (code >= 95) return CloudLightning;
  return Cloud;
}

export default function WeatherWidget({ lat, lng, place }: { lat: number; lng: number; place: string }) {
  const { lang } = useLang();
  const t = T[lang];
  const { data, isLoading, isError } = useQuery<WeatherData>(weatherQueryOptions(lat, lng));

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/60 p-5 text-sm text-muted-foreground">
        {t.weatherLoading(place)}
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
        {t.weatherUnavailable}
      </div>
    );
  }

  const Icon = iconFor(data.code, data.isDay);
  const desc = lang === "hi" ? (WMO_HI[data.code] ?? data.description) : data.description;

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-saffron/5">
      <div className="flex items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{t.liveWeather}</div>
          <div className="truncate text-sm font-semibold">{place}</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-5xl font-black tabular-nums">{data.temp}°</span>
            <span className="text-xs text-muted-foreground">{t.weatherFeels} {data.feelsLike}°</span>
          </div>
          <div className="mt-1 text-sm text-foreground/80">{desc}</div>
        </div>
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-saffron/15 text-saffron">
          <Icon className="h-8 w-8" />
        </div>
      </div>
      <div className="flex items-center gap-4 border-t border-border/50 px-5 py-2.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Droplets className="h-3.5 w-3.5" />{data.humidity}%</span>
        <span className="inline-flex items-center gap-1"><Wind className="h-3.5 w-3.5" />{data.wind} km/h</span>
      </div>
      <div className="grid grid-cols-5 gap-1 border-t border-border/50 bg-background/40 p-2">
        {data.daily.slice(0, 5).map((d, i) => {
          const DIcon = iconFor(d.code, true);
          const dt = new Date(d.date);
          const label = i === 0 ? t.today : lang === "hi" ? WEEKDAY_HI[dt.getDay()] : dt.toLocaleDateString("en-US", { weekday: "short" });
          return (
            <div key={d.date} className="flex flex-col items-center gap-1 rounded-lg py-2 text-center">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
              <DIcon className="h-4 w-4 text-saffron" />
              <span className="text-[11px] font-semibold tabular-nums">{d.max}°</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">{d.min}°</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

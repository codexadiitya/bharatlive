import { queryOptions } from "@tanstack/react-query";

export type WeatherData = {
  temp: number;
  feelsLike: number;
  humidity: number;
  wind: number;
  code: number;
  description: string;
  isDay: boolean;
  daily: Array<{ date: string; min: number; max: number; code: number; description: string }>;
};

const WMO: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow",
  80: "Rain showers", 81: "Heavy showers", 82: "Violent showers",
  95: "Thunderstorm", 96: "Thunderstorm w/ hail", 99: "Severe thunderstorm",
};
const describe = (c: number) => WMO[c] ?? "—";

async function fetchWeather(lat: number, lng: number): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FKolkata&forecast_days=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather ${res.status}`);
  const j: any = await res.json();
  const c = j.current;
  const d = j.daily;
  return {
    temp: Math.round(c.temperature_2m),
    feelsLike: Math.round(c.apparent_temperature),
    humidity: c.relative_humidity_2m,
    wind: Math.round(c.wind_speed_10m),
    code: c.weather_code,
    description: describe(c.weather_code),
    isDay: c.is_day === 1,
    daily: d.time.map((t: string, i: number) => ({
      date: t,
      min: Math.round(d.temperature_2m_min[i]),
      max: Math.round(d.temperature_2m_max[i]),
      code: d.weather_code[i],
      description: describe(d.weather_code[i]),
    })),
  };
}

export const weatherQueryOptions = (lat: number, lng: number) =>
  queryOptions<WeatherData>({
    queryKey: ["weather", lat.toFixed(2), lng.toFixed(2)],
    queryFn: () => fetchWeather(lat, lng),
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 2,
  });

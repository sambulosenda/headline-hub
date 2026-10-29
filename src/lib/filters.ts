import type { FeedFilters } from "./queries";

export type SearchParams = Record<string, string | string[] | undefined>;

export const HOUR_OPTIONS = [
  { value: 6, label: "6h" },
  { value: 24, label: "24h" },
  { value: 72, label: "3 days" },
] as const;

export const REGION_OPTIONS = [
  { value: undefined, label: "All regions" },
  { value: "uk", label: "UK" },
  { value: "us", label: "US" },
  { value: "intl", label: "International" },
] as const;

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export function parseFilters(params: SearchParams, topic?: string): FeedFilters {
  const hours = Number(first(params.hours));
  const region = first(params.region);
  return {
    topic,
    hours: HOUR_OPTIONS.some((o) => o.value === hours) ? hours : 24,
    region: region === "uk" || region === "us" || region === "intl" ? region : undefined,
  };
}

/** Same URL with one filter changed; the default value drops the param. */
export function withParam(pathname: string, params: SearchParams, key: string, value: string | undefined) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    const f = first(v);
    if (f !== undefined && k !== key) next.set(k, f);
  }
  if (value !== undefined) next.set(key, value);
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function timeAgo(date: Date, now = new Date()): string {
  const minutes = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

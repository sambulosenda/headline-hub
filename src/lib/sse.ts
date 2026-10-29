import { isRegion } from "@/config/outlets";
import type { ScopeFilters } from "./queries";

/** One Server-Sent Events message. */
export function sseEvent(event: string, data: unknown, id?: string | number): string {
  const lines = [`event: ${event}`];
  if (id !== undefined) lines.push(`id: ${id}`);
  for (const line of JSON.stringify(data).split("\n")) lines.push(`data: ${line}`);
  return `${lines.join("\n")}\n\n`;
}

export function parseScope(params: URLSearchParams): { filters: ScopeFilters; since: number } {
  const region = params.get("region");
  const topic = params.get("topic");
  const since = Number(params.get("since"));
  return {
    filters: {
      topic: topic && /^[a-z-]{1,32}$/.test(topic) ? topic : undefined,
      region: isRegion(region) ? region : undefined,
    },
    since: Number.isSafeInteger(since) && since >= 0 ? since : 0,
  };
}

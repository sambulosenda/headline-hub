import { findCountry } from "@/config/countries";
import { isRegion } from "@/config/outlets";
import type { ScopeFilters } from "./queries";

/** One Server-Sent Events message. */
export function sseEvent(event: string, data: unknown, id?: string | number): string {
  const lines = [`event: ${event}`];
  if (id !== undefined) lines.push(`id: ${id}`);
  for (const line of JSON.stringify(data).split("\n")) lines.push(`data: ${line}`);
  return `${lines.join("\n")}\n\n`;
}

export interface Scope {
  filters: ScopeFilters;
  since: number;
  /** An entity page's slug; the route resolves it to the phrases to match. */
  entity?: string;
  /** The Following page: match whatever the reader follows. */
  following: boolean;
}

export function parseScope(params: URLSearchParams): Scope {
  const region = params.get("region");
  const topic = params.get("topic");
  const country = params.get("country");
  const since = Number(params.get("since"));
  const entity = params.get("entity");
  return {
    filters: {
      topic: topic && /^[a-z-]{1,32}$/.test(topic) ? topic : undefined,
      region: isRegion(region) ? region : undefined,
      country: country && findCountry(country) ? country : undefined,
    },
    since: Number.isSafeInteger(since) && since >= 0 ? since : 0,
    entity: entity && /^[a-z0-9-]{1,80}$/.test(entity) ? entity : undefined,
    following: params.get("following") === "1",
  };
}

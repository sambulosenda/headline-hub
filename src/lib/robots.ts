import { SITE } from "./site";

export const BOT_NAME = SITE.botName;
/** Points at the page that explains the bot and how to opt out. */
export const USER_AGENT = `${BOT_NAME}/0.1 (+${SITE.url}/publishers)`;

/**
 * Minimal robots.txt check: uses the group for our bot if present, otherwise
 * the `*` group, and applies longest-match between Allow and Disallow.
 */
export function isAllowed(robotsTxt: string, path: string, botName = BOT_NAME): boolean {
  const groups: { agents: string[]; rules: { allow: boolean; prefix: string }[] }[] = [];
  let current: (typeof groups)[number] | null = null;
  let lastWasAgent = false;

  for (const rawLine of robotsTxt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    const sep = line.indexOf(":");
    if (sep < 0) continue;
    const key = line.slice(0, sep).trim().toLowerCase();
    const value = line.slice(sep + 1).trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((key === "allow" || key === "disallow") && current) {
      if (value) current.rules.push({ allow: key === "allow", prefix: value });
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }

  const bot = botName.toLowerCase();
  const group =
    groups.find((g) => g.agents.some((a) => a !== "*" && bot.includes(a))) ??
    groups.find((g) => g.agents.includes("*"));
  if (!group) return true;

  let best: { allow: boolean; length: number } | null = null;
  for (const rule of group.rules) {
    if (!matches(path, rule.prefix)) continue;
    if (!best || rule.prefix.length > best.length || (rule.prefix.length === best.length && rule.allow)) {
      best = { allow: rule.allow, length: rule.prefix.length };
    }
  }
  return best?.allow ?? true;
}

function matches(path: string, pattern: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const regex = body.split("*").map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*");
  return new RegExp(`^${regex}${anchored ? "$" : ""}`).test(path);
}

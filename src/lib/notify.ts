import type { Email } from "./email";
import type { StoryWithCoverage } from "./queries";
import type { StoryStats } from "./ranking";
import { SITE_NAME } from "./site";
import { storyPath } from "./slug";

/** A story is breaking when many outlets pick it up fast. Tuned to fire a few times a day, not hourly. */
export const BREAKING = { minOutlets: 5, minRecentOutlets: 3, maxAgeHours: 3 };
export const MAX_ALERTS_PER_DAY = 3;
export const DIGEST_SIZE = 10;

export function isBreaking(s: StoryStats, now = new Date()): boolean {
  const ageHours = (now.getTime() - s.firstSeenAt.getTime()) / 3_600_000;
  return (
    s.outletCount >= BREAKING.minOutlets &&
    s.recentOutlets >= BREAKING.minRecentOutlets &&
    ageHours <= BREAKING.maxAgeHours
  );
}

/** True once per day, from `hour` o'clock (server local time) until a digest has gone out. */
export function digestDue(lastDigestAt: Date | null, now: Date, hour: number): boolean {
  const mark = new Date(now);
  mark.setHours(hour, 0, 0, 0);
  if (now < mark) return false;
  return !lastDigestAt || lastDigestAt < mark;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

interface Links {
  site: URL;
  unsubscribeUrl: string;
}

function storyLine(story: StoryWithCoverage, site: URL) {
  const url = new URL(storyPath(story.id, story.title), site).toString();
  const sources = `${story.outletCount} ${story.outletCount === 1 ? "source" : "sources"}`;
  return { url, sources };
}

function footer({ site, unsubscribeUrl }: Links) {
  const settings = new URL("/settings", site).toString();
  return {
    text: `\n--\nChange what you get: ${settings}\nUnsubscribe from all emails: ${unsubscribeUrl}\n`,
    html: `<hr><p style="color:#666;font-size:13px"><a href="${escapeHtml(settings)}">Change what you get</a> · <a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe from all emails</a></p>`,
  };
}

export function renderDigest(to: string, stories: StoryWithCoverage[], links: Links): Email {
  const items = stories.map((s) => ({ s, ...storyLine(s, links.site) }));
  const foot = footer(links);
  return {
    to,
    subject: `Today's top stories: ${stories[0]?.title ?? SITE_NAME}`,
    text:
      `Today's top stories on ${SITE_NAME}\n\n` +
      items.map(({ s, url, sources }, i) => `${i + 1}. ${s.title} (${sources})\n   ${url}`).join("\n\n") +
      `\n${foot.text}`,
    html:
      `<h2>Today's top stories on ${SITE_NAME}</h2><ol>` +
      items
        .map(
          ({ s, url, sources }) =>
            `<li style="margin-bottom:10px"><a href="${escapeHtml(url)}">${escapeHtml(s.title)}</a><br><span style="color:#666;font-size:13px">${sources}</span></li>`,
        )
        .join("") +
      `</ol>${foot.html}`,
    unsubscribeUrl: links.unsubscribeUrl,
  };
}

export function renderAlert(to: string, story: StoryWithCoverage, links: Links): Email {
  const { url, sources } = storyLine(story, links.site);
  const outlets = [...new Set(story.coverage.map((c) => c.outletName))].slice(0, 5).join(", ");
  const foot = footer(links);
  return {
    to,
    subject: `Breaking: ${story.title}`,
    text: `${story.title}\n\nNow covered by ${sources}: ${outlets}.\n\nAll coverage: ${url}\n${foot.text}`,
    html: `<h2><a href="${escapeHtml(url)}">${escapeHtml(story.title)}</a></h2><p>Now covered by ${sources}: ${escapeHtml(outlets)}.</p><p><a href="${escapeHtml(url)}">See all coverage</a></p>${foot.html}`,
    unsubscribeUrl: links.unsubscribeUrl,
  };
}

import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/Prose";
import { USER_AGENT } from "@/lib/robots";
import { UTM_SOURCE } from "@/lib/normalize";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "For publishers",
  description: `How ${SITE.name} reads your RSS feed, what it shows, and how to opt out or ask us to take something down.`,
  path: "/publishers",
});

export default function PublishersPage() {
  return (
    <>
      <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.02em]">For publishers</h1>
      <p className="mt-1 text-sm text-muted">How we use your feed, and how to change that.</p>
      <Prose>
        <h2>What we show</h2>
        <p>
          {SITE.name} groups headlines from many outlets into stories, so readers can see who is covering what and click
          through to read it. From your public RSS or Atom feed we take only what the feed itself publishes:
        </p>
        <ul>
          <li>the headline, the link and the publish time;</li>
          <li>the short summary in the feed, shortened further, for the top story and for search;</li>
          <li>the feed&apos;s image link, shown on some stories, loaded from your servers, credited to you and linking to your article.</li>
        </ul>
        <p>
          We never copy or republish article text, and we don&apos;t put your pages in a frame. Every headline links
          straight to your site, tagged <code>utm_source={UTM_SOURCE}</code> so you can see the readers we send.
        </p>

        <h2>Our feed reader</h2>
        <p>Our reader identifies itself with this user agent:</p>
        <p>
          <code className="break-all">{USER_AGENT}</code>
        </p>
        <p>
          It checks your robots.txt before reading a feed, asks for each feed at most every five minutes, sends
          If-None-Match and If-Modified-Since so unchanged feeds cost you almost nothing, and backs off on its own when a
          feed fails.
        </p>

        <h2>Opting out</h2>
        <p>
          The fastest way is robots.txt. Our reader rechecks it at least every six hours and stops reading your feeds
          without you having to contact us:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-surface p-3 text-sm">
          {`User-agent: ${SITE.botName}\nDisallow: /`}
        </pre>
        <p>
          Headlines we already have drop off the front pages within a day or two. To remove them sooner, or to take
          down one story or your images, <Link href="/contact?about=takedown">send us a takedown request</Link>. Tell
          us the publication and, if it&apos;s one item, the link. A person reads every request; we aim to act within two
          working days and to tell you when it&apos;s done.
        </p>

        <h2>Mistakes</h2>
        <p>
          Grouping is automatic, so now and then a headline lands in the wrong story. If yours has been grouped wrongly,
          or a headline or link is out of date, <Link href="/contact?about=correction">tell us</Link> and we&apos;ll fix
          it.
        </p>

        <h2>Want to be listed?</h2>
        <p>
          If you publish original news and we don&apos;t carry you yet, <Link href="/submit">submit your feed</Link>.
        </p>
      </Prose>
    </>
  );
}

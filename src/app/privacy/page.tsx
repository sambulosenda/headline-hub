import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/Prose";
import { RETENTION_DAYS } from "@/lib/analytics";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Privacy",
  description: `What ${SITE.name} collects, why, and how to see or delete it. No ads, no trackers, no tracking cookies.`,
  path: "/privacy",
});

/** Change this whenever the page below changes. */
const UPDATED = "30 October 2026";

export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.02em]">Privacy</h1>
      <p className="mt-1 text-sm text-muted">Last updated {UPDATED}.</p>
      <Prose>
        <p>
          The short version: {SITE.name} has no ads, no third-party trackers and no tracking cookies. You can read
          everything without an account. If you make one, we keep your email address and the settings you choose, and
          nothing else about you.
        </p>

        <h2>Counting visits</h2>
        <p>
          To learn which pages are useful we record, for each page view: the page, whether you&apos;re on a phone or a
          computer, the site that sent you (on the first page of a visit only), and a visitor code. We also record when
          you click through to a publisher, and which article it was.
        </p>
        <p>
          The visitor code is a one-way hash made with a secret that is replaced every day, so we can count visitors
          for a day but can&apos;t follow anyone from one day to the next. We don&apos;t store IP addresses and don&apos;t
          set a cookie for this. If your browser sends Do Not Track or Global Privacy Control, nothing is recorded. These
          records are deleted after {RETENTION_DAYS} days.
        </p>

        <h2>Cookies</h2>
        <p>We set at most two cookies, both only to make the site work the way you asked:</p>
        <ul>
          <li>
            <code>hh_mutes</code> remembers the topics, outlets and words you&apos;ve hidden and the names you follow,
            when you aren&apos;t signed in. It lasts a year.
          </li>
          <li>
            <code>hh_session</code> keeps you signed in for 30 days.
          </li>
        </ul>

        <h2>If you sign in</h2>
        <p>
          We sign you in with a link sent to your email, so there is no password to store. We keep your email address,
          your hidden topics and outlets, the names you follow, your saved stories and your email choices. Sign-in links
          and sessions are stored only as hashes. Daily digests and breaking-news alerts are off until you turn them on,
          and every email has a link to stop them.
        </p>

        <h2>Messages and feed submissions</h2>
        <p>
          When you use the <Link href="/contact">contact form</Link> or <Link href="/submit">submit a feed</Link>, we
          keep what you send, including your name and email, so we can reply and keep a record of what we did.
        </p>

        <h2>Other companies involved</h2>
        <ul>
          <li>Cloudflare runs the site. Like any web host, it handles your IP address to deliver pages and stop attacks.</li>
          <li>Neon hosts our database, in London.</li>
          <li>Resend delivers our emails, so it sees the address it is sending to.</li>
        </ul>
        <p>
          Some stories show a publisher&apos;s picture. It loads from that publisher&apos;s servers, which see your IP
          address and browser like any image request; we tell your browser not to send them the page you were on. When
          you click a headline you are on the publisher&apos;s site, and its own privacy policy applies.
        </p>

        <h2>Seeing or deleting your data</h2>
        <p>
          You can change your settings and saved stories at any time. To get a copy of what we hold about you, or to
          delete your account and everything linked to it,{" "}
          <Link href="/contact?about=privacy">send us a message</Link> from the email address on your account. If
          you&apos;re in the UK or EU and unhappy with how we handle your data, you can complain to your data protection
          authority (in the UK, the Information Commissioner&apos;s Office).
        </p>
      </Prose>
    </>
  );
}

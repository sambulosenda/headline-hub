import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { IBM_Plex_Mono, Schibsted_Grotesk } from "next/font/google";
import { Analytics } from "@/components/Analytics";
import { SiteHeader } from "@/components/SiteHeader";
import { TabBar } from "@/components/TabBar";
import { SITE, siteUrl } from "@/lib/site";
import "./globals.css";

// Drawn for a news publisher; holds up at headline sizes and in dense 13px lists.
const sans = Schibsted_Grotesk({ variable: "--font-sans-face", subsets: ["latin"] });
// Only for clock times, so they line up in lists.
const mono = IBM_Plex_Mono({ variable: "--font-mono-face", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: SITE.name, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: { siteName: SITE.name, type: "website", title: SITE.name, description: SITE.description },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      {/* Feed pages mark themselves data-wide, and the header, page and footer widen to fit the side column. */}
      <body className="group/body flex min-h-full flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 lg:group-has-[[data-wide]]/body:max-w-6xl">{children}</main>
        <footer className="mx-auto w-full max-w-3xl px-4 py-8 text-xs text-muted lg:group-has-[[data-wide]]/body:max-w-6xl">
          Headlines and links come from publishers&apos; own RSS feeds. Every link goes straight to the publisher.{" "}
          <Link href="/submit" className="underline hover:text-foreground">
            Publish news? Submit your feed
          </Link>
          . We count visits without cookies and don&apos;t store IP addresses.
          <nav aria-label="About this site" className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/publishers" className="hover:text-foreground">
              For publishers
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/contact" className="hover:text-foreground">
              Contact
            </Link>
          </nav>
        </footer>
        <TabBar />
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
      </body>
    </html>
  );
}

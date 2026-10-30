import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist } from "next/font/google";
import { Analytics } from "@/components/Analytics";
import { SiteHeader } from "@/components/SiteHeader";
import { SITE_NAME, siteUrl } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const description = "Every outlet's take on today's stories, grouped and ranked in the open.";

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description,
  openGraph: { siteName: SITE_NAME, type: "website", title: SITE_NAME, description },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
        <footer className="mx-auto w-full max-w-3xl px-4 py-8 text-xs text-muted">
          Headlines and links come from publishers&apos; own RSS feeds. Every link goes straight to the publisher.{" "}
          <Link href="/submit" className="underline hover:text-foreground">
            Publish news? Submit your feed
          </Link>
          . We count visits without cookies and don&apos;t store IP addresses.
        </footer>
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
      </body>
    </html>
  );
}

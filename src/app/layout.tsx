import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Headline Hub", template: "%s · Headline Hub" },
  description: "Every outlet's take on today's stories, grouped and ranked in the open.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
        <footer className="mx-auto w-full max-w-3xl px-4 py-8 text-xs text-muted">
          Headlines and links come from publishers&apos; own RSS feeds. Every link goes straight to the publisher.
        </footer>
      </body>
    </html>
  );
}

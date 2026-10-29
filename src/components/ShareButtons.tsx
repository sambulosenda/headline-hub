"use client";

import { useState } from "react";

/** Share a story page: the native share sheet where there is one, otherwise copy the link. */
export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const encoded = encodeURIComponent(url);
  const text = encodeURIComponent(title);

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  const link = "rounded-md border border-line px-3 py-1.5 hover:border-accent hover:text-accent";
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <button type="button" onClick={share} className={`${link} bg-surface font-medium`}>
        {copied ? "Link copied" : "Share"}
      </button>
      <a href={`https://x.com/intent/post?text=${text}&url=${encoded}`} target="_blank" rel="noopener" className={link}>
        X
      </a>
      <a href={`https://bsky.app/intent/compose?text=${text}%20${encoded}`} target="_blank" rel="noopener" className={link}>
        Bluesky
      </a>
      <a href={`https://wa.me/?text=${text}%20${encoded}`} target="_blank" rel="noopener" className={link}>
        WhatsApp
      </a>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`} target="_blank" rel="noopener" className={link}>
        Facebook
      </a>
    </div>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

function send(body: { k: "view" | "out"; t: string; r?: string }) {
  const data = JSON.stringify(body);
  if (!navigator.sendBeacon?.("/api/collect", new Blob([data], { type: "application/json" }))) {
    void fetch("/api/collect", { method: "POST", body: data, keepalive: true }).catch(() => {});
  }
}

/** Counts page views and clicks through to publishers. No cookies or storage. */
export function Analytics() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    // The referrer only means something on the page a visit started on.
    send({ k: "view", t: pathname, r: first.current ? document.referrer : undefined });
    first.current = false;
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.type === "auxclick" && e.button !== 1) return;
      const link = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.origin === location.origin || !link.dataset.outbound) return;
      send({ k: "out", t: link.href });
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
    };
  }, []);

  return null;
}

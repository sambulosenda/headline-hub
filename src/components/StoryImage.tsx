"use client";

import { useState } from "react";

/**
 * A publisher's picture for a story, credited to the outlet and linking to its article.
 * Feeds sometimes point at images that have since gone, so a broken one removes itself.
 */
export function StoryImage({
  src,
  credit,
  href,
  priority = false,
  className = "",
}: {
  src: string;
  credit: string;
  href: string;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <figure className={className}>
      <a href={href} data-outbound="1" target="_blank" rel="noopener" tabIndex={-1} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- remote publisher images of unknown size */}
        <img
          src={src}
          alt=""
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="aspect-[3/2] w-full rounded-sm bg-fill object-cover"
        />
      </a>
      <figcaption className="mt-1.5 text-xs text-muted">Image: {credit}</figcaption>
    </figure>
  );
}

import { toggleEntityMute, toggleFollow } from "@/app/entity/actions";
import { cleanKeyword, type Mutes } from "@/lib/mutes";
import type { EntityRef } from "@/lib/entities";

export function isEntityMuted(entity: EntityRef, mutes: Mutes) {
  return entity.terms.every((t) => {
    const k = cleanKeyword(t);
    return k === null || mutes.keywords.includes(k);
  });
}

/** Follow and Mute for one name; both work signed out too, like the other mutes. */
export function EntityButtons({ entity, mutes }: { entity: EntityRef; mutes: Mutes }) {
  const following = mutes.follows.includes(entity.slug);
  const muted = isEntityMuted(entity, mutes);
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <form action={toggleFollow.bind(null, entity.slug)}>
        <button
          type="submit"
          aria-pressed={following}
          className={
            following
              ? "rounded-full border border-accent bg-accent-soft px-3 py-1 font-medium text-accent"
              : "rounded-full bg-accent px-3 py-1 font-medium text-white dark:text-black"
          }
        >
          {following ? "Following" : "Follow"}
        </button>
      </form>
      <form action={toggleEntityMute.bind(null, entity.slug)}>
        <button type="submit" aria-pressed={muted} className="rounded-full border border-line px-3 py-1 hover:border-accent">
          {muted ? "Unmute" : "Mute"}
        </button>
      </form>
    </div>
  );
}

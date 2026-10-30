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
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <form action={toggleFollow.bind(null, entity.slug)}>
        <button
          type="submit"
          aria-pressed={following}
          className={`h-9 rounded-md px-4 font-medium ${
            following ? "border border-line-strong text-foreground hover:border-foreground" : "bg-accent text-on-accent hover:opacity-90"
          }`}
        >
          {following ? "Following" : "Follow"}
        </button>
      </form>
      <form action={toggleEntityMute.bind(null, entity.slug)}>
        <button type="submit" aria-pressed={muted} className="h-9 px-2 text-muted hover:text-foreground">
          {muted ? "Unmute" : "Mute"}
        </button>
      </form>
    </div>
  );
}

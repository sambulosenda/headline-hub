import { toggleSaved } from "@/app/saved/actions";

/** Bookmark toggle; signed-out readers are sent to sign in first. */
export function SaveButton({ storyId, saved, iconOnly = false }: { storyId: number; saved: boolean; iconOnly?: boolean }) {
  const label = saved ? "Saved" : "Save";
  return (
    <form action={toggleSaved.bind(null, storyId)}>
      <button
        type="submit"
        aria-pressed={saved}
        aria-label={iconOnly ? (saved ? "Saved, tap to remove" : "Save story") : undefined}
        title={iconOnly ? label : undefined}
        className={`inline-flex items-center gap-1 ${iconOnly ? "size-11 justify-center rounded-lg hover:bg-fill sm:size-8" : ""} ${
          saved ? "text-accent" : "text-muted hover:text-foreground"
        }`}
      >
        <svg viewBox="0 0 20 20" width={iconOnly ? 17 : 14} height={iconOnly ? 17 : 14} fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M5.5 3.5h9v13l-4.5-3-4.5 3z" strokeLinejoin="round" />
        </svg>
        {!iconOnly && label}
      </button>
    </form>
  );
}

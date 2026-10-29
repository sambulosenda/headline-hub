import { toggleSaved } from "@/app/saved/actions";

/** Bookmark toggle; signed-out readers are sent to sign in first. */
export function SaveButton({ storyId, saved }: { storyId: number; saved: boolean }) {
  return (
    <form action={toggleSaved.bind(null, storyId)}>
      <button
        type="submit"
        aria-pressed={saved}
        className={`inline-flex items-center gap-1 ${saved ? "text-accent" : "text-muted hover:text-foreground"}`}
      >
        <svg viewBox="0 0 20 20" width="14" height="14" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M5.5 3.5h9v13l-4.5-3-4.5 3z" strokeLinejoin="round" />
        </svg>
        {saved ? "Saved" : "Save"}
      </button>
    </form>
  );
}

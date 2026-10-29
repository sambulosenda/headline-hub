import Form from "next/form";

/** Plain GET form to /search: works before JavaScript loads, and as a client navigation after. */
export function SearchBox({
  defaultValue,
  within,
  autoFocus,
  compact,
  className = "",
}: {
  defaultValue?: string;
  within?: string;
  autoFocus?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Form action="/search" role="search" className={`flex ${className}`}>
      <label htmlFor={compact ? "site-search" : "page-search"} className="sr-only">
        Search headlines
      </label>
      <input
        id={compact ? "site-search" : "page-search"}
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={compact ? "Search" : "Search headlines"}
        autoFocus={autoFocus}
        maxLength={200}
        className={`w-full min-w-0 rounded-md border border-line bg-surface outline-none placeholder:text-muted focus:border-accent ${
          compact ? "px-2.5 py-1 text-sm" : "px-3 py-2"
        }`}
      />
      {within && within !== "7d" && <input type="hidden" name="within" value={within} />}
    </Form>
  );
}

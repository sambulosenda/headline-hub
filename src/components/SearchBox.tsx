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
        className={`w-full min-w-0 rounded-lg outline-none placeholder:text-muted ${
          compact
            ? "h-9 border border-transparent bg-fill px-3 text-sm focus:border-line-strong focus:bg-background"
            : "h-12 border border-line-strong bg-background px-4 text-lg focus:border-foreground"
        }`}
      />
      {within && within !== "7d" && <input type="hidden" name="within" value={within} />}
    </Form>
  );
}

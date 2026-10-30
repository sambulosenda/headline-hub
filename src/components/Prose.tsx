/** Long-form text pages (privacy, publishers): readable measure, spaced headings and lists. */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[65ch] text-[0.9375rem] leading-relaxed [&_a]:underline [&_a:hover]:text-foreground [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
      {children}
    </div>
  );
}

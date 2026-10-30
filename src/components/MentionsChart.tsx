import type { MentionStats } from "@/lib/queries";

const weekday = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });

/** Headlines naming someone per day: a week of thin bars, today last, with a table for screen readers. */
export function MentionsChart({ days }: { days: MentionStats["days"] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((n, d) => n + d.count, 0);
  return (
    <figure className="max-w-80">
      <figcaption className="text-[0.8125rem] text-subtle">
        <b className="font-semibold text-foreground tabular-nums">{total}</b> {total === 1 ? "headline" : "headlines"} in
        the last {days.length} days
      </figcaption>
      <div className="mt-3 flex h-16 items-end gap-1.5 border-b border-line-strong" aria-hidden>
        {days.map((d, i) => (
          <div
            key={d.day}
            title={`${weekday(d.day)}: ${d.count}`}
            className="group flex h-full flex-1 items-end"
          >
            <div
              className={`w-full rounded-t-[4px] ${i === days.length - 1 ? "bg-accent" : "bg-cov-regional"} group-hover:opacity-80`}
              style={{ height: d.count ? `${Math.max(6, (d.count / max) * 100)}%` : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5 font-mono text-[0.6875rem] text-muted" aria-hidden>
        {days.map((d, i) => (
          <span key={d.day} className="flex-1 text-center">
            {i === days.length - 1 ? "Today" : weekday(d.day).slice(0, 2)}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Headlines per day</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}>
              <th scope="row">{d.day}</th>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

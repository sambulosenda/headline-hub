import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getStats, RANGES, type Stats } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import { storyPath } from "@/lib/slug";
import { isAdmin } from "@/lib/submissions";

export const metadata: Metadata = { title: "Analytics", robots: { index: false } };

const number = new Intl.NumberFormat("en-GB");

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
    </div>
  );
}

function DailyChart({ daily }: { daily: Stats["daily"] }) {
  const max = Math.max(1, ...daily.map((d) => d.views));
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h2 className="text-sm font-semibold">Page views per day</h2>
      <div className="mt-3 flex h-32 items-end gap-0.5 border-b border-line" role="img" aria-label="Page views per day; exact figures in each bar's tooltip">
        {daily.map((d) => (
          <div
            key={d.day}
            title={`${d.day}: ${number.format(d.views)} views, ${number.format(d.visitors)} visitors`}
            className="group flex h-full flex-1 items-end"
          >
            <div
              className="w-full rounded-t-[4px] bg-accent group-hover:opacity-80"
              style={{ height: d.views ? `${Math.max(2, (d.views / max) * 100)}%` : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs tabular-nums text-muted">
        <span>{daily[0]?.day}</span>
        <span>peak {number.format(Math.max(0, ...daily.map((d) => d.views)))}</span>
        <span>{daily.at(-1)?.day}</span>
      </div>
    </section>
  );
}

function Table<T>({
  title,
  empty,
  rows,
  columns,
}: {
  title: string;
  empty: string;
  rows: T[];
  columns: { label: string; cell: (row: T) => React.ReactNode; numeric?: boolean }[];
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{empty}</p>
      ) : (
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-xs text-muted">
              {columns.map((c) => (
                <th key={c.label} className={`pb-1 font-normal ${c.numeric ? "w-20 text-right" : "text-left"}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-line">
                {columns.map((c) => (
                  <td key={c.label} className={`py-1 ${c.numeric ? "text-right tabular-nums" : "break-all pr-2"}`}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

async function Dashboard({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const user = await getCurrentUser();
  if (!isAdmin(user?.email)) notFound();
  await connection();
  const requested = Number((await searchParams).days);
  const days = (RANGES as readonly number[]).includes(requested) ? requested : 30;
  const stats = await getStats(days);
  const ctr = stats.views ? `${((stats.clicks / stats.views) * 100).toFixed(1)}% of page views` : undefined;

  return (
    <div className="space-y-4">
      <nav className="flex gap-2 text-sm" aria-label="Date range">
        {RANGES.map((r) => (
          <Link
            key={r}
            href={`/admin/analytics?days=${r}`}
            aria-current={r === days ? "page" : undefined}
            className={`rounded-full border px-3 py-1 ${r === days ? "border-accent bg-accent-soft text-accent" : "border-line hover:border-accent"}`}
          >
            {r} days
          </Link>
        ))}
      </nav>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Tile label="Visitors" value={number.format(stats.visitors)} note="each counted once per day" />
        <Tile label="Page views" value={number.format(stats.views)} />
        <Tile label="Clicks to publishers" value={number.format(stats.clicks)} note={ctr} />
      </div>
      <DailyChart daily={stats.daily} />
      <Table
        title="Top pages"
        empty="No page views yet."
        rows={stats.pages}
        columns={[
          { label: "Page", cell: (r) => r.path },
          { label: "Visitors", cell: (r) => number.format(r.visitors), numeric: true },
          { label: "Views", cell: (r) => number.format(r.views), numeric: true },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Table
          title="Publishers readers clicked through to"
          empty="No clicks yet."
          rows={stats.outlets}
          columns={[
            { label: "Outlet", cell: (r) => r.name },
            { label: "Clicks", cell: (r) => number.format(r.clicks), numeric: true },
          ]}
        />
        <Table
          title="Where visitors came from"
          empty="No referring sites yet; direct visits aren't listed."
          rows={stats.referrers}
          columns={[
            { label: "Site", cell: (r) => r.host },
            { label: "Visits", cell: (r) => number.format(r.visits), numeric: true },
          ]}
        />
      </div>
      <Table
        title="Most-clicked stories"
        empty="No clicks yet."
        rows={stats.stories}
        columns={[
          {
            label: "Story",
            cell: (r) =>
              r.id ? (
                <Link href={storyPath(r.id, r.title)} className="hover:underline">
                  {r.title}
                </Link>
              ) : (
                r.title
              ),
          },
          { label: "Clicks", cell: (r) => number.format(r.clicks), numeric: true },
        ]}
      />
      <Table
        title="Devices"
        empty="No visitors yet."
        rows={stats.devices}
        columns={[
          { label: "Device", cell: (r) => (r.device === "mobile" ? "Phone or tablet" : "Computer") },
          { label: "Visitors", cell: (r) => number.format(r.visitors), numeric: true },
        ]}
      />
      <p className="text-xs text-muted">
        Counted without cookies. IP addresses are only used to make a daily visitor id that can&apos;t be traced back, and
        visitors with Do Not Track or Global Privacy Control switched on aren&apos;t counted. Times are UTC; events are
        kept for 400 days.
      </p>
    </div>
  );
}

export default function AnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  return (
    <>
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <Link href="/admin/submissions" className="text-sm text-accent hover:underline">
          Feed submissions
        </Link>
      </div>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Dashboard searchParams={searchParams as Promise<{ days?: string }>} />
      </Suspense>
    </>
  );
}

# Headline Hub

A news aggregator that groups every outlet's coverage of an event into one story card and ranks stories in the open. Headlines come only from publishers' own RSS/Atom feeds, and every link goes straight to the publisher.

This is Phase 1 of the plan: feed ingestion, story clustering, a transparent ranking score, and Top / Latest / topic views with time and region filters.

## How it works

1. **Feed registry** (`src/config/outlets.ts`): outlets, their feeds and topics, region and an editorial quality weight.
2. **Ingest worker** (`src/worker/ingest.ts`): polls each feed at most every 5 minutes with conditional GET (ETag / Last-Modified), checks robots.txt, identifies itself as `HeadlineHubBot`, and records failures per feed.
3. **Normalise** (`src/lib/normalize.ts`, `src/lib/feeds.ts`): canonical URLs (tracking params stripped) are the dedupe key; HTML is stripped and text is capped.
4. **Cluster** (`src/lib/similarity.ts`, `src/lib/embeddings.ts`): each headline is embedded with a small sentence model (all-MiniLM-L6-v2, run locally, about 23 MB downloaded on first use) and joins the closest story from the last 48 hours when the meaning matches. Shared names, places and numbers guard against look-alike stories ("family pays tribute to man killed in crash"). With `EMBEDDINGS=off`, or if the model can't load, it falls back to word overlap.
5. **Rank** (`src/lib/ranking.ts`): score = breadth (distinct outlets) × average source quality × freshness (6 h half-life) × velocity (outlets joining in the last hour). No click data. Each card has a "Why this is here" panel built from the same numbers.
6. **Web app** (`src/app`): Next.js App Router with Cache Components. The page shell is static; the news streams in per request.
7. **Live updates** (`src/app/api/updates/route.ts`, `src/components/LiveUpdates.tsx`): each page opens a Server-Sent Events stream that checks Postgres every 15 seconds for stories that are new or gained coverage since the page loaded, and shows a "2 new stories" pill that refreshes the feed in place. It polls the database rather than the worker, so it works wherever the worker runs.

## Getting started

Requires Node 22+ and Postgres 16 (Docker works).

```bash
npm install
cp .env.example .env.local
docker compose up -d          # local Postgres on :5432
npm run db:migrate            # create tables
npm run ingest                # fetch feeds once
npm run dev                   # http://localhost:3000
```

Keep the news flowing with `npm run ingest:watch`, which runs the worker every minute (each feed is still fetched at most every 5 minutes).

## Search and story pages

- **Search** (`/search`, `src/lib/search.ts`): Postgres full-text search over every headline and feed summary, backed by a GIN index (`npm run db:migrate` adds it). Supports quoted phrases, `OR` and `-word`. Results are grouped into stories and ranked by text match, nudged by how many outlets covered it and how recent it is. Default window is 7 days.
- **Story pages** (`/story/123-headline-slug`, `src/app/story/[id]`): one shareable page per story with every outlet's version, share buttons, and link-preview tags (Open Graph and Twitter/X). The preview image is drawn by us from the headline and outlet names, never a publisher's photo. Only the number in the URL matters, so old links keep working when a story's headline changes.
- Set `SITE_URL` (for example `https://headlinehub.co.uk`) in production so canonical links and preview images use the public domain. On Vercel the production domain is used automatically.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js app |
| `npm run ingest` | One ingest pass |
| `npm run ingest:watch` | Ingest on a loop |
| `npm run recluster -- --dry-run` | Backfill embeddings and report how stories would group; add `--threshold=0.65,0.7,0.75` to compare, drop `--dry-run` to apply |
| `npm run db:generate` | New migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |

## Adding a source

Add the outlet and its official feed URLs to `src/config/outlets.ts`. The next ingest run picks it up. Removing an outlet from the file deactivates it.

Before going live: check each publisher's feed terms, keep to headlines, short descriptions and links, and remove any outlet that asks. UK headline licensing (NLA) should be checked before monetising.

## Roadmap

- **Phase 2:** embedding-based clustering (done), live updates (done), Developing view, more sources.
- **Phase 3:** accounts, follows and mutes, saved searches, alerts and digest, publisher feed submissions.

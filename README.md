# Headline Hub

A news aggregator that groups every outlet's coverage of an event into one story card and ranks stories in the open. Headlines come only from publishers' own RSS/Atom feeds, and every link goes straight to the publisher.

This is Phase 1 of the plan: feed ingestion, story clustering, a transparent ranking score, and Top / Latest / topic views with time and region filters.

## How it works

1. **Feed registry** (`src/config/outlets.ts`): outlets, their feeds and topics, region and an editorial quality weight.
2. **Ingest worker** (`src/worker/ingest.ts`): polls each feed at most every 5 minutes with conditional GET (ETag / Last-Modified), checks robots.txt, identifies itself as `HeadlineHubBot`, and records failures per feed.
3. **Normalise** (`src/lib/normalize.ts`, `src/lib/feeds.ts`): canonical URLs (tracking params stripped) are the dedupe key; HTML is stripped and text is capped.
4. **Cluster** (`src/lib/similarity.ts`): a new headline joins an existing story from the last 48 hours when they share enough distinctive words. Phase 2 swaps this for embeddings.
5. **Rank** (`src/lib/ranking.ts`): score = breadth (distinct outlets) × average source quality × freshness (6 h half-life) × velocity (outlets joining in the last hour). No click data. Each card has a "Why this is here" panel built from the same numbers.
6. **Web app** (`src/app`): Next.js App Router with Cache Components. The page shell is static; the news streams in per request.

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

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js app |
| `npm run ingest` | One ingest pass |
| `npm run ingest:watch` | Ingest on a loop |
| `npm run db:generate` | New migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |

## Adding a source

Add the outlet and its official feed URLs to `src/config/outlets.ts`. The next ingest run picks it up. Removing an outlet from the file deactivates it.

Before going live: check each publisher's feed terms, keep to headlines, short descriptions and links, and remove any outlet that asks. UK headline licensing (NLA) should be checked before monetising.

## Roadmap

- **Phase 2:** embedding-based clustering (pgvector), live updates over SSE, Developing view, free-only filter.
- **Phase 3:** accounts, follows and mutes, saved searches, alerts and digest, publisher feed submissions.

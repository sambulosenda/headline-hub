# Running on Cloudflare

The website runs as a Cloudflare Worker through [OpenNext](https://opennext.js.org/cloudflare).
Config lives in `wrangler.jsonc` and `open-next.config.ts` at the repo root.
Locally, `npm run dev` is unchanged.

## Try it locally on the Workers runtime

```sh
docker compose up -d && npm run db:migrate   # the usual local Postgres
npm run cf:preview                           # builds, then serves on http://localhost:8787
```

The preview reaches Postgres through the `localConnectionString` in `wrangler.jsonc`
in place of Hyperdrive, and keeps the page cache in a local R2 stand-in.

## One-time setup before the first deploy

Nothing here has been done yet; the site is not public.

1. Create a Neon project and run `DATABASE_URL=<neon url> npm run db:migrate`.
2. `npx wrangler hyperdrive create headline-hub --connection-string="<neon url>"`, then paste the id into `wrangler.jsonc`.
3. `npx wrangler r2 bucket create headline-hub-opennext-cache`
4. Secrets the app reads: `npx wrangler secret put SITE_URL`, and the same for `RESEND_API_KEY`, `EMAIL_FROM` and `ADMIN_EMAILS`.
5. `npm run cf:deploy`

## Known gaps

- Cache Components are switched off in `next.config.ts` because they hang every page on
  Workers ([OpenNext #1318](https://github.com/opennextjs/opennextjs-cloudflare/pull/1318)).
  Story pages lost their few-minute cache because of it; turn it back on once that ships.
- Vetting a submitted feed resolves its host with `node:dns`, which Workers only partly support. Not yet tested on Cloudflare.
- The ingest and notify workers still need a machine; moving them to Cron Triggers and Queues is the next step.

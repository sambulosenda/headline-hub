# Feed reader on Cloudflare

`worker.ts` replaces the always-on `ingest:watch` and `notify:watch` loops with
Cron Triggers and a Queue:

| When | What |
| --- | --- |
| Every minute | Queue each site's due feeds (one message per site, so no publisher gets parallel requests), then rescore stories |
| Queue consumer, 10 sites per batch | Fetch, parse, embed with Workers AI (`@cf/baai/bge-small-en-v1.5`) and store |
| Every 5 minutes | Daily digests and breaking-news alerts through Resend |
| Every 15 minutes | Sync outlets and feeds from `src/config` |

Story matching no longer keeps 48 hours of headlines in memory. For each batch
it loads only recent headlines that share a word with the new ones
(`candidatesFromDb` in `src/worker/ingest.ts`). Every match except a very strong
embedding match needs shared words anyway, so the result is nearly identical.

## Before switching over

1. **Calibrate the thresholds.** bge-small scores pairs higher than MiniLM, so the
   cut-offs in `embed.ts` were calibrated once (30 Oct 2026). To redo it, on the MacBook, with the local database
   holding a few hours of real headlines, run:

   ```sh
   CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=... npm run calibrate-embeddings -- --hours=6
   ```

   It prints the best `{ strong, semantic, assist }`; put them in `BGE_SMALL_THRESHOLDS`.
   The token needs "Workers AI: Read".
2. **Clear old embeddings** in the live database once, so MiniLM and bge vectors
   are never compared: `update articles set embedding = null;`
   (word overlap covers the 48 hours until new embeddings fill in).
3. Stop `ingest:watch` and `notify:watch` on the MacBook, so two readers don't run at once.

## Deploy

```sh
npx wrangler queues create headline-hub-feeds
# put the Hyperdrive id from the website setup into wrangler.jsonc here too
npx wrangler secret put RESEND_API_KEY --config cloudflare/ingest/wrangler.jsonc   # and EMAIL_FROM, SITE_URL, DIGEST_HOUR
npm run cf:ingest:deploy
```

Watch it with `npx wrangler tail headline-hub-ingest`.

## Trying it locally

The Workers AI binding only works against Cloudflare, so locally copy
`wrangler.jsonc`, drop the `"ai"` line and add `"vars": { "EMBEDDINGS": "off" }`, then:

```sh
npx wrangler dev --config <copy> --test-scheduled
curl "localhost:8787/__scheduled?cron=*+*+*+*+*"
```

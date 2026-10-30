# Feed check from Cloudflare

Runs the same check as `npm run check-feeds`, but from Cloudflare's network, so
we can see which publishers block requests from there before moving ingest off
the MacBook. It writes nothing and stays private behind a token.

```sh
npx wrangler login                     # once, opens the browser
npm run cf:feed-check:deploy
npx wrangler secret put CHECK_TOKEN --config cloudflare/feed-check/wrangler.jsonc   # pick any long random string
curl -s "https://headline-hub-feed-check.<your-subdomain>.workers.dev/?token=<CHECK_TOKEN>" > cloudflare-feeds.txt
npm run check-feeds > home-feeds.txt   # same check from home, to compare
```

The full run takes a few minutes; keep the connection open. Add `&url=<feed>`
(repeatable) to check only some feeds. The first line shows the IP the checks
left from, which is what to quote in allowlist requests.

Delete it afterwards with `npx wrangler delete --config cloudflare/feed-check/wrangler.jsonc`.

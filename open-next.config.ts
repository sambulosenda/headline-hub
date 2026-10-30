import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";

// See https://opennext.js.org/cloudflare/caching. Cache interception stays off (the default) because it breaks PPR.
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  // "use cache" + cacheLife revalidates on a timer, which needs a queue.
  queue: doQueue,
});

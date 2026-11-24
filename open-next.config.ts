import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incremental cache binding (R2/KV) yet: ISR/data cache falls back to
// per-request, matching the current production worker.
export default defineCloudflareConfig();

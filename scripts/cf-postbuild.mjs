// Runs after `opennextjs-cloudflare build` (see `cf:build` in package.json).
//
// postgres.js's Workers build opens TCP connections with
// `import("cloudflare:sockets")`, but Turbopack cannot emit that runtime-only
// module, so next.config.ts aliases it to src/lib/stubs/cloudflare-sockets.ts.
// That shim reads the real `connect` from a global, which this script makes the
// generated worker entry set before it handles any request.
//
// (A hand-written wrapper entry instead of patching worked for the DB but made
// `/_next/image` exceed CPU limits on Cloudflare, so the default entry stays.)
import { readFileSync, writeFileSync } from "node:fs";

const WORKER = ".open-next/worker.js";
const MARKER = "/* leiksvaedi:cloudflare-sockets */";
const INJECT = `${MARKER}
import { connect as __leiksvaediConnect } from "cloudflare:sockets";
globalThis[Symbol.for("leiksvaedi.cloudflare-sockets.connect")] = __leiksvaediConnect;
`;

const source = readFileSync(WORKER, "utf8");
if (!source.includes(MARKER)) {
  writeFileSync(WORKER, INJECT + source);
  console.log(`Injected cloudflare:sockets bridge into ${WORKER}`);
}

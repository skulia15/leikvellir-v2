// Stand-in for `cloudflare:sockets` in the Cloudflare Workers build (see
// next.config.ts and scripts/cf-postbuild.mjs). Delegates to the real
// `connect`, which the patched worker entry puts on a global at startup.
type Connect = (address: string, options?: Record<string, unknown>) => unknown;

export function connect(address: string, options?: Record<string, unknown>): unknown {
  const real = (globalThis as Record<symbol, Connect | undefined>)[
    Symbol.for("leiksvaedi.cloudflare-sockets.connect")
  ];
  if (!real) {
    throw new Error("cloudflare:sockets is only available inside the Workers runtime");
  }
  return real(address, options);
}

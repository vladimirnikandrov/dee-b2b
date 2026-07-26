// Node-runtime half of the boot hook — imported only from instrumentation.js,
// only under `process.env.NEXT_RUNTIME === "nodejs"`. Keeping the database
// import behind that guard is what stops the edge bundle from trying to
// resolve `net`/`tls` for the `postgres` package.
//
// Runs as a side effect of the import: Next.js awaits register(), so
// migrations finish before the first request is dispatched. `next build` never
// gets here — it skips instrumentation registration entirely during the
// production build phase, so the build machine never touches the database.
import { runMigrations } from "@/lib/migrate";

if (!process.env.DATABASE_URL) {
  console.warn("[migrate] DATABASE_URL is not set — skipping migrations");
} else {
  // A cold Railway Postgres can refuse connections for a while after the
  // database instance restarts, and losing the migration to that would leave
  // the new code running against the old schema. ~37s of patience total.
  const DELAYS_MS = [0, 2000, 5000, 10000, 20000];
  let lastError = null;

  for (let attempt = 0; attempt < DELAYS_MS.length; attempt++) {
    if (DELAYS_MS[attempt]) await new Promise((r) => setTimeout(r, DELAYS_MS[attempt]));
    try {
      const { applied, alreadyCurrent } = await runMigrations();
      if (alreadyCurrent) console.log("[migrate] schema is up to date");
      else console.log(`[migrate] applied ${applied.length} migration(s): ${applied.join(", ")}`);
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      console.error(`[migrate] attempt ${attempt + 1}/${DELAYS_MS.length} failed:`, err);
    }
  }

  if (lastError) {
    // Kill the process explicitly. Do NOT just throw.
    //
    // Throwing here looks like it should be fatal, and it is not. Measured
    // against this exact Next.js version (15.5.18): the rejection is caught by
    // `prepare().catch(console.error)` in next-server.js, the port stays bound,
    // and the process keeps running — serving HTTP 500 for EVERY request,
    // including fully static pages. Worse, both the instrumentation promise and
    // the prepare promise are memoized, so migrations are never retried and it
    // never recovers even after the database comes back. A throw would turn a
    // transient database blip into a permanent, self-inflicted outage of the
    // whole shop.
    //
    // A non-zero exit gives the behaviour actually wanted: during a deploy
    // Railway never sees the new container become healthy, so the PREVIOUS
    // version keeps serving; on a restart of a live service it retries from a
    // clean process and recovers by itself once the database is reachable.
    console.error(`[migrate] FATAL — migrations failed after ${DELAYS_MS.length} attempts, exiting so this deploy fails instead of serving on an unknown schema:`, lastError);
    // Give stdout a tick to flush, or the reason for the exit is lost.
    await new Promise((r) => setTimeout(r, 200));
    process.exit(1);
  }
}

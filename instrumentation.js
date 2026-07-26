// Next.js calls register() once when a server instance boots. We use it to
// apply pending database migrations, so deploying code and deploying the
// schema it needs are the same action — see lib/migrate.js for the history
// that made this necessary.
//
// Everything that touches the database lives in ./instrumentation-node.js and
// is imported ONLY from inside this exact `if`. That shape is load-bearing:
// Next.js compiles this file for the edge runtime as well as Node, and the
// bundler prunes the import only when it can constant-fold the
// `process.env.NEXT_RUNTIME === "nodejs"` guard around it. Written as an early
// `return` instead, the edge build still tries to bundle the `postgres`
// package and fails with "Can't resolve 'net'".

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}

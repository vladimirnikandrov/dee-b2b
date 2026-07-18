// Postgres client (Railway Postgres via DATABASE_URL, auto-injected when the
// Postgres addon is linked to the app service in the same Railway project).
import postgres from "postgres";

const globalForDb = globalThis;

// Reuse the connection across hot reloads / serverless invocations instead
// of opening a new pool on every import.
export const sql =
  globalForDb.__da_sql ||
  postgres(process.env.DATABASE_URL, {
    ssl: process.env.DATABASE_URL?.includes("railway") ? "require" : false,
  });

if (process.env.NODE_ENV !== "production") globalForDb.__da_sql = sql;

// @ts-check
// Persists fire-and-forget email/e-conomic failures so they're visible in
// the admin panel instead of only ever hitting the server log. Called from
// inside lib/email.js and lib/economic.js, right where they already
// console.error — never lets a logging failure become its own crash, and
// never blocks/throws into the caller (same fire-and-forget contract as
// the things it's recording failures for).
import { sql } from "@/lib/db";

/**
 * @param {{ type: "email" | "economic", orderId?: string | null, context: string, error: string }} args
 */
export async function recordSyncFailure({ type, orderId, context, error }) {
  try {
    await sql`
      insert into sync_failures (type, order_id, context, error)
      values (${type}, ${orderId || null}, ${context}, ${error})
    `;
  } catch (e) {
    console.error("Failed to record sync failure (non-fatal):", e);
  }
}

// Ordered list of every migration. Append new ones to the END — the runner
// applies them in array order and records each by `id`, so reordering or
// renumbering a shipped migration silently changes what a fresh database gets.
// See lib/migrate.js for the rules a migration has to follow.
//
// Numbering continues from the pre-runner era: db/migration-002/003/004*.sql
// were applied to production by hand before this mechanism existed, and are
// kept as historical documentation only. db/schema.sql remains the canonical
// full schema for creating a fresh database from scratch — apply it first,
// then the runner brings it the rest of the way (every migration is
// idempotent, so running them against an already-current schema is a no-op).
import m005 from "./005-canonical-country";
import m006 from "./006-economic-sync-tracking";
import m007 from "./007-economic-customer-number";
import m008 from "./008-shipping-vat";
import m009 from "./009-economic-superseded-drafts";
import m010 from "./010-case-insensitive-email";
import m011 from "./011-sync-failures-table";
import m012 from "./012-deactivate-buyers";

export const MIGRATIONS = [m005, m006, m007, m008, m009, m010, m011, m012];

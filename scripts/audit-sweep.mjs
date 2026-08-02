// Screenshot sweep for the Phase 0 audit (and the before/after diffs in Phase 1).
//
//   node scripts/audit-sweep.mjs desktop        # 1440x900
//   node scripts/audit-sweep.mjs mobile         # 375x812
//
// Expects the app already running (see .claude/launch.json) and a local
// Postgres — OTP codes are read straight out of `login_otps` rather than
// through email, which is exactly what the dev-send guard in lib/email.js
// wants us to do (it refuses to mail a real address from localhost).
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.AUDIT_BASE || "http://localhost:3200";
const DB = process.env.AUDIT_DB || "dee_april_b2b";
const MODE = process.argv[2] === "mobile" ? "mobile" : "desktop";
const VIEWPORT = MODE === "mobile" ? { width: 375, height: 812 } : { width: 1440, height: 900 };
const OUT = `screenshots/phase2/${MODE}`;
const BUYER = "audit-buyer@project-1804.com";
const ADMIN = "audit-admin@project-1804.com";

// This script deletes its two audit accounts and their orders before every run, so
// it must never be pointed at anything but a local database.
if (!/^(localhost|127\.0\.0\.1|::1)?$/.test(process.env.PGHOST || "") || !BASE.includes("localhost")) {
  console.error(`refusing to run: PGHOST=${process.env.PGHOST || "(local socket)"} BASE=${BASE} — this sweep deletes rows, local only`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

const psql = (sql) => execFileSync("psql", ["-d", DB, "-tAc", sql], { encoding: "utf8" }).trim();
// Mirrors POST /api/admin/buyers — the only way an account exists now.
const invite = (email, company) => {
  psql(`insert into users (email, company, role) values ('${email}', '${company}', 'buyer') on conflict (email) do nothing`);
  psql(`insert into buyer_profiles (user_id, company, email) select id, '${company}', '${email}' from users where email = '${email}' on conflict (user_id) do nothing`);
};
const otpFor = (email) =>
  psql(`select code from login_otps where email = '${email}' and used_at is null order by created_at desc limit 1`);

const notes = [];
let n = 0;
const note = (m) => { console.log("   " + m); notes.push(m); };

async function shot(page, name) {
  n += 1;
  const file = `${OUT}/${String(n).padStart(2, "0")}-${name}.png`;
  // Long enough for the 0.6s FadeIn plus its longest stagger — the point is to
  // photograph the settled screen, not to pretend it doesn't animate.
  await page.waitForTimeout(900);
  // Two capture quirks, both of which produce screenshots that look like bugs:
  //  - lazy images below the fold never decode, so the last product on a long
  //    page photographs as an empty grey box;
  //  - the header is position:sticky, and a fullPage capture paints a sticky
  //    element wherever it currently sits — mid-document if the page is scrolled.
  await page.evaluate(async () => {
    // Step down the page rather than jumping: a lazy image that never enters
    // the viewport never starts loading, and on the 12 000px mobile catalogue
    // a single jump to the bottom leaves most of them uninitiated — and then
    // `decode()` on them never settles, which hangs the whole sweep.
    const step = Math.round(window.innerHeight * 0.8);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 300));
    await Promise.race([
      Promise.all(Array.from(document.images).filter((i) => !i.complete).map((i) => i.decode().catch(() => {}))),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: file, fullPage: true });
  console.log("  ▸", file);
}

const btn = (page, name) => page.getByRole("button", { name, exact: true });
const nav = async (page, name) => {
  await page.keyboard.press("Escape").catch(() => {});   // a stray modal overlay eats every later click
  await page.waitForTimeout(250);
  await btn(page, name).first().click();
};
const field = (page, label) =>
  page.locator(`label:has-text("${label}")`).locator("xpath=following-sibling::input[1]").first();

async function fillBuyer(page, { city, zip, country, vat }) {
  await field(page, "Company name").fill("Audit Test ApS");
  await field(page, "Address").fill("Testvej 1");
  await field(page, "City").fill(city);
  await field(page, "ZIP").fill(zip);
  await field(page, "VAT number").fill(vat);
  await page.locator("#checkout-country").selectOption({ label: country });
  await page.waitForTimeout(600);
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  // Fail fast on a missing control instead of burning 30s per lookup.
  ctx.setDefaultTimeout(8000);
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));
  page.on("response", (r) => r.status() >= 400 && consoleErrors.push(`HTTP ${r.status()} ${r.url()}`));

  // Start from a clean pair of audit accounts every run.
  psql(`delete from login_otps where email in ('${BUYER}','${ADMIN}')`);
  psql(`delete from order_notes where order_id in (select id from orders where user_id in (select id from users where email in ('${BUYER}','${ADMIN}')))`);
  psql(`delete from orders where user_id in (select id from users where email in ('${BUYER}','${ADMIN}'))`);
  psql(`delete from buyer_profiles where user_id in (select id from users where email in ('${BUYER}','${ADMIN}'))`);
  psql(`delete from users where email in ('${BUYER}','${ADMIN}')`);

  // ── anonymous ────────────────────────────────────────────────────────────
  await page.goto(BASE, { waitUntil: "networkidle" });
  await shot(page, "landing");

  await nav(page, "Sign In");
  await shot(page, "login-empty");
  await field(page, "Email").fill("nobody@example.com");
  await btn(page, "Send Code").click();
  await page.waitForTimeout(1500);
  await shot(page, "login-unknown-email");

  await page.goto(BASE, { waitUntil: "networkidle" });
  await nav(page, "Admin");
  await shot(page, "admin-login");

  for (const p of ["privacy-policy", "eula", "dpa"]) {
    await page.goto(`${BASE}/${p}`, { waitUntil: "networkidle" });
    await shot(page, `legal-${p}`);
  }

  // Deep link while signed out — every email CTA looks like this.
  await page.goto(`${BASE}/?order=DA-2607-1005`, { waitUntil: "networkidle" });
  await shot(page, "deeplink-signed-out");

  // ── sign in as a fresh buyer, tour the empty states ──────────────────────
  // The portal is invite-only, so the account is created the way the admin
  // panel creates one (INSERT + profile) rather than through a sign-up screen.
  invite(BUYER, "Audit Test ApS");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await nav(page, "Sign In");
  await field(page, "Email").fill(BUYER);
  await btn(page, "Send Code").click();
  await page.waitForTimeout(2000);
  await shot(page, "otp-sent");

  await page.getByPlaceholder("000000").fill("000000");
  await btn(page, "Verify & Sign In").click();
  await page.waitForTimeout(1500);
  await shot(page, "otp-wrong-code");

  note(`buyer OTP ${otpFor(BUYER)}`);
  await page.getByPlaceholder("000000").fill(otpFor(BUYER));
  await btn(page, "Verify & Sign In").click();
  await page.waitForTimeout(3000);
  await shot(page, "catalog-first-login");

  await nav(page, "My orders");
  await shot(page, "myorders-empty");
  await nav(page, "Profile");
  await shot(page, "profile-new-account");

  // ── catalog → cart → checkout ────────────────────────────────────────────
  await nav(page, "Catalog");
  await page.waitForTimeout(1200);
  const qty = page.locator('input[type="number"]');
  await qty.nth(0).fill("3");
  await qty.nth(1).fill("2");
  await page.waitForTimeout(500);
  await shot(page, "catalog-cart-bar");

  await btn(page, "Proceed").click();
  await page.waitForTimeout(1200);
  await shot(page, "checkout-empty-required");

  await fillBuyer(page, { city: "København", zip: "2200", country: "Denmark", vat: "" });
  await shot(page, "checkout-dk-vat");

  await fillBuyer(page, { city: "Paris", zip: "75001", country: "France", vat: "FR12345678901" });
  await shot(page, "checkout-eu-reverse-charge");

  await fillBuyer(page, { city: "Paris", zip: "75001", country: "France", vat: "" });
  await shot(page, "checkout-eu-no-vat-id");

  await fillBuyer(page, { city: "Zürich", zip: "8001", country: "Switzerland", vat: "" });
  await shot(page, "checkout-export");

  await page.getByPlaceholder("Enter code").fill("NOPECODE");
  await btn(page, "Apply").click();
  await page.waitForTimeout(1200);
  await shot(page, "checkout-promo-invalid");
  await page.getByPlaceholder("Enter code").fill("MOODSCENTBAR");
  await btn(page, "Apply").click();
  await page.waitForTimeout(1200);
  await shot(page, "checkout-promo-applied");

  await fillBuyer(page, { city: "København", zip: "2200", country: "Denmark", vat: "" });
  await btn(page, "Place order").first().click();
  await page.waitForTimeout(700);
  await shot(page, "checkout-confirm-modal");

  await btn(page, "Place order").last().click();
  await page.waitForTimeout(6000);
  await shot(page, "invoice-after-order");

  await nav(page, "My orders");
  await page.waitForTimeout(1500);
  await shot(page, "myorders-with-order");

  await btn(page, "Edit").first().click().catch(() => note("no Edit button"));
  await page.waitForTimeout(700);
  await shot(page, "myorders-edit-mode");
  // The edit row's Cancel is the first one in the DOM; the red one further
  // down cancels the ORDER.
  await btn(page, "Cancel").first().click().catch(() => {});
  await page.waitForTimeout(500);

  await btn(page, "Repeat order").first().click().catch(() => note("no Repeat Order button"));
  await page.waitForTimeout(1500);
  await shot(page, "after-repeat-order");

  // Cancel the order last — it is the one action that changes how everything
  // else renders.
  await nav(page, "My orders");
  await page.waitForTimeout(1200);
  if (await btn(page, "Cancel").first().count()) {
    await btn(page, "Cancel").first().click();
    await page.waitForTimeout(700);
    await shot(page, "cancel-confirm-modal");
    await btn(page, "Cancel order").last().click().catch(async () => { await page.keyboard.press("Escape"); note("cancel modal: no 'Cancel Order' confirm button"); });
    await page.waitForTimeout(2500);
    await shot(page, "myorders-cancelled");
  }

  // ── loading and error states, forced ─────────────────────────────────────
  await ctx.route("**/api/orders**", async (route) => {
    await new Promise((r) => setTimeout(r, 5000));
    await route.continue();
  });
  await nav(page, "My orders");
  await page.waitForTimeout(600);
  await shot(page, "myorders-loading");
  await page.waitForTimeout(5500);
  await ctx.unroute("**/api/orders**");

  await ctx.route("**/api/orders**", (route) => route.abort("failed"));
  await nav(page, "Catalog");
  await page.waitForTimeout(600);
  await nav(page, "My orders");
  await page.waitForTimeout(2500);
  await shot(page, "myorders-network-error");
  await ctx.unroute("**/api/orders**");

  await ctx.route("**/api/inventory**", (route) => route.abort("failed"));
  await nav(page, "Profile");
  await page.waitForTimeout(400);
  await nav(page, "Catalog");
  await page.waitForTimeout(2500);
  await shot(page, "catalog-inventory-error");
  await ctx.unroute("**/api/inventory**");

  // ── admin ────────────────────────────────────────────────────────────────
  await page.goto(BASE, { waitUntil: "networkidle" });
  await btn(page, "Sign out").click().catch(() => {});
  await page.waitForTimeout(1200);

  invite(ADMIN, "Audit Admin");
  psql(`update users set role = 'admin' where email = '${ADMIN}'`);
  await page.goto(BASE, { waitUntil: "networkidle" });
  await nav(page, "Admin");
  await field(page, "Email").fill(ADMIN);
  await btn(page, "Send Code").click();
  await page.waitForTimeout(2000);
  note(`admin OTP ${otpFor(ADMIN)}`);
  await page.getByPlaceholder("000000").fill(otpFor(ADMIN));
  await btn(page, "Verify & Sign In").click();
  await page.waitForTimeout(4000);
  await shot(page, "admin-panel");

  // The admin panel is one long page — capture the sections that expand.
  const firstRow = page.locator(".da-order-row").first();
  if (await firstRow.count()) {
    await firstRow.click();
    await page.waitForTimeout(900);
    await shot(page, "admin-order-expanded");
  }

  writeFileSync(`${OUT}/console-errors.txt`, consoleErrors.join("\n") || "(none)");
  writeFileSync(`${OUT}/notes.txt`, notes.join("\n"));
  console.log(`\n${n} screenshots → ${OUT}`);
  console.log(consoleErrors.length ? `⚠ ${consoleErrors.length} console/network errors` : "no console errors");
  await browser.close();
}

main().catch(async (e) => { console.error("SWEEP FAILED after", n, "shots:", e.message); process.exit(1); });

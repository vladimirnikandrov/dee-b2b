// What the browser actually downloads, per screen, on the production build.
// Run after audit-sweep.mjs (it reuses the same audit buyer account).
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";

const BASE = process.env.AUDIT_BASE || "http://localhost:3200";
const DB = process.env.AUDIT_DB || "dee_april_b2b";
const BUYER = "audit-buyer@project-1804.com";
const psql = (sql) => execFileSync("psql", ["-d", DB, "-tAc", sql], { encoding: "utf8" }).trim();
const kb = (b) => (b / 1024).toFixed(0) + " KB";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

let bytes = {};
let label = "landing";
page.on("response", async (r) => {
  try {
    const len = Number((await r.allHeaders())["content-length"] || 0);
    const type = (r.request().resourceType() || "other");
    bytes[label] ||= { total: 0, byType: {}, biggest: [] };
    bytes[label].total += len;
    bytes[label].byType[type] = (bytes[label].byType[type] || 0) + len;
    if (len > 100_000) bytes[label].biggest.push(`${kb(len)}  ${r.url().replace(BASE, "")}`);
  } catch {}
});

const vitals = async () =>
  page.evaluate(() => new Promise((resolve) => {
    let lcp = 0, cls = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) lcp = Math.max(lcp, e.startTime); })
      .observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value; })
      .observe({ type: "layout-shift", buffered: true });
    setTimeout(() => {
      const nav = performance.getEntriesByType("navigation")[0] || {};
      resolve({ lcp: Math.round(lcp), cls: +cls.toFixed(3), ttfb: Math.round(nav.responseStart || 0), domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0) });
    }, 3500);
  }));

await page.goto(BASE, { waitUntil: "networkidle" });
const landingVitals = await vitals();

// Sign in and walk to the catalog, measuring what that screen pulls.
psql(`delete from login_otps where email = '${BUYER}'`);
await page.getByRole("button", { name: "Sign In", exact: true }).first().click();
await page.locator('label:has-text("Email")').locator("xpath=following-sibling::input[1]").first().fill(BUYER);
await page.getByRole("button", { name: "Send Code", exact: true }).click();
await page.waitForTimeout(1500);
const code = psql(`select code from login_otps where email = '${BUYER}' and used_at is null order by created_at desc limit 1`);
label = "catalog";
await page.getByPlaceholder("000000").fill(code);
await page.getByRole("button", { name: "Verify & Sign In", exact: true }).click();
await page.waitForTimeout(6000);
const catalogVitals = await vitals();

for (const [screen, data] of Object.entries(bytes)) {
  console.log(`\n── ${screen} ── ${kb(data.total)} transferred`);
  for (const [t, b] of Object.entries(data.byType).sort((a, c) => c[1] - a[1])) console.log(`   ${t.padEnd(12)} ${kb(b)}`);
  if (data.biggest.length) console.log("   over 100 KB:\n     " + data.biggest.join("\n     "));
}
console.log("\nlanding vitals", landingVitals);
console.log("catalog vitals", catalogVitals);
await browser.close();

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// The guard reads env at module load, so each case needs a fresh import.
async function loadWith(env) {
  vi.resetModules();
  const prev = { ...process.env };
  Object.assign(process.env, { RESEND_API_KEY: "re_test", ...env });
  const mod = await import("@/lib/email");
  return { mod, restore: () => { process.env = prev; } };
}

const ORDER = {
  orderId: "DA-2607-1010",
  buyerEmail: "real-customer@example.com",
  buyerCompany: "Real Retailer",
  lines: [{ product: "DEE 01", size: "100 ML", qty: 1, unitPrice: 75, total: 75 }],
  totalWSP: 75, vatAmount: 0, vatLabel: "Export (0% VAT)", vatNote: "",
  shipping: 35, totalWithVat: 110, depositAmount: 35, depositInvoiceTotal: 35, balanceAmount: 75,
  date: new Date("2026-07-31T10:00:00Z"),
};

let fetchСalledWith = null;

beforeEach(() => {
  fetchСalledWith = null;
  globalThis.fetch = vi.fn(async (url, init) => {
    fetchСalledWith = { url, body: JSON.parse(init.body) };
    return new Response(JSON.stringify({ id: "sent" }), { status: 200 });
  });
});
afterEach(() => { vi.restoreAllMocks(); });

// This is the regression the guard exists for: between 3 and 26 July 2026 real
// retailers got emails whose logo and "View Order" link pointed at
// http://localhost:3000, because a dev machine ran with the production Resend
// key. Nothing in the templates was wrong — the environment was.
describe("dev send guard", () => {
  it("refuses to email a real customer from a localhost environment", async () => {
    const { mod, restore } = await loadWith({ SITE_URL: "http://localhost:3000", DEV_EMAIL_ALLOWLIST: "" });
    const res = await mod.sendTransactionalEmail("order_placed_buyer", ORDER);
    restore();
    expect(res.blocked).toBe(true);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  // Local email testing has to keep working, or the guard just gets disabled by
  // whoever needs to test. Outside production the only question is WHO receives
  // it; localhost URLs in the body are expected there.
  it("still lets a developer email themselves when explicitly allowlisted", async () => {
    const { mod, restore } = await loadWith({
      SITE_URL: "http://localhost:3000",
      DEV_EMAIL_ALLOWLIST: "dev@example.com",
    });
    const res = await mod.sendTransactionalEmail("order_placed_buyer", { ...ORDER, buyerEmail: "dev@example.com" });
    restore();
    expect(res.blocked).toBeUndefined();
    expect(res.success).toBe(true);
    expect(fetchСalledWith.body.html).toMatch(/localhost:3000/);
  });

  // The allowlist must never become a way to reach a real customer from a dev
  // box: it is checked against the actual recipient, not merely present.
  it("does not let an allowlist entry unlock sending to everyone", async () => {
    const { mod, restore } = await loadWith({
      SITE_URL: "http://localhost:3000",
      DEV_EMAIL_ALLOWLIST: "dev@example.com",
    });
    const res = await mod.sendTransactionalEmail("order_placed_buyer", ORDER);
    restore();
    expect(res.blocked).toBe(true);
  });

  it("matches the allowlist case-insensitively", async () => {
    const { mod, restore } = await loadWith({
      SITE_URL: "https://order.maison-dee.com",
      DEV_EMAIL_ALLOWLIST: "Dev@Example.com",
    });
    const res = await mod.sendTransactionalEmail("order_placed_buyer", { ...ORDER, buyerEmail: "DEV@example.COM" });
    restore();
    expect(res.blocked).toBeUndefined();
  });

  // The guard must be invisible in production. If it ever blocks a real order
  // confirmation, that is a worse outage than the bug it prevents.
  it("does not interfere with production sends", async () => {
    const { mod, restore } = await loadWith({ SITE_URL: "https://order.maison-dee.com" });
    const res = await mod.sendTransactionalEmail("order_placed_buyer", ORDER);
    restore();
    expect(res.success).toBe(true);
    expect(res.blocked).toBeUndefined();
    expect(fetchСalledWith.body.to).toBe("real-customer@example.com");
    expect(fetchСalledWith.body.html).not.toMatch(/localhost/);
  });

  it("treats the old domain as production too, until it is retired", async () => {
    const { mod, restore } = await loadWith({ SITE_URL: "https://order.deeapril.com" });
    const res = await mod.sendTransactionalEmail("order_placed_buyer", ORDER);
    restore();
    expect(res.success).toBe(true);
  });

  it("blocks a Railway preview URL leaking into a real send", async () => {
    // This actually happened on 3 Jul 2026: an email went out carrying
    // https://web-production-bac70.up.railway.app as its base URL.
    const { mod, restore } = await loadWith({ SITE_URL: "https://web-production-bac70.up.railway.app" });
    const res = await mod.sendTransactionalEmail("order_placed_buyer", ORDER);
    restore();
    expect(res.blocked).toBe(true);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("blocks a malformed SITE_URL rather than sending with a broken base", async () => {
    const { mod, restore } = await loadWith({ SITE_URL: "not-a-url" });
    const res = await mod.sendTransactionalEmail("order_placed_buyer", ORDER);
    restore();
    expect(res.blocked).toBe(true);
  });

  it("checks every template, not just order confirmation", async () => {
    const { mod, restore } = await loadWith({ SITE_URL: "http://localhost:3000" });
    const otp = await mod.sendTransactionalEmail("otp_login", { email: "real-customer@example.com", code: "123456" });
    restore();
    expect(otp.blocked).toBe(true);
  });
});

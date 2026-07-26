import { requireAdmin } from "@/lib/auth";

// e-conomic redirects here (GET, ?token=xxx) after an accounting user
// authorizes the app via the InstallationURL. The token is the
// AgreementGrantToken — there's no API to receive it programmatically,
// e-conomic's own docs say to pick it up from this GET and handle it
// yourself. We just display it so it can be copied into the
// ECONOMIC_AGREEMENT_GRANT_TOKEN Railway env var (see lib/economic.js).
//
// Admin-gated, and the token is HTML-escaped before being rendered: this
// route reflects an attacker-controllable query param into an HTML response
// on our own origin, so without both guards it was a reflected-XSS hole that
// would run fully authenticated as whoever opened the link (the session
// cookie is sameSite:"lax", which still sends it on a top-level navigation).
// Because a 403 discards the token, re-running the e-conomic authorization
// flow has to be done from a browser already signed in as an admin here.

// Same escaping as lib/email.js — kept local so this route has no reason to
// import the email module.
function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function GET(request) {
  const session = await requireAdmin();
  if (!session) {
    return new Response("Forbidden — sign in as an admin first, then re-run the e-conomic authorization.", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const token = new URL(request.url).searchParams.get("token");

  const body = token
    ? `<p>Copy this into the <code>ECONOMIC_AGREEMENT_GRANT_TOKEN</code> Railway env var, then redeploy:</p>
       <div class="token">${escapeHtml(token)}</div>`
    : `<p class="err">No token was included in this redirect — the authorization may not have completed.</p>`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>e-conomic connected</title>
<style>
body{margin:0;background:#000;color:#fff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:40px 20px;box-sizing:border-box;}
.card{max-width:520px;width:100%;}
h1{font-size:15px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;margin:0 0 20px;}
p{font-size:13px;color:#aaa;line-height:1.7;}
.token{word-break:break-all;background:#111;border:1px solid #333;border-radius:10px;padding:16px;font-size:13px;color:#fff;margin-top:12px;user-select:all;}
.err{color:#dc2626;}
code{background:#1a1a1a;padding:2px 6px;border-radius:4px;}
</style></head>
<body><div class="card"><h1>e-conomic authorization received</h1>${body}</div></body></html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

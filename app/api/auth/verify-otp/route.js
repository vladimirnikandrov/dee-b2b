import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { signSession, setSessionCookie, OTP_MAX_ATTEMPTS } from "@/lib/auth";

export async function POST(request) {
  try {
    const { email: rawEmail, code } = await request.json();
    // Identity is case-insensitive (migration 010) — normalise once, here, so
    // every query and every row we write agrees on the same string.
    const email = String(rawEmail || "").trim().toLowerCase();
    if (!email || !code) return NextResponse.json({ error: "Email and code are required" }, { status: 400 });

    // Consume ANY live code for this address, not merely the newest one.
    // Checking only the newest meant anyone could lock a person out simply by
    // requesting codes for their address: each request superseded the code the
    // real owner was holding, so their correct code was rejected forever. With
    // the only admin account that is a permanent lockout, from an
    // unauthenticated attacker.
    //
    // The claim is one atomic statement — matching, expiry, attempt cap and
    // consumption together — so a burst of concurrent guesses cannot each read
    // attempts=0 and get a free try against the app's only auth factor.
    const [match] = await sql`
      update login_otps
      set used_at = now()
      where email = ${email}
        and used_at is null
        and expires_at > now()
        and attempts < ${OTP_MAX_ATTEMPTS}
        and code = ${String(code).trim()}
      returning id
    `;

    if (!match) {
      // Wrong (or exhausted, or expired). Burn an attempt on every live code so
      // guessing is bounded, and report the state without revealing which.
      const spent = await sql`
        update login_otps
        set attempts = attempts + 1
        where email = ${email} and used_at is null and expires_at > now() and attempts < ${OTP_MAX_ATTEMPTS}
        returning attempts
      `;
      if (spent.length === 0) {
        return NextResponse.json({ error: "No active code — request a new one" }, { status: 400 });
      }
      const remaining = Math.max(0, OTP_MAX_ATTEMPTS - Math.max(...spent.map((r) => r.attempts)));
      return NextResponse.json(
        { error: `Incorrect code — ${remaining} attempt${remaining === 1 ? "" : "s"} left` },
        { status: 400 }
      );
    }

    // Retire every other outstanding code for this email — otherwise an older
    // code that was emailed but never consumed stays valid.
    await sql`update login_otps set used_at = now() where email = ${email} and used_at is null`;

    const [user] = await sql`select id, email, role from users where lower(email) = ${email}`;
    if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const token = await signSession({ id: user.id, email: user.email, role: user.role });
    await setSessionCookie(token);

    return NextResponse.json({ id: user.id, email: user.email, role: user.role });
  } catch (err) {
    console.error("Verify OTP error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

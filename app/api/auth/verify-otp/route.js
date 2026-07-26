import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { signSession, setSessionCookie, OTP_MAX_ATTEMPTS } from "@/lib/auth";

export async function POST(request) {
  try {
    const { email, code } = await request.json();
    if (!email || !code) return NextResponse.json({ error: "Email and code are required" }, { status: 400 });

    const [otp] = await sql`
      select * from login_otps
      where email = ${email} and used_at is null
      order by created_at desc limit 1
    `;
    if (!otp) return NextResponse.json({ error: "No active code — request a new one" }, { status: 400 });
    if (new Date(otp.expires_at) < new Date()) {
      return NextResponse.json({ error: "This code has expired — request a new one" }, { status: 400 });
    }
    // Claim an attempt atomically BEFORE comparing the code. Checking
    // `attempts` and incrementing it in two separate statements let a burst of
    // concurrent requests all read attempts=0 and each get a free guess, which
    // turned the 5-attempt cap into "unlimited attempts per burst" against the
    // app's only authentication factor. Concurrent updates to the same row
    // serialize on Postgres' row lock, so this is a real ceiling.
    const [attempt] = await sql`
      update login_otps
      set attempts = attempts + 1
      where id = ${otp.id} and attempts < ${OTP_MAX_ATTEMPTS} and used_at is null
      returning attempts, code
    `;
    if (!attempt) {
      return NextResponse.json({ error: "Too many attempts — request a new code" }, { status: 429 });
    }

    if (attempt.code !== code.trim()) {
      const remaining = Math.max(0, OTP_MAX_ATTEMPTS - attempt.attempts);
      return NextResponse.json({ error: `Incorrect code — ${remaining} attempt${remaining === 1 ? "" : "s"} left` }, { status: 400 });
    }

    // Retire every outstanding code for this email, not just the one used —
    // otherwise an older code that was emailed but never consumed stays valid.
    await sql`update login_otps set used_at = now() where email = ${email} and used_at is null`;

    const [user] = await sql`select id, email, role from users where email = ${email}`;
    if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const token = await signSession({ id: user.id, email: user.email, role: user.role });
    await setSessionCookie(token);

    return NextResponse.json({ id: user.id, email: user.email, role: user.role });
  } catch (err) {
    console.error("Verify OTP error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

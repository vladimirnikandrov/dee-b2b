import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { issueLoginOtp } from "@/lib/otp";
import { OTP_MAX_PER_HOUR } from "@/lib/auth";

// Returning-buyer sign-in: email in, code emailed out. (Registration issues
// its own first code via /api/auth/register — this route is for every
// sign-in after that.)
export async function POST(request) {
  try {
    const { email: rawEmail } = await request.json();
    const email = String(rawEmail || "").trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const [user] = await sql`select id from users where lower(email) = ${email}`;
    if (!user) {
      return NextResponse.json({ error: "No account found with this email — create one first" }, { status: 404 });
    }

    // Basic spam guard: don't issue a new code if one was requested in the last 30s.
    const [recent] = await sql`
      select id from login_otps
      where email = ${email} and created_at > now() - interval '30 seconds'
      order by created_at desc limit 1
    `;
    if (recent) {
      return NextResponse.json({ error: "A code was just sent — check your email or wait a moment" }, { status: 429 });
    }

    // Hourly ceiling. The 30-second gap alone still allows 120 mails an hour to
    // any address that exists — enough to bury someone's inbox and, before
    // verify-otp was fixed to accept any live code, enough to lock them out
    // permanently. Nobody legitimately needs more than a handful of codes an
    // hour. Deliberately answered as success-shaped 429 rather than silence, so
    // a real person who hits it is told why.
    const [{ count }] = await sql`
      select count(*)::int as count from login_otps
      where email = ${email} and created_at > now() - interval '1 hour'
    `;
    if (count >= OTP_MAX_PER_HOUR) {
      return NextResponse.json(
        { error: "Too many codes requested for this address — try again in an hour" },
        { status: 429 }
      );
    }

    await issueLoginOtp(email);
    return NextResponse.json({ step: "otp_sent", email });
  } catch (err) {
    console.error("Request OTP error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

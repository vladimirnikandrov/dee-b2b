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
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      return NextResponse.json({ error: "Too many attempts — request a new code" }, { status: 429 });
    }

    if (otp.code !== code.trim()) {
      await sql`update login_otps set attempts = attempts + 1 where id = ${otp.id}`;
      const remaining = OTP_MAX_ATTEMPTS - (otp.attempts + 1);
      return NextResponse.json({ error: `Incorrect code — ${remaining} attempt${remaining === 1 ? "" : "s"} left` }, { status: 400 });
    }

    await sql`update login_otps set used_at = now() where id = ${otp.id}`;

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

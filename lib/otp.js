// Shared by /api/auth/register and /api/auth/request-otp — both end with
// "generate a code, email it" and should behave identically.
import { sql } from "@/lib/db";
import { generateOtpCode, OTP_TTL_MINUTES } from "@/lib/auth";
import { sendTransactionalEmail } from "@/lib/email";

export async function issueLoginOtp(email) {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  await sql`insert into login_otps (email, code, expires_at) values (${email}, ${code}, ${expiresAt})`;
  await sendTransactionalEmail("otp_login", { email, code, ttlMinutes: OTP_TTL_MINUTES });
}

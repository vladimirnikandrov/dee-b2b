import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// Client calls this on mount instead of supabase.auth.getSession().
// Deliberately does NOT return `company` — that lives on buyer_profiles
// and is loaded separately via GET /api/profile, avoiding two sources of truth.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ session: null });
  return NextResponse.json({ session: { id: session.id, email: session.email, role: session.role } });
}

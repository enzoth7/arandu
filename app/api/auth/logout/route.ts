import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";
import { TEMPORARY_ADMIN_COOKIE, temporaryAdminCookieOptions } from "../../../../lib/temporary-demo-auth";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut({ scope: "local" });
  const response = NextResponse.json({ signedOut: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(TEMPORARY_ADMIN_COOKIE, "", { ...temporaryAdminCookieOptions, maxAge: 0 });
  return response;
}

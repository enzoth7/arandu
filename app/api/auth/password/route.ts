import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let password = "";
  try {
    const body = await request.json() as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    // La validación inferior produce una respuesta estable.
  }
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "La contraseña debe tener entre 8 y 128 caracteres." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const supabase = await createServerSupabaseClient();
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) return NextResponse.json({ error: "La sesión venció. Solicitá un enlace nuevo." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return NextResponse.json({ error: "No pudimos guardar esa contraseña. Probá con una diferente." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ updated: true }, { headers: { "Cache-Control": "no-store" } });
}

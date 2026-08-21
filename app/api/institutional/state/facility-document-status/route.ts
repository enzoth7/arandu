import { NextRequest, NextResponse } from "next/server";
import { institutionalSessionOrError } from "../../../../../lib/institutional-auth";
import { querySupabaseDatabase } from "../../../../../lib/supabase-db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await institutionalSessionOrError(request, "administrator");
  if (!auth.session) return auth.response;
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const facilityId = Number(body.facilityId);
  const decision = body.decision === "clear" ? "clear" : body.decision === "inadequate" ? "inadequate" : "";
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 4_000) : "";
  if (!Number.isInteger(facilityId) || facilityId <= 0 || !decision || reason.length < 10) return NextResponse.json({ error: "Indicá una decisión y un fundamento de al menos 10 caracteres." }, { status: 400 });
  try {
    const rows = await querySupabaseDatabase<{ id: string; created_at: string }>(
      `INSERT INTO public.facility_document_status_reviews (facility_id, decision, reason, reviewer)
       VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
      [facilityId, decision, reason, auth.session.identity],
    );
    return NextResponse.json({ review: rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Facility document status review failed.", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "No se pudo guardar la decisión documental." }, { status: 502 });
  }
}

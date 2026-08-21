import { NextRequest, NextResponse } from "next/server";
import { institutionalSessionOrError } from "../../../../../lib/institutional-auth";
import { listRepresentativeVisits } from "../../../../../lib/visit-scheduling-db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await institutionalSessionOrError(request, "facility_representative");
  if (!auth.session) return auth.response;
  try {
    return NextResponse.json({ visits: await listRepresentativeVisits(auth.session.userId, auth.session.facilityIds) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Facility visits failed.", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "No se pudo cargar la agenda." }, { status: 502 });
  }
}

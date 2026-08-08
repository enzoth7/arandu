import { NextRequest, NextResponse } from "next/server";
import { loadManualDiscoveryPilot } from "../../../../../lib/manual-discovery-pilot.mjs";
import { teamSessionOrUnauthorized } from "../../../../../lib/team-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { session, response: unauthorized } = teamSessionOrUnauthorized(request);
  if (!session) return unauthorized;

  try {
    const pilot = await loadManualDiscoveryPilot(process.cwd());
    return NextResponse.json(pilot, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Manual discovery pilot list failed.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "No se pudo cargar la lista interna de candidatos sin ubicar." }, { status: 502 });
  }
}

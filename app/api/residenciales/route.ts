import { NextResponse } from "next/server";
import { loadPublicFacilities } from "../../../lib/facility-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { facilities, dataSource } = await loadPublicFacilities();
    return NextResponse.json(
      { facilities },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "X-ELEPEM-Data-Source": dataSource,
        },
      },
    );
  } catch (error) {
    console.error("Supabase residenciales query failed.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "No se pudo cargar el listado de ELEPEM." },
      { status: 503 },
    );
  }
}

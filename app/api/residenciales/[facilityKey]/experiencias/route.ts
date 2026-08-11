import { NextRequest, NextResponse } from "next/server";
import {
  decodeExperienceCursor,
  encodeExperienceCursor,
  parseExperiencePageLimit,
} from "../../../../../lib/experience-publications.mjs";
import { resolvePublicFacilityReference } from "../../../../../lib/facility-registry";
import { querySupabaseDatabase } from "../../../../../lib/supabase-db";

export const runtime = "nodejs";

type PublicExperienceRow = {
  publication_id: string;
  public_body: string;
  public_relationship: string | null;
  public_period: string | null;
  published_at: Date | string;
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ facilityKey: string }> },
) {
  const limit = parseExperiencePageLimit(request.nextUrl.searchParams.get("limit"));
  const cursor = decodeExperienceCursor(request.nextUrl.searchParams.get("cursor"));
  if (limit === null || cursor === false) {
    return NextResponse.json({ error: "Paginacion invalida." }, { status: 400 });
  }
  const { facilityKey } = await context.params;
  try {
    const facility = await resolvePublicFacilityReference(facilityKey);
    if (!facility) {
      return NextResponse.json({ error: "No se encontro el ELEPEM en el padron publico." }, { status: 404 });
    }
    const isDemo = process.env.DEMO_MODE === "true";
    const [countRows, rows] = await Promise.all([
      querySupabaseDatabase<{ count: string }>(
        `SELECT count(*)::text AS count
         FROM public.facility_experiences_published
         WHERE facility_key = $1 AND is_demo = $2`,
        [facility.key, isDemo],
      ),
      querySupabaseDatabase<PublicExperienceRow>(
        `SELECT publication_id, public_body, public_relationship, public_period, published_at
         FROM public.facility_experiences_published
         WHERE facility_key = $1
           AND is_demo = $2
           AND ($3::timestamptz IS NULL OR (published_at, publication_id) < ($3::timestamptz, $4::uuid))
         ORDER BY published_at DESC, publication_id DESC
         LIMIT $5`,
        [facility.key, isDemo, cursor?.publishedAt || null, cursor?.id || null, limit + 1],
      ),
    ]);
    const pageRows = rows.slice(0, limit);
    const items = pageRows.map((row) => ({
      id: row.publication_id,
      body: row.public_body,
      relationship: row.public_relationship,
      period: row.public_period,
      publishedAt: new Date(row.published_at).toISOString(),
    }));
    const lastItem = items.at(-1);
    return NextResponse.json({
      count: Number(countRows[0]?.count || 0),
      items,
      nextCursor: rows.length > limit && lastItem
        ? encodeExperienceCursor({ publishedAt: lastItem.publishedAt, id: lastItem.id })
        : null,
    }, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Public facility experiences failed.", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "No se pudieron cargar las experiencias." }, { status: 502 });
  }
}

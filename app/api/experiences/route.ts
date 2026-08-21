import { NextResponse } from "next/server";
import { parseBriefExperienceSubmission } from "../../../lib/brief-experience.mjs";
import { insertBriefExperience } from "../../../lib/brief-experience-db";
import { accountSessionOrError } from "../../../lib/institutional-auth";
import { MAX_INTAKE_REQUEST_BYTES } from "../../../lib/intake-report.mjs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await accountSessionOrError();
  if (!auth.account) return auth.response;
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_INTAKE_REQUEST_BYTES) return NextResponse.json({ error: "La experiencia es demasiado extensa." }, { status: 413 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "No se pudo leer la experiencia." }, { status: 400 }); }
  const parsed = parseBriefExperienceSubmission(body);
  if (!parsed) return NextResponse.json({ error: "Revisá las cinco secciones y las autorizaciones." }, { status: 400 });
  try {
    const result = await insertBriefExperience({ userId: auth.account.userId, ...parsed });
    return NextResponse.json({ caseCode: result.caseCode, message: "La experiencia quedó en revisión. No se publicó ningún contenido." }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    if (message === "verified-relationship-required") return NextResponse.json({ error: "El vínculo con este ELEPEM no está vigente." }, { status: 403 });
    console.error("Brief experience intake failed.", { message });
    return NextResponse.json({ error: "No se pudo guardar la experiencia." }, { status: 502 });
  }
}

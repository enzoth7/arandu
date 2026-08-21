import { NextResponse, type NextRequest } from "next/server";
import { institutionalSessionOrError, requireInstitutionalRole } from "./institutional-auth";

// Compatibility layer for private candidate-review APIs. They now accept only
// a state institutional session; the shared legacy cookie is gone.
export type TeamSession = { reviewer: string; expiresAt: number };

export async function requireTeamSession(): Promise<TeamSession> {
  const session = await requireInstitutionalRole("administrator");
  return { reviewer: session.identity, expiresAt: Date.now() + 60 * 60 * 1_000 };
}

export async function readServerTeamSession(): Promise<TeamSession | null> {
  return null;
}

export async function teamSessionOrUnauthorized(request: NextRequest): Promise<
  | { session: TeamSession; response: null }
  | { session: null; response: NextResponse }> {
  const auth = await institutionalSessionOrError(request, "administrator");
  if (!auth.session) return { session: null, response: auth.response };
  return { session: { reviewer: auth.session.identity, expiresAt: Date.now() + 60 * 60 * 1_000 }, response: null };
}

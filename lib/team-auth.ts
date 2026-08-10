import { NextResponse, type NextRequest } from "next/server";
import { institutionalSessionOrError, requireInstitutionalRole } from "./institutional-auth";

// Compatibility layer for private candidate-review APIs. They now accept only
// a state institutional session; the shared legacy cookie is gone.
export type TeamSession = { reviewer: string; expiresAt: number };

export async function requireTeamSession(): Promise<TeamSession> {
  const session = await requireInstitutionalRole("state");
  return { reviewer: session.identity, expiresAt: session.expiresAt };
}

export async function readServerTeamSession(): Promise<TeamSession | null> {
  return null;
}

export function teamSessionOrUnauthorized(request: NextRequest):
  | { session: TeamSession; response: null }
  | { session: null; response: NextResponse } {
  const auth = institutionalSessionOrError(request, "state");
  if (!auth.session) return { session: null, response: auth.response };
  return { session: { reviewer: auth.session.identity, expiresAt: auth.session.expiresAt }, response: null };
}

import { NextResponse } from "next/server";
import { readAccountSession } from "../../../../lib/institutional-auth";
import { loadAssignedFacilityProfiles } from "../../../../lib/facility-registry";


export const runtime = "nodejs";

export async function GET() {
  const account = await readAccountSession().catch(() => null);
  if (!account) {
    return NextResponse.json({ authenticated: false }, { headers: { "Cache-Control": "no-store" } });
  }

  let displayName = "";
  if (account.institutional?.role === "facility_representative" && account.institutional.facilityIds.length > 0) {
    const facilities = await loadAssignedFacilityProfiles(account.institutional.facilityIds).catch(() => []);
    if (facilities[0]?.name) {
      displayName = facilities[0].name;
    }
  }

  if (!displayName && account.profile?.firstName) {
    displayName = account.profile.firstName;
  }

  if (!displayName && account.email) {
    displayName = account.email.split("@")[0];
  }

  return NextResponse.json(
    {
      authenticated: true,
      email: account.email,
      displayName: displayName || "Usuario",
      role: account.institutional?.role || null,
    },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}

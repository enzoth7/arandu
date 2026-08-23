import type { Metadata } from "next";
import { requireInstitutionalRole } from "../../../lib/institutional-auth";
import { StateInbox } from "../../components/institutional/StateInbox";
import { TeamTabs } from "../../components/institutional/TeamTabs";

export const metadata: Metadata = { title: "Moderación de experiencias", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ModerationTeamPage() {
  const session = await requireInstitutionalRole("moderator");
  return (
    <main className="institutionalWorkspace workflowWorkspace moderationWorkspace">
      <TeamTabs role={session.role} />
      <StateInbox />
    </main>
  );
}

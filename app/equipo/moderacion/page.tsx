import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireInstitutionalRole } from "../../../lib/institutional-auth";
import { StateInbox } from "../../components/institutional/StateInbox";

export const metadata: Metadata = { title: "Moderación de experiencias", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ModerationTeamPage() {
  await requireInstitutionalRole("moderator");
  return <main className="institutionalWorkspace workflowWorkspace moderationWorkspace"><Link className="workflowBack" href="/cuenta"><ArrowLeft size={18} /> Volver a mi cuenta</Link><section className="moderationPrivacyNotice"><strong>Vista de moderación</strong><span>Las experiencias se muestran seudonimizadas, sin correo, teléfono ni evidencia de verificación.</span></section><StateInbox /></main>;
}

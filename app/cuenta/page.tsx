import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  HeartHandshake,
  Link2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { readAccountSession } from "../../lib/institutional-auth";
import { loadAssignedFacilityProfiles } from "../../lib/facility-registry";
import { AccountLogout } from "../components/institutional/AccountLogout";
import { loadVerifiedPersonalRelationships } from "../../lib/brief-experience-db";
import { institutionalHome } from "../../lib/institutional-auth";
import { querySupabaseDatabase } from "../../lib/supabase-db";
import { TermsAcceptanceModal } from "../components/TermsAcceptanceModal";

export const metadata: Metadata = { title: "Mi cuenta" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const account = await readAccountSession();
  if (!account) redirect("/iniciar-sesion?next=/cuenta");
  const isTemporaryAdmin = account.userId.startsWith("temporary:");
  const facilities = account.institutional?.role === "facility_representative" ? await loadAssignedFacilityProfiles(account.institutional.facilityIds) : [];
  const personalRelationships = isTemporaryAdmin ? [] : await loadVerifiedPersonalRelationships(account.userId);
  const relationshipCount = personalRelationships.length;

  const profile = account.profile;
  const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : "";
  const isElepemType = profile?.accountType === "elepem";

  const residentRel = personalRelationships.find((r) => r.relationshipType === "resident");
  const familyRel = personalRelationships.find((r) => r.relationshipType === "family");

  const isInstitutionalAdminOrStaff = Boolean(
    account.institutional && ["administrator", "verifier", "moderator"].includes(account.institutional.role)
  );

  let badgeLabel = "Cuenta personal";
  let badgeClass = "isPersonal";

  if (account.institutional) {
    const roleLabels: Record<string, string> = {
      administrator: "Administrador",
      verifier: "Verificador",
      moderator: "Moderador",
      support: "Soporte",
      facility_representative: "Representante ELEPEM",
    };
    badgeLabel = roleLabels[account.institutional.role] || "Institucional";
    badgeClass = account.institutional.role === "facility_representative" ? "isElepem" : "isInstitutional";
  } else if (isElepemType) {
    badgeLabel = "Representante ELEPEM";
    badgeClass = "isElepem";
  } else if (residentRel) {
    badgeLabel = "Residente";
    badgeClass = "isResident";
  } else if (familyRel) {
    badgeLabel = "Familiar";
    badgeClass = "isFamily";
  }

  let residentInfo: { name: string; facilityName: string } | null = null;
  if (familyRel && !isTemporaryAdmin) {
    const residentRows = await querySupabaseDatabase<{
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    }>(`
      select p.first_name, p.last_name, u.email
      from auth.users u
      left join public.user_profiles p on p.user_id = u.id
      where u.id = (
        select (raw_user_meta_data->>'invited_by_resident_id')::uuid
        from auth.users
        where id = $1::uuid
      )
      limit 1
    `, [account.userId]).catch(() => []);

    if (residentRows[0]) {
      const resName = [residentRows[0].first_name, residentRows[0].last_name].filter(Boolean).join(" ").trim()
        || residentRows[0].email
        || "un residente verificado";
      residentInfo = {
        name: resName,
        facilityName: familyRel.facilityName,
      };
    } else {
      residentInfo = {
        name: "un residente verificado",
        facilityName: familyRel.facilityName,
      };
    }
  }

  return <main className="institutionalWorkspace accountWorkspace">
    <TermsAcceptanceModal open={!account.termsAccepted && !isTemporaryAdmin} />
    <header className="accountHero">
      <div className="accountIdentity">
        <div className="accountAvatar" aria-hidden="true"><UserRound size={28} /></div>
        <div>
          <div className="accountTitleRow">
            <h1>{fullName || "Mi cuenta"}</h1>
            <span className={`accountBadge ${badgeClass}`}>
              {badgeLabel}
            </span>
          </div>
          <p className="accountEmail">
            {account.email}
            {profile?.phone && <span className="accountPhone"> · {profile.phone}</span>}
          </p>
          {residentInfo && (
            <p className="accountLinkedResident">
              Vinculado al residente <strong>{residentInfo.name}</strong> · <span>{residentInfo.facilityName}</span>
            </p>
          )}
        </div>
      </div>
      <AccountLogout />
    </header>



    <section className="accountActions" aria-labelledby="account-actions-title">
      <div className="accountSectionHeading">
        <div>
          <h2 id="account-actions-title">Tus gestiones</h2>
          <p>Accedé rápidamente a las acciones disponibles para tu cuenta.</p>
        </div>
      </div>

      <div className="accountActionGrid">
        {account.institutional && <article className="accountActionCard accountInstitutionalCard">
          <div className="accountCardTopline">
            <div className="accountCardIcon isInstitutional" aria-hidden="true">
              {account.institutional.role === "facility_representative" ? <Building2 size={24} /> : <ShieldCheck size={24} />}
            </div>
            <span className="accountStatus isInstitutional">Acceso institucional activo</span>
          </div>
          <div className="accountCardCopy">
            <h3>{{ administrator: "Administración", verifier: "Verificación", moderator: "Moderación", support: "Soporte", facility_representative: "Representante de ELEPEM" }[account.institutional.role]}</h3>
            <p>{account.institutional.role === "facility_representative"
              ? facilities.length
                ? `Gestioná ${facilities.length} ELEPEM asignado${facilities.length === 1 ? "" : "s"}.`
                : "Tu solicitud todavía no tiene una representación activa."
              : "Accedé al panel separado correspondiente a tu función."}</p>
          </div>
          {(account.institutional.role !== "facility_representative" || facilities.length > 0) && <Link className="accountCardLink" href={institutionalHome(account.institutional.role)}>Abrir panel <ArrowRight size={18} aria-hidden="true" /></Link>}
        </article>}

        {!isInstitutionalAdminOrStaff && !isTemporaryAdmin && isElepemType && (!account.institutional || account.institutional.role === "facility_representative") && <article className="accountActionCard accountInstitutionalCard">
          <div className="accountCardIcon isInstitutional" aria-hidden="true"><Building2 size={24} /></div>
          <div className="accountCardCopy">
            <h3>Representar un ELEPEM</h3>
            <p>Solicitá acceso institucional al ELEPEM que gestionás para proponer cambios en su ficha y agenda de visitas.</p>
          </div>
          <Link className="accountCardLink" href="/institucional/solicitar-representacion">Solicitar representación <ArrowRight size={18} aria-hidden="true" /></Link>
        </article>}

        {!isInstitutionalAdminOrStaff && !isTemporaryAdmin && !familyRel && <article className="accountActionCard">
          <div className="accountCardIcon isRelationships" aria-hidden="true"><Link2 size={24} /></div>
          <div className="accountCardCopy">
            <h3>Mis vínculos</h3>
            <p>Solicitá y consultá la verificación de residencia para compartir experiencias e invitar familiares.</p>
          </div>
          <Link className="accountCardLink" href="/cuenta/vinculos">Gestionar vínculos <ArrowRight size={18} aria-hidden="true" /></Link>
        </article>}

        {!isInstitutionalAdminOrStaff && !isTemporaryAdmin && !familyRel && <article className="accountActionCard">
          <div className="accountCardIcon isVisits" aria-hidden="true"><CalendarDays size={24} /></div>
          <div className="accountCardCopy">
            <h3>Visitas</h3>
            <p>Consultá y gestioná las visitas que solicitaste a los ELEPEM.</p>
          </div>
          <Link className="accountCardLink" href="/cuenta/visitas">
            Ver mis visitas <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </article>}

        {!isInstitutionalAdminOrStaff && !isTemporaryAdmin && <article className="accountActionCard">
          <div className="accountCardTopline">
            <div className="accountCardIcon isExperiences" aria-hidden="true"><HeartHandshake size={24} /></div>
            <span className={`accountStatus ${relationshipCount > 0 ? "isActive" : ""}`}>
              {relationshipCount > 0
                ? `${relationshipCount} vínculo${relationshipCount === 1 ? "" : "s"} vigente${relationshipCount === 1 ? "" : "s"}`
                : "Sin vínculo verificado"}
            </span>
          </div>
          <div className="accountCardCopy">
            <h3>Experiencias de residencia</h3>
            <p>{relationshipCount > 0
              ? "Compartí tu experiencia vinculada a un ELEPEM."
              : "Necesitás un vínculo residente o familiar verificado para participar."}</p>
          </div>
          {relationshipCount > 0 && <Link className="accountCardLink" href="/experiencia">
            Compartir una experiencia <ArrowRight size={18} aria-hidden="true" />
          </Link>}
        </article>}
      </div>
    </section>
  </main>;

}

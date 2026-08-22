"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Check, Clock3, Mail, ShieldCheck, UserCheck, UserRound, X } from "lucide-react";
import type { InstitutionalRole } from "../../../lib/institutional-types";
import type { FacilityOption } from "../../../lib/role-workflows-db";

type NoticeState = { kind: "idle" | "loading" | "success" | "error"; message: string };

async function postJson(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "No se pudo completar la acción.");
  return payload;
}

function SubmitNotice({ state }: { state: NoticeState }) {
  if (state.kind === "idle") return null;
  return <p className={`workflowNotice is-${state.kind}`} role={state.kind === "error" ? "alert" : "status"}>{state.message}</p>;
}

export function RelationshipRequestForm({ facilities }: { facilities: FacilityOption[] }) {
  const router = useRouter();
  const [state, setState] = useState<NoticeState>({ kind: "idle", message: "" });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    setState({ kind: "loading", message: "Enviando solicitud…" });
    try {
      await postJson("/api/account/relationships", { facilityId: Number(data.get("facilityId")), relationshipType: data.get("relationshipType") });
      setState({ kind: "success", message: "Solicitud enviada. Un Verificador independiente revisará el vínculo." });
      router.refresh();
    } catch (error) { setState({ kind: "error", message: error instanceof Error ? error.message : "No se pudo enviar." }); }
  }
  return <form className="workflowForm" onSubmit={submit}>
    <label className="workflowField"><strong>ELEPEM</strong><select name="facilityId" required defaultValue=""><option value="" disabled>Seleccionar ELEPEM</option>{facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name} · {facility.locality || facility.department}</option>)}</select></label>
    <fieldset className="workflowChoices"><legend>Tu vínculo</legend>
      <label><input type="radio" name="relationshipType" value="resident" required /> Persona residente</label>
      <label><input type="radio" name="relationshipType" value="family" required /> Familiar o persona allegada</label>
    </fieldset>
    <p className="workflowHelp">No pedimos el nombre de la persona residente, parentesco exacto, documentos ni datos de salud.</p>
    <button className="workflowPrimary" disabled={state.kind === "loading"}>{state.kind === "loading" ? "Enviando…" : "Solicitar verificación"}</button>
    <SubmitNotice state={state} />
  </form>;
}

export function RepresentationRequestForm({ facilities }: { facilities: FacilityOption[] }) {
  const router = useRouter(); const [state, setState] = useState<NoticeState>({ kind: "idle", message: "" });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); setState({ kind: "loading", message: "Enviando solicitud…" });
    try { await postJson("/api/institutional/representation-claims", { facilityId: Number(data.get("facilityId")) }); setState({ kind: "success", message: "Solicitud recibida. Administración comprobará la autorización." }); router.refresh(); }
    catch (error) { setState({ kind: "error", message: error instanceof Error ? error.message : "No se pudo enviar." }); }
  }
  return <form className="workflowForm" onSubmit={submit}>
    <label className="workflowField"><strong>ELEPEM que representás</strong><select name="facilityId" required defaultValue=""><option value="" disabled>Seleccionar ELEPEM</option>{facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name} · {facility.department}</option>)}</select></label>
    <p className="workflowHelp">La solicitud no da acceso automático. Administración comprobará la autorización antes de habilitar el portal.</p>
    <button className="workflowPrimary" disabled={state.kind === "loading"}>{state.kind === "loading" ? "Enviando…" : "Solicitar representación"}</button>
    <SubmitNotice state={state} />
  </form>;
}

export function WorkflowDecisionButtons({ endpoint, payload, kind, status }: { endpoint: string; payload: Record<string, unknown>; kind: "verification" | "representation"; status: string }) {
  const router = useRouter(); const [state, setState] = useState<NoticeState>({ kind: "idle", message: "" });
  const actions = status === "pending"
    ? [{ value: "approve", label: kind === "verification" ? "Verificar" : "Aprobar", icon: Check }, { value: "reject", label: "Rechazar", icon: X }]
    : kind === "verification" && status === "verified"
      ? [{ value: "dispute", label: "Poner en revisión", icon: Clock3 }, { value: "revoke", label: "Revocar", icon: X }]
      : kind === "representation" && ["active", "suspended"].includes(status)
        ? [{ value: status === "active" ? "suspend" : "approve", label: status === "active" ? "Suspender" : "Reactivar", icon: Clock3 }, { value: "revoke", label: "Revocar", icon: X }]
        : [];
  async function decide(action: string) {
    setState({ kind: "loading", message: "Guardando…" });
    try { await postJson(endpoint, { ...payload, action }); setState({ kind: "success", message: "Decisión guardada." }); router.refresh(); }
    catch (error) { setState({ kind: "error", message: error instanceof Error ? error.message : "No se pudo guardar." }); }
  }
  if (!actions.length) return null;
  return <div className="workflowDecisionArea"><div className="workflowDecisionButtons">{actions.map(({ value, label, icon: Icon }) => <button key={value} type="button" className={value === "approve" ? "workflowPrimary" : "workflowSecondary"} disabled={state.kind === "loading"} onClick={() => void decide(value)}><Icon size={17} /> {label}</button>)}</div><SubmitNotice state={state} /></div>;
}

const ROLE_LABEL: Record<InstitutionalRole, string> = { administrator: "Administrador", verifier: "Verificador", moderator: "Moderador", support: "Soporte", facility_representative: "Representante" };

export function AccountRoleEditor({ account }: { account: { userId: string; email: string; role: InstitutionalRole; status: string } }) {
  const router = useRouter();
  const [role, setRole] = useState(account.role);
  const [state, setState] = useState<NoticeState>({ kind: "idle", message: "" });

  async function save() {
    setState({ kind: "loading", message: "Guardando…" });
    try {
      await postJson("/api/team/admin/accounts", { userId: account.userId, role });
      setState({ kind: "success", message: "Rol actualizado correctamente." });
      router.refresh();
    } catch (error) {
      setState({ kind: "error", message: error instanceof Error ? error.message : "No se pudo actualizar." });
    }
  }

  async function toggleStatus() {
    const next = account.status === "active" ? "suspended" : "active";
    setState({ kind: "loading", message: "Guardando…" });
    try {
      await postJson("/api/team/admin/accounts", { userId: account.userId, status: next });
      setState({ kind: "success", message: next === "active" ? "Acceso reactivado." : "Acceso suspendido." });
      router.refresh();
    } catch (error) {
      setState({ kind: "error", message: error instanceof Error ? error.message : "No se pudo actualizar." });
    }
  }

  const isSuspended = account.status !== "active";

  return (
    <article className={`workflowAccountRow ${isSuspended ? "isSuspended" : ""}`}>
      <div className="accountRowHeader">
        <div className="accountAvatarMini" aria-hidden="true">
          <UserRound size={18} />
        </div>
        <div className="accountInfo">
          <strong className="accountEmailText">{account.email}</strong>
          <span className={`accountStatusBadge ${isSuspended ? "isSuspended" : "isActive"}`}>
            <span className="statusDot" aria-hidden="true" />
            {isSuspended ? "Acceso suspendido" : "Acceso activo"}
          </span>
        </div>
      </div>

      <div className="accountRowControls">
        <div className="roleSelectWrapper">
          <span className="srOnly">Rol asignado a {account.email}</span>
          <select
            className="roleSelect"
            value={role}
            onChange={(event) => setRole(event.target.value as InstitutionalRole)}
            aria-label={`Rol institucional de ${account.email}`}
          >
            {Object.entries(ROLE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="workflowRowActions">
          <button
            type="button"
            className="workflowButtonSave"
            onClick={() => void save()}
            disabled={state.kind === "loading" || role === account.role}
            title={role === account.role ? "El rol no ha cambiado" : "Guardar nuevo rol"}
          >
            <ShieldCheck size={16} /> Guardar rol
          </button>
          <button
            type="button"
            className={`workflowButtonToggle ${isSuspended ? "isReactivate" : "isSuspend"}`}
            onClick={() => void toggleStatus()}
            disabled={state.kind === "loading"}
          >
            {isSuspended ? "Reactivar" : "Suspender"}
          </button>
        </div>
      </div>

      <SubmitNotice state={state} />
    </article>
  );
}

export function InstitutionalRoleAssignmentForm() {
  const router = useRouter();
  const [state, setState] = useState<NoticeState>({ kind: "idle", message: "" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setState({ kind: "loading", message: "Asignando función…" });
    try {
      await postJson("/api/team/admin/accounts", { email: String(data.get("email") || ""), role: data.get("role") });
      form.reset();
      setState({ kind: "success", message: "Función institucional asignada con éxito." });
      router.refresh();
    } catch (error) {
      setState({ kind: "error", message: error instanceof Error ? error.message : "No se pudo asignar." });
    }
  }

  return (
    <form className="workflowAssignmentForm" onSubmit={submit}>
      <label className="workflowField">
        <span className="fieldLabel">
          <Mail size={15} aria-hidden="true" />
          <strong>Correo de la cuenta registrada</strong>
        </span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="ejemplo@correo.com"
          className="workflowInput"
        />
      </label>

      <label className="workflowField">
        <span className="fieldLabel">
          <UserCheck size={15} aria-hidden="true" />
          <strong>Función o rol</strong>
        </span>
        <select name="role" defaultValue="verifier" className="workflowInput">
          <option value="verifier">Verificador</option>
          <option value="moderator">Moderador</option>
          <option value="support">Soporte</option>
          <option value="administrator">Administrador</option>
        </select>
      </label>

      <button className="workflowPrimary workflowSubmitBtn" disabled={state.kind === "loading"}>
        <ShieldCheck size={18} />
        {state.kind === "loading" ? "Asignando…" : "Asignar función"}
      </button>

      <SubmitNotice state={state} />
    </form>
  );
}

export function WorkflowStatus({ status }: { status: string }) {
  const label: Record<string, string> = {
    pending: "Pendiente",
    verified: "Verificado",
    active: "Activo",
    suspended: "Suspendido",
    disputed: "En revisión",
    rejected: "Rechazado",
    revoked: "Revocado",
    expired: "Vencido"
  };

  return (
    <span className={`workflowStatus is-${status}`}>
      <Clock3 size={14} aria-hidden="true" />
      {label[status] || status}
    </span>
  );
}


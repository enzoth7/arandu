"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Eye, EyeOff, LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AcademicPrototypeNotice } from "./AcademicPrototypeNotice";

import type { FacilityOption } from "../../lib/role-workflows-db";

type AccountAccessMode = "login" | "register" | "recover" | "password" | "reset";

type AccountAccessProps = {
  mode: AccountAccessMode;
  next?: string;
  invalidLink?: boolean;
  facilities?: FacilityOption[];
};

const CONTENT: Record<AccountAccessMode, { title: string; lead: string; submit: string; busy: string }> = {
  login: {
    title: "Iniciar sesión",
    lead: "Ingresá con el correo y la contraseña de tu cuenta de Arandú.",
    submit: "Iniciar sesión",
    busy: "Ingresando…",
  },
  register: {
    title: "Crear una cuenta",
    lead: "Elegí cómo vas a participar y completá tus datos de contacto.",
    submit: "Enviar enlace de confirmación",
    busy: "Enviando enlace…",
  },
  recover: {
    title: "Recuperar contraseña",
    lead: "Te enviaremos un enlace para que puedas elegir una contraseña nueva.",
    submit: "Enviar enlace",
    busy: "Enviando…",
  },
  password: {
    title: "Crear contraseña",
    lead: "Tu correo ya fue confirmado. Elegí la contraseña que vas a usar para iniciar sesión.",
    submit: "Guardar contraseña",
    busy: "Guardando…",
  },
  reset: {
    title: "Nueva contraseña",
    lead: "Elegí una contraseña nueva para recuperar el acceso a tu cuenta.",
    submit: "Guardar contraseña",
    busy: "Guardando…",
  },
};

export function AccountAccess({ mode, next = "/cuenta", invalidLink = false, facilities = [] }: AccountAccessProps) {
  const router = useRouter();
  const copy = CONTENT[mode];
  const isRegister = mode === "register";
  const isPasswordSetup = mode === "password" || mode === "reset";
  const requiresTerms = mode === "register" || mode === "password";
  const needsEmail = !isPasswordSetup;
  const needsPassword = mode === "login" || isPasswordSetup;

  const [selectedType, setSelectedType] = useState<"personal" | "elepem" | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | "">("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [facilitySearch, setFacilitySearch] = useState("");

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(invalidLink ? "El enlace no es válido, venció o ya fue utilizado." : "");
  const [submitting, setSubmitting] = useState(false);

  const departments = Array.from(new Set(facilities.map((f) => f.department).filter(Boolean))).sort();
  const filteredFacilities = facilities.filter((f) => {
    const matchDept = !departmentFilter || f.department === departmentFilter;
    const q = facilitySearch.trim().toLowerCase();
    const matchSearch = !q || f.name.toLowerCase().includes(q) || (f.locality || "").toLowerCase().includes(q);
    return matchDept && matchSearch;
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (isRegister || isPasswordSetup) {
      if (!firstName.trim() || !lastName.trim()) {
        setError(selectedType === "elepem" ? "Por favor ingresá el nombre y apellido del representante." : "Por favor ingresá tu nombre y apellido.");
        return;
      }
      if (!phone.trim() || phone.trim().length < 6) {
        setError("Por favor ingresá un teléfono de contacto válido.");
        return;
      }
      if (isRegister && selectedType === "elepem" && !selectedFacilityId) {
        setError("Por favor seleccioná el ELEPEM que representás.");
        return;
      }
    }

    if (requiresTerms && !termsAccepted) {
      setError("Por favor leé y aceptá nuestros Términos y Condiciones antes de continuar.");
      return;
    }
    if (isPasswordSetup && password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setSubmitting(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login"
        : mode === "register" ? "/api/auth/register"
          : mode === "recover" ? "/api/auth/recover"
            : "/api/auth/password";

      const payload = mode === "register"
        ? {
            email,
            firstName,
            lastName,
            phone,
            accountType: selectedType || "personal",
            facilityId: selectedType === "elepem" ? Number(selectedFacilityId) : undefined,
            termsAccepted,
          }
        : mode === "password"
          ? { password, firstName, lastName, phone, termsAccepted }
          : { email, password };


      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null) as { message?: string; error?: string } | null;
      if (!response.ok) {
        setError(result?.error || "No se pudo completar la operación.");
        return;
      }
      if (mode === "password" && termsAccepted) {
        await fetch("/api/account/terms/accept", { method: "POST" }).catch(() => {});
      }
      if (mode === "login" || isPasswordSetup) {
        router.replace(next);
        router.refresh();
        return;
      }
      setMessage(result?.message || "Revisá tu correo para confirmar tu cuenta.");
      setEmail("");
      setFirstName("");
      setLastName("");
      setPhone("");
      setSelectedFacilityId("");
      setTermsAccepted(false);
    } catch {
      setError("No pudimos conectarnos. Volvé a intentarlo.");
    } finally {
      setSubmitting(false);
    }
  }

  // Step 1 of registration: Two floating cards in the air
  if (isRegister && selectedType === null && !message) {
    return <main className="accessGate">
      <div className="accessGateContent">
        <AcademicPrototypeNotice />
        <div className="accessGatePanel isLogin">
          <Image src="/arandu-mark.svg" alt="Arandú" className="accessGateLogo isOrganization" width={160} height={160} priority />
          <h1>Registrarte</h1>
          <p className="accessGateLead">Elegí el tipo de cuenta que querés crear.</p>

          <div className="registerTypeCards">
            <button
              type="button"
              className="registerTypeCard"
              onClick={() => setSelectedType("personal")}
            >
              <div className="registerTypeIcon"><UserRound size={30} /></div>
              <strong>Persona</strong>
              <span>Cuenta personal</span>
            </button>

            <button
              type="button"
              className="registerTypeCard"
              onClick={() => setSelectedType("elepem")}
            >
              <div className="registerTypeIcon"><Building2 size={30} /></div>
              <strong>ELEPEM</strong>
              <span>Representante</span>
            </button>
          </div>

          <div className="accessInlineLinks">
            <Link href="/iniciar-sesion">Ya tengo una cuenta</Link>
          </div>
          <Link className="accessLoginBack" href="/">
            <ArrowLeft size={17} aria-hidden="true" />Volver al sitio público
          </Link>
        </div>
      </div>
    </main>;
  }

  // Step 2 of registration (or login / recovery / password setup)
  return <main className="accessGate">
    <div className="accessGateContent">
      <AcademicPrototypeNotice />
      <div className="accessGatePanel isLogin">
        <Image src="/arandu-mark.svg" alt="Arandú" className="accessGateLogo isOrganization" width={160} height={160} priority />
        
        {isRegister && (
          <button type="button" className="registerBackStep" onClick={() => { setSelectedType(null); setMessage(""); setError(""); }}>
            <ArrowLeft size={16} /> Cambiar a {selectedType === "elepem" ? "Persona" : "ELEPEM"}
          </button>
        )}

        <h1>{isRegister ? (selectedType === "elepem" ? "Registro de ELEPEM" : "Registro de persona") : copy.title}</h1>
        <p className="accessGateLead">{isRegister ? "Completá tus datos de contacto para continuar." : copy.lead}</p>
        
        <form className="organizationLoginForm" onSubmit={submit}>
          {(isRegister || isPasswordSetup) && (
            <div className="accountFormRow2">
              <label htmlFor="register-firstname">
                <span>{selectedType === "elepem" ? "Nombre del representante" : "Nombre"}</span>
                <div className="accessInput">
                  <UserRound size={19} aria-hidden="true" />
                  <input
                    id="register-firstname"
                    type="text"
                    placeholder="Tu nombre"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    autoComplete="given-name"
                    required
                    autoFocus
                  />
                </div>
              </label>
              <label htmlFor="register-lastname">
                <span>{selectedType === "elepem" ? "Apellido del representante" : "Apellido"}</span>
                <div className="accessInput">
                  <UserRound size={19} aria-hidden="true" />
                  <input
                    id="register-lastname"
                    type="text"
                    placeholder="Tu apellido"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    autoComplete="family-name"
                    required
                  />
                </div>
              </label>
            </div>
          )}

          {isRegister && selectedType === "elepem" && (
            <div className="registerFacilityGroup">
              <div className="accountFormRow2">
                <label htmlFor="register-dept">
                  <span>Filtro por departamento</span>
                  <div className="accessInput">
                    <select
                      id="register-dept"
                      value={departmentFilter}
                      onChange={(e) => {
                        setDepartmentFilter(e.target.value);
                        setFacilitySearch("");
                      }}
                      className="accessSelect"
                    >
                      <option value="">Todos los departamentos</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </label>

                <label htmlFor="register-search">
                  <span>Buscar ELEPEM</span>
                  <div className="accessInput">
                    <input
                      id="register-search"
                      type="search"
                      placeholder="Nombre o localidad…"
                      value={facilitySearch}
                      onChange={(e) => setFacilitySearch(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                </label>
              </div>

              <label htmlFor="register-facility">
                <span>ELEPEM que representás *</span>
                <div className="accessInput">
                  <Building2 size={19} aria-hidden="true" />
                  <select
                    id="register-facility"
                    value={selectedFacilityId}
                    onChange={(e) => setSelectedFacilityId(Number(e.target.value) || "")}
                    required
                    className="accessSelect"
                  >
                    <option value="" disabled>Seleccionar ELEPEM ({filteredFacilities.length} disponibles)</option>
                    {filteredFacilities.map((facility) => (
                      <option key={facility.id} value={facility.id}>
                        {facility.name} · {facility.locality || facility.department}
                      </option>
                    ))}
                  </select>
                </div>
                {filteredFacilities.length === 0 && (
                  <small className="accessFieldHint isWarning">No se encontraron ELEPEM con ese filtro de búsqueda.</small>
                )}
              </label>
            </div>
          )}

          {needsEmail && <label htmlFor={`${mode}-email`}>
            <span>{mode === "login" ? "Correo o usuario de transición" : "Correo electrónico"}</span>
            <div className="accessInput">
              <Mail size={19} aria-hidden="true" />
              <input
                id={`${mode}-email`}
                type={mode === "login" ? "text" : "email"}
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete={mode === "login" ? "username" : "email"}
                required
                autoFocus={!isRegister && !isPasswordSetup}
              />
            </div>
          </label>}

          {(isRegister || isPasswordSetup) && (
            <label htmlFor="register-phone">
              <span>Teléfono de contacto</span>
              <div className="accessInput">
                <Phone size={19} aria-hidden="true" />
                <input
                  id="register-phone"
                  type="tel"
                  placeholder="099 123 456"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  autoComplete="tel"
                  required
                />
              </div>
            </label>
          )}


          {needsPassword && <label htmlFor={`${mode}-password`}>
            <span>{isPasswordSetup ? "Nueva contraseña" : "Contraseña"}</span>
            <div className="accessInput"><LockKeyhole size={19} aria-hidden="true" /><input id={`${mode}-password`} type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} maxLength={128} required autoFocus={!needsEmail} /><button className="accessPasswordToggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}</button></div>
            {isPasswordSetup && <small className="accessFieldHint">Usá al menos 8 caracteres.</small>}
          </label>}
          {isPasswordSetup && <label htmlFor="password-confirmation">
            <span>Repetir contraseña</span>
            <div className="accessInput"><LockKeyhole size={19} aria-hidden="true" /><input id="password-confirmation" type={showPassword ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required /></div>
          </label>}

          {requiresTerms && (
            <div className="termsNoticeCard">
              <label htmlFor={`${mode}-terms`} className="termsCheckboxLabel">
                <input
                  id={`${mode}-terms`}
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)}
                  required
                />
                <span>
                  Antes de continuar por favor lee nuestros{" "}
                  <Link href="/terminos" target="_blank" rel="noopener noreferrer" className="termsLink">
                    Términos y Condiciones
                  </Link>
                  , aceptalos y presiona confirmar.
                </span>
              </label>
            </div>
          )}

          {error && <p className="accessLoginError" role="alert">{error}</p>}
          {message && <p className="accessLoginSuccess" role="status" aria-live="polite">{message}</p>}
          <button className="accessLoginSubmit" type="submit" disabled={submitting || (requiresTerms && !termsAccepted)}>{submitting ? copy.busy : copy.submit}<ArrowRight size={18} aria-hidden="true" /></button>
          {mode === "login" && <div className="accessInlineLinks"><Link href="/recuperar-contrasena">Olvidé mi contraseña</Link><Link href="/registrarse">Registrarme</Link></div>}
          {(mode === "register" || mode === "recover") && <div className="accessInlineLinks"><Link href="/iniciar-sesion">Ya tengo una cuenta</Link></div>}
        </form>
        <Link className="accessLoginBack" href="/"><ArrowLeft size={17} aria-hidden="true" />Volver al sitio público</Link>
      </div>
    </div>
  </main>;
}



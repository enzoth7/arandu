"use client";

import Link from "next/link";
import {
  CalendarDays,
  Check,
  ExternalLink,
  Globe2,
  Mail,
  MapPin,
  Phone,
  Share2,
} from "lucide-react";
import { FACILITY_ATTRIBUTE_FILTER_GROUPS } from "../../lib/facility-filter-options.mjs";
import { canonicalDepartment } from "../../lib/uruguay.mjs";
import { FacilityExperiences } from "./FacilityExperiences";
import { FacilityPhotoCarousel } from "./FacilityPhotoCarousel";
import {
  facilityDisplayCategory,
  facilityDisplayLabel,
  isVerificationFacility,
} from "./facility-presentation";
import { QUALITY_RATING_LABELS, type Facility } from "./map-types";

type ContactChannelKind = "phone" | "email" | "website" | "instagram" | "facebook";

type ContactChannel = {
  kind: ContactChannelKind;
  label: string;
  value: string;
  href: string;
};

function uniqueContactValues(...sources: Array<readonly string[] | string | undefined>) {
  const values: string[] = [];
  const known = new Set<string>();
  for (const source of sources) {
    const items = Array.isArray(source) ? source : [source];
    for (const item of items) {
      if (typeof item !== "string") continue;
      const value = item.trim();
      const key = value.toLocaleLowerCase("es-UY");
      if (!value || known.has(key)) continue;
      known.add(key);
      values.push(value);
    }
  }
  return values;
}

function publicContactUrl(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function FacilityContactIcon({ kind }: { kind: ContactChannelKind }) {
  const props = { "aria-hidden": true, size: 20, strokeWidth: 2 } as const;
  if (kind === "phone") return <Phone {...props} />;
  if (kind === "email") return <Mail {...props} />;
  if (kind === "website") return <Globe2 {...props} />;
  return <Share2 {...props} />;
}

function facilityContactChannels(facility: Facility) {
  const channels: ContactChannel[] = [];
  for (const value of uniqueContactValues(facility.contactPhones, facility.contactPhone)) {
    if (/^[+()0-9\s.-]{6,32}$/.test(value)) {
      channels.push({ kind: "phone", label: "Teléfono", value, href: `tel:${value.replace(/[()\s.-]/g, "")}` });
    }
  }
  for (const value of uniqueContactValues(facility.contactEmails, facility.contactEmail)) {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      channels.push({ kind: "email", label: "Correo electrónico", value, href: `mailto:${encodeURIComponent(value)}` });
    }
  }
  for (const [kind, label, values] of [
    ["website", "Sitio web", facility.websites],
    ["instagram", "Instagram", facility.instagramUrls],
    ["facebook", "Facebook", facility.facebookUrls],
  ] as const) {
    for (const value of uniqueContactValues(values)) {
      const href = publicContactUrl(value);
      if (href) channels.push({ kind, label, value, href });
    }
  }
  return channels;
}

function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  return new Intl.DateTimeFormat("es-UY", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: isDateOnly ? "UTC" : "America/Montevideo",
  }).format(date);
}

function badgeTone(facility: Facility) {
  const category = facilityDisplayCategory(facility);
  if (category === "demo") return "violet";
  if (category === "habilitado") return "green";
  if (category === "mides") return "amber";
  return "gray";
}

export function FacilityMembershipBadges({ facility }: { facility: Facility }) {
  const badges = [
    facility.mspFinal && { label: "Habilitación MSP", tone: "green" },
    facility.midesSocial && { label: "Certificado social MIDES", tone: "amber" },
  ].filter(Boolean) as { label: string; tone: string }[];
  const primaryBadge = isVerificationFacility(facility);

  return <span className="facilityBadges" aria-label="Situaciones institucionales">
    {primaryBadge ? (
      <span className={`sourceBadge sourceBadge-${badgeTone(facility)}`}>{facilityDisplayLabel(facility)}</span>
    ) : badges.map((badge) => (
      <span className={`sourceBadge sourceBadge-${badge.tone}`} key={badge.label}>{badge.label}</span>
    ))}
  </span>;
}

export function FacilityPrimaryStatusBadge({ facility }: { facility: Facility }) {
  const status = facility.mspFinal
    ? { label: "Habilitación MSP", tone: "green" }
    : facility.midesSocial
      ? { label: "Certificado social MIDES", tone: "amber" }
      : { label: "Situación no confirmada", tone: "gray" };

  return <span className="facilityBadges" aria-label="Situación institucional">
    <span className={`sourceBadge sourceBadge-${status.tone}`}>{status.label}</span>
  </span>;
}

export function FacilityQualityBadge({ facility }: { facility: Facility }) {
  const rating = facility.qualityRating ?? "unrated";
  const label = facility.qualityRating ? QUALITY_RATING_LABELS[facility.qualityRating] : "Sin calificar";
  return <span className={`qualityRatingBadge qualityRatingBadge-${rating}`}>{label}</span>;
}

function FacilityContactChannels({ facility }: { facility: Facility }) {
  const channels = facilityContactChannels(facility);
  if (!channels.length) return null;

  return <section className="facilityProfileSection" aria-labelledby="facility-contact-channels-title">
    <h2 id="facility-contact-channels-title">Contacto</h2>
    <ul className="facilityContactChannelList">
      {channels.map((channel) => {
        const isExternal = ["website", "instagram", "facebook"].includes(channel.kind);
        return <li key={`${channel.kind}:${channel.href}`}>
          <a
            href={channel.href}
            aria-label={`${channel.label}: ${channel.value}`}
            {...(isExternal ? { target: "_blank", rel: "noreferrer" } : {})}
          >
            <span className="facilityContactChannelIcon"><FacilityContactIcon kind={channel.kind} /></span>
            <span><small>{channel.label}</small><strong>{channel.value}</strong></span>
          </a>
        </li>;
      })}
    </ul>
  </section>;
}

function FacilityAttributes({ facility }: { facility: Facility }) {
  const groups = FACILITY_ATTRIBUTE_FILTER_GROUPS.flatMap((group) => {
    const values = facility[group.key as keyof Facility];
    if (!Array.isArray(values) || values.length === 0) return [];
    const selected = new Set(values as string[]);
    const labels = group.options.filter(([value]) => selected.has(value)).map(([, label]) => label);
    return labels.length ? [{ key: group.key, label: group.label, labels }] : [];
  });

  return <section className="facilityProfileSection" aria-labelledby="facility-attributes-title">
    <h2 id="facility-attributes-title">Servicios y características</h2>
    {groups.length ? <div className="facilityAttributeGroups">
      {groups.map((group) => <section key={group.key}>
        <h3>{group.label}</h3>
        <ul>{group.labels.map((label) => <li key={label}><Check size={17} aria-hidden="true" />{label}</li>)}</ul>
      </section>)}
    </div> : <p className="facilityProfileMissing">Sin información verificada sobre servicios y características.</p>}
  </section>;
}

function FacilitySources({ facility }: { facility: Facility }) {
  const updatedAt = formatDate(facility.updatedAt);
  return <section className="facilityProfileSection facilityProfileSources" aria-labelledby="facility-sources-title">
    <h2 id="facility-sources-title">Fuentes</h2>
    {facility.sourceLinks?.length ? <ul>
      {facility.sourceLinks.map((source) => {
        const sourceDate = formatDate(source.sourceDate);
        const retrievedAt = formatDate(source.retrievedAt);
        return <li key={`${source.label}:${source.url}`}>
          <a href={source.url} target="_blank" rel="noreferrer">
            {source.label}<ExternalLink size={16} aria-hidden="true" />
          </a>
          {(sourceDate || retrievedAt) && <p>
            {sourceDate ? `Fecha de la fuente: ${sourceDate}` : `Consultada: ${retrievedAt}`}
          </p>}
        </li>;
      })}
    </ul> : <p className="facilityProfileMissing">La referencia está conservada, pero no tiene una URL pública disponible.</p>}
    {updatedAt && <p className="facilityProfileUpdated"><CalendarDays size={16} aria-hidden="true" />Ficha actualizada el {updatedAt}</p>}
  </section>;
}

export function FacilityProfile({ facility }: { facility: Facility }) {
  const photoUrls = facility.photoUrls?.length
    ? facility.photoUrls
    : facility.photoUrl
      ? [facility.photoUrl]
      : [];
  const priceDate = formatDate(facility.monthlyPriceAsOf);

  return <>
    <div className="facilityProfileLead">
      <div className="facilityProfileMedia">
        {photoUrls.length
          ? <FacilityPhotoCarousel facilityName={facility.name} photoUrls={photoUrls} />
          : <div className="facilityProfilePhotoMissing">Foto no informada</div>}
      </div>
      <section className="facilityProfileSummary" aria-labelledby="facility-summary-title">
        <FacilityMembershipBadges facility={facility} />
        <h2 id="facility-summary-title">Información principal</h2>
        <p>{facility.description || "Sin descripción pública verificada."}</p>
        <dl className="facilityProfileFacts">
          <div>
            <dt>Precio mensual</dt>
            <dd>{facility.monthlyPriceUyu
              ? `UYU ${facility.monthlyPriceUyu.toLocaleString("es-UY")}`
              : "No informado"}</dd>
            {priceDate && <small>Vigente o registrado el {priceDate}</small>}
          </div>
          <div>
            <dt>Clasificación</dt>
            <dd><FacilityQualityBadge facility={facility} /></dd>
          </div>
        </dl>
        {facility.monthlyPriceIncludes?.length ? <p className="facilityProfileIncludes">
          <strong>El precio incluye:</strong> {facility.monthlyPriceIncludes.join(", ")}.
        </p> : null}
        <div className="facilityProfileActions">
          <Link href={`/experiencia?elepem=${encodeURIComponent(facility.id)}`}>Dejar una experiencia</Link>
          <Link href={`/preocupacion?elepem=${encodeURIComponent(facility.id)}`}>Contar una preocupación</Link>
        </div>
      </section>
    </div>

    <section className="facilityProfileSection facilityProfileLocation" aria-labelledby="facility-location-title">
      <h2 id="facility-location-title">Ubicación</h2>
      <p><MapPin size={20} aria-hidden="true" />{facility.address || "Dirección no informada"}</p>
      <p>{facility.locality || "Localidad no informada"} · {canonicalDepartment(facility.department)}</p>
      <small>Precisión: {facility.precisionLabel}</small>
    </section>

    <FacilityContactChannels facility={facility} />
    <FacilityAttributes facility={facility} />
    <div className="facilityProfileSection facilityProfileExperiences">
      <FacilityExperiences facilityId={facility.id} />
    </div>
    <FacilitySources facility={facility} />
  </>;
}

"use client";

import Link from "next/link";
import {
  Check,
  ExternalLink,
  Globe2,
  Mail,
  Phone,
  Share2,
} from "lucide-react";
import {
  FACILITY_ATTRIBUTE_FILTER_GROUPS,
  facilityMatchesAttributeFilter,
} from "../../lib/facility-filter-options.mjs";
import { FacilityExperiences } from "./FacilityExperiences";
import { FacilityPhotoCarousel } from "./FacilityPhotoCarousel";
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
    const labels = group.options
      .filter(([value]) => facilityMatchesAttributeFilter(facility, group.key, value))
      .map(([, label]) => label);
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
  </section>;
}

export function FacilityProfile({
  facility,
  showSources = true,
  visitAgendaAvailable = false,
}: {
  facility: Facility;
  showSources?: boolean;
  visitAgendaAvailable?: boolean;
}) {
  const photoUrls = facility.photoUrls?.length
    ? facility.photoUrls
    : facility.photoUrl
      ? [facility.photoUrl]
      : [];
  return <div className="facilityProfileShell">
    <div className="facilityProfileLead">
      <div className="facilityProfileMedia">
        {photoUrls.length
          ? <FacilityPhotoCarousel facilityName={facility.name} photoUrls={photoUrls} />
          : <div className="facilityProfilePhotoMissing">Foto no informada</div>}
      </div>
      <section className="facilityProfileSummary" aria-labelledby="facility-summary-title">
        <h2 id="facility-summary-title">Información principal</h2>
        {facility.description && <p>{facility.description}</p>}
        <dl className="facilityProfileFacts">
          <div>
            <dt>Precio mensual</dt>
            <dd className="facilityFactPrice">{facility.monthlyPriceUyu
              ? `UYU ${facility.monthlyPriceUyu.toLocaleString("es-UY")}`
              : "No informado"}</dd>
          </div>
          <div>
            <dt>Clasificación</dt>
            <dd><FacilityQualityBadge facility={facility} /></dd>
          </div>
          <div>
            <dt>Habilitación</dt>
            <dd><FacilityPrimaryStatusBadge facility={facility} /></dd>
          </div>
        </dl>
        <div className={`facilityProfileActions ${visitAgendaAvailable ? "" : "isSingle"}`}>
          {visitAgendaAvailable && <Link href={`/cuenta/visitas/nueva?elepem=${facility.registryId}`}>Agendar una visita</Link>}
          <Link href={`/experiencia?elepem=${encodeURIComponent(facility.id)}`}>Dejar una experiencia</Link>
        </div>
      </section>
    </div>

    <FacilityContactChannels facility={facility} />
    <FacilityAttributes facility={facility} />
    <div className="facilityProfileSection facilityProfileExperiences">
      <FacilityExperiences facilityId={facility.id} />
    </div>
    {showSources && <FacilitySources facility={facility} />}
  </div>;
}

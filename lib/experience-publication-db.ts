import type { PoolClient } from "pg";
import type { ExperiencePreviewInput } from "./experience-publications.mjs";
import { withSupabaseTransaction } from "./supabase-db";
import type { ExperiencePublicationSummary } from "./institutional-types";

type ReportRow = {
  id: string;
  entry_type: string;
  is_demo: boolean;
  facility_id: string | null;
  demo_facility_id: string | null;
  payload_version: number;
  report_payload: Record<string, unknown>;
};

type PublicationRow = {
  id: string;
  status: "draft" | "published" | "withdrawn";
  public_body: string;
  public_relationship: string | null;
  public_period: string | null;
  published_at: Date | string | null;
};

type EligibleReportRow = ReportRow & (
  | { facility_id: string; demo_facility_id: null }
  | { facility_id: null; demo_facility_id: string }
);

export class ExperiencePublicationWorkflowError extends Error {
  constructor(
    public readonly status: 400 | 404 | 409,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ExperiencePublicationWorkflowError";
  }
}

function publicationSummary(row: PublicationRow): ExperiencePublicationSummary {
  return {
    id: row.id,
    status: row.status,
    publicBody: row.public_body,
    publicRelationship: row.public_relationship,
    publicPeriod: row.public_period,
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
  };
}

async function loadEligibleReport(
  client: PoolClient,
  reportId: string,
): Promise<EligibleReportRow> {
  const result = await client.query<ReportRow>(
    `SELECT id, entry_type, is_demo, facility_id::text, demo_facility_id,
            payload_version, report_payload
     FROM public.intake_reports
     WHERE id = $1
     FOR UPDATE`,
    [reportId],
  );
  const report = result.rows[0];
  if (!report) {
    throw new ExperiencePublicationWorkflowError(404, "report_not_found", "No se encontro la experiencia.");
  }
  if (!report.is_demo || report.entry_type !== "experience") {
    throw new ExperiencePublicationWorkflowError(400, "not_demo_experience", "El expediente no es una experiencia de demostracion.");
  }
  if (Boolean(report.facility_id) === Boolean(report.demo_facility_id)) {
    throw new ExperiencePublicationWorkflowError(409, "facility_not_resolved", "La experiencia no tiene un unico ELEPEM vinculado.");
  }
  const reportPayloadVersion = Number(report.report_payload?.version);
  const payloadAllowsPublication = reportPayloadVersion === 5 || reportPayloadVersion === 4;
  if (
    report.payload_version !== 3
    || !payloadAllowsPublication
    || report.report_payload?.requestedDestination !== "consider_anonymized"
    || report.report_payload?.publicationConsent !== true
  ) {
    throw new ExperiencePublicationWorkflowError(
      409,
      "publication_not_authorized",
      "La persona no autorizo una publicacion anonimizada en la ficha.",
    );
  }
  return report as EligibleReportRow;
}

function previewForReport(report: EligibleReportRow, preview: ExperiencePreviewInput): ExperiencePreviewInput {
  return Number(report.report_payload?.version) === 5
    ? { ...preview, publicPeriod: null }
    : preview;
}

async function recordStateEvent(client: PoolClient, input: {
  reportId: string;
  status: "in_review" | "resolved" | "closed";
  title: string;
  description: string;
  reviewer: string;
  publicationId: string;
  facilityId: string | null;
  demoFacilityId: string | null;
  decision: string;
  preview?: ExperiencePreviewInput;
  internalNote?: string | null;
}) {
  await client.query(
    `INSERT INTO public.intake_report_events (
       report_id, status, public_title, public_description, internal_note, event_data, actor
     ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'state')`,
    [
      input.reportId,
      input.status,
      input.title,
      input.description,
      input.internalNote || null,
      JSON.stringify({
        decision: input.decision,
        publicationId: input.publicationId,
        facilityId: input.facilityId,
        demoFacilityId: input.demoFacilityId,
        reviewer: input.reviewer,
        ...(input.preview ? { preview: input.preview } : {}),
      }),
    ],
  );
}

function reviewerIdentifier(value: string) {
  const reviewer = String(value || "").trim().slice(0, 200);
  if (!reviewer) throw new Error("Missing state reviewer identity");
  return reviewer;
}

export async function saveExperiencePublicationPreview(input: {
  reportId: string;
  reviewer: string;
  preview: ExperiencePreviewInput;
}): Promise<ExperiencePublicationSummary> {
  return withSupabaseTransaction(async (client) => {
    const reviewer = reviewerIdentifier(input.reviewer);
    const report = await loadEligibleReport(client, input.reportId);
    const preview = previewForReport(report, input.preview);
    const result = await client.query<PublicationRow>(
      `INSERT INTO elepem_core.facility_experience_publications AS publication (
         report_id, facility_id, demo_facility_id, public_body, public_relationship, public_period,
         reviewer_identifier, status, previewed_at
       ) VALUES ($1, $2::bigint, $3, $4, $5, $6, $7, 'draft', now())
       ON CONFLICT (report_id) DO UPDATE SET
         public_body = EXCLUDED.public_body,
         public_relationship = EXCLUDED.public_relationship,
         public_period = EXCLUDED.public_period,
         reviewer_identifier = EXCLUDED.reviewer_identifier,
         previewed_at = now()
       WHERE publication.status = 'draft'
       RETURNING id, status, public_body, public_relationship, public_period, published_at`,
      [
        report.id,
        report.facility_id,
        report.demo_facility_id,
        preview.publicBody,
        preview.publicRelationship,
        preview.publicPeriod,
        reviewer,
      ],
    );
    const publication = result.rows[0];
    if (!publication) {
      throw new ExperiencePublicationWorkflowError(
        409,
        "publication_not_editable",
        "Una publicacion publicada o retirada no puede editarse como vista previa.",
      );
    }
    await client.query(
      `UPDATE public.intake_reports SET current_status = 'in_review', updated_at = now()
       WHERE id = $1`,
      [report.id],
    );
    await recordStateEvent(client, {
      reportId: report.id,
      status: "in_review",
      title: "Vista previa anonimizada guardada",
      description: "El equipo preparo una version publica; todavia no fue publicada.",
      reviewer,
      publicationId: publication.id,
      facilityId: report.facility_id,
      demoFacilityId: report.demo_facility_id,
      decision: "experience_public_preview_saved",
      preview,
    });
    return publicationSummary(publication);
  });
}

export async function publishExperiencePublication(input: {
  reportId: string;
  reviewer: string;
  preview?: ExperiencePreviewInput;
}): Promise<{ publication: ExperiencePublicationSummary; alreadyPublished: boolean }> {
  return withSupabaseTransaction(async (client) => {
    const reviewer = reviewerIdentifier(input.reviewer);
    const report = await loadEligibleReport(client, input.reportId);
    const preview = input.preview ? previewForReport(report, input.preview) : undefined;
    const existing = await client.query<PublicationRow>(
      `SELECT id, status, public_body, public_relationship, public_period, published_at
       FROM elepem_core.facility_experience_publications
       WHERE report_id = $1
         AND facility_id IS NOT DISTINCT FROM $2::bigint
         AND demo_facility_id IS NOT DISTINCT FROM $3
       FOR UPDATE`,
      [report.id, report.facility_id, report.demo_facility_id],
    );
    let publication = existing.rows[0];
    if (!publication) {
      if (!preview) {
        throw new ExperiencePublicationWorkflowError(409, "preview_required", "Falta el texto moderado que se publicará.");
      }
      const inserted = await client.query<PublicationRow>(
        `INSERT INTO elepem_core.facility_experience_publications (
           report_id, facility_id, demo_facility_id, public_body, public_relationship, public_period,
           reviewer_identifier, status, previewed_at
         ) VALUES ($1, $2::bigint, $3, $4, $5, $6, $7, 'draft', now())
         RETURNING id, status, public_body, public_relationship, public_period, published_at`,
        [
          report.id,
          report.facility_id,
          report.demo_facility_id,
          preview.publicBody,
          preview.publicRelationship,
          preview.publicPeriod,
          reviewer,
        ],
      );
      publication = inserted.rows[0];
    }
    if (publication.status === "published") {
      return { publication: publicationSummary(publication), alreadyPublished: true };
    }
    if (publication.status !== "draft") {
      throw new ExperiencePublicationWorkflowError(409, "publication_withdrawn", "Una experiencia retirada no puede volver a publicarse automaticamente.");
    }
    if (preview) {
      const refreshed = await client.query<PublicationRow>(
        `UPDATE elepem_core.facility_experience_publications
         SET public_body = $2, public_relationship = $3, public_period = $4,
             reviewer_identifier = $5, previewed_at = now()
         WHERE id = $1 AND status = 'draft'
         RETURNING id, status, public_body, public_relationship, public_period, published_at`,
        [
          publication.id,
          preview.publicBody,
          preview.publicRelationship,
          preview.publicPeriod,
          reviewer,
        ],
      );
      publication = refreshed.rows[0] || publication;
    }
    const updated = await client.query<PublicationRow>(
      `UPDATE elepem_core.facility_experience_publications
       SET status = 'published', published_at = now(), withdrawn_at = null,
           withdrawal_reason = null, reviewer_identifier = $2
       WHERE id = $1 AND status = 'draft'
       RETURNING id, status, public_body, public_relationship, public_period, published_at`,
      [publication.id, reviewer],
    );
    const published = updated.rows[0];
    if (!published) {
      throw new ExperiencePublicationWorkflowError(409, "publication_changed", "La vista previa cambio mientras se procesaba la decision.");
    }
    await client.query(
      `UPDATE public.intake_reports SET current_status = 'resolved', updated_at = now()
       WHERE id = $1`,
      [report.id],
    );
    await recordStateEvent(client, {
      reportId: report.id,
      status: "resolved",
      title: "Experiencia anonimizada publicada",
      description: "El Estado aprobo una version anonimizada para la ficha del ELEPEM.",
      reviewer,
      publicationId: published.id,
      facilityId: report.facility_id,
      demoFacilityId: report.demo_facility_id,
      decision: "experience_published",
      preview,
    });
    return { publication: publicationSummary(published), alreadyPublished: false };
  });
}

export async function withdrawExperiencePublication(input: {
  reportId: string;
  reviewer: string;
  reason: string | null;
}): Promise<{ publication: ExperiencePublicationSummary; alreadyWithdrawn: boolean }> {
  return withSupabaseTransaction(async (client) => {
    const reviewer = reviewerIdentifier(input.reviewer);
    const withdrawalReason = input.reason || "Retirada por revision estatal.";
    const report = await loadEligibleReport(client, input.reportId);
    const existing = await client.query<PublicationRow>(
      `SELECT id, status, public_body, public_relationship, public_period, published_at
       FROM elepem_core.facility_experience_publications
       WHERE report_id = $1
         AND facility_id IS NOT DISTINCT FROM $2::bigint
         AND demo_facility_id IS NOT DISTINCT FROM $3
       FOR UPDATE`,
      [report.id, report.facility_id, report.demo_facility_id],
    );
    const publication = existing.rows[0];
    if (!publication) {
      throw new ExperiencePublicationWorkflowError(404, "publication_not_found", "No se encontro una publicacion para retirar.");
    }
    if (publication.status === "withdrawn") {
      return { publication: publicationSummary(publication), alreadyWithdrawn: true };
    }
    if (publication.status !== "published") {
      throw new ExperiencePublicationWorkflowError(409, "publication_not_published", "La experiencia todavia no esta publicada.");
    }
    const updated = await client.query<PublicationRow>(
      `UPDATE elepem_core.facility_experience_publications
       SET status = 'withdrawn', withdrawn_at = now(), withdrawal_reason = $2,
           reviewer_identifier = $3
       WHERE id = $1 AND status = 'published'
       RETURNING id, status, public_body, public_relationship, public_period, published_at`,
      [publication.id, withdrawalReason, reviewer],
    );
    const withdrawn = updated.rows[0];
    if (!withdrawn) {
      throw new ExperiencePublicationWorkflowError(409, "publication_changed", "La publicacion cambio mientras se procesaba la decision.");
    }
    await client.query(
      `UPDATE public.intake_reports SET current_status = 'closed', updated_at = now()
       WHERE id = $1`,
      [report.id],
    );
    await recordStateEvent(client, {
      reportId: report.id,
      status: "closed",
      title: "Experiencia retirada de la ficha",
      description: "La version anonimizada dejo de mostrarse publicamente.",
      reviewer,
      publicationId: withdrawn.id,
      facilityId: report.facility_id,
      demoFacilityId: report.demo_facility_id,
      decision: "experience_withdrawn",
      internalNote: withdrawalReason,
    });
    return { publication: publicationSummary(withdrawn), alreadyWithdrawn: false };
  });
}

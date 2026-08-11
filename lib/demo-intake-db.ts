import { newCaseCode, newUploadToken } from "./intake-report.mjs";
import { withSupabaseTransaction } from "./supabase-db";
import type { IntakeKind, SubmittedActor } from "./institutional-types";

type Contact = { name: string | null; phone: string | null; email: string | null } | null;

export async function insertDemoIntake(input: {
  kind: IntakeKind;
  submittedActor: SubmittedActor;
  demoFacilityId?: string | null;
  facilityId?: number | null;
  payloadVersion?: 2 | 3;
  priority?: "Alta" | "Media" | "Baja";
  department?: string | null;
  payload: Record<string, unknown>;
  contact?: Contact;
}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const caseCode = newCaseCode();
    const uploadToken = newUploadToken();
    const result = await withSupabaseTransaction(async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO public.intake_reports (
           case_code, source, priority, department, report_payload,
           entry_type, is_demo, demo_facility_id, facility_id, payload_version, submitted_actor
         ) VALUES ($1, 'web', $2, $3, $4::jsonb, $5, true, $6, $7, $8, $9)
         ON CONFLICT (case_code) DO NOTHING
         RETURNING id`,
        [
          caseCode,
          input.priority || "Baja",
          input.department || null,
          JSON.stringify({ ...input.payload, evidenceUploadToken: uploadToken }),
          input.kind,
          input.demoFacilityId || null,
          input.facilityId || null,
          input.payloadVersion || 2,
          input.submittedActor,
        ],
      );
      const reportId = inserted.rows[0]?.id;
      if (!reportId) return null;

      if (input.contact) {
        await client.query(
          `INSERT INTO public.intake_report_contacts (report_id, name, phone, email)
           VALUES ($1, $2, $3, $4)`,
          [reportId, input.contact.name, input.contact.phone, input.contact.email],
        );
      }
      return { reportId };
    });
    if (result) return { ...result, caseCode, uploadToken };
  }
  throw new Error("case-code-exhausted");
}

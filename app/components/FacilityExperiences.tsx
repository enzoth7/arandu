"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

const PAGE_SIZE = 5;

type PublicExperience = {
  id: string;
  body: string;
  relationship: string | null;
  period: string | null;
  publishedAt: string | null;
  kind: "residential" | "visit";
  perspective: "resident" | "family" | "visitor" | null;
};

type ExperiencePage = {
  count: number;
  items: PublicExperience[];
  nextCursor: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function firstString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function normalizeCount(value: unknown, fallback: number) {
  const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(numberValue) && numberValue >= 0 ? Math.floor(numberValue) : fallback;
}

function normalizePage(payload: unknown): ExperiencePage {
  if (!isRecord(payload)) throw new Error("La respuesta de experiencias no es válida.");

  const rawItems = Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload.experiences)
      ? payload.experiences
      : [];

  const items = rawItems.flatMap((rawItem, index): PublicExperience[] => {
    if (!isRecord(rawItem)) return [];

    const body = firstString(rawItem, ["body", "publicBody", "public_body", "text"]);
    if (!body) return [];

    const publishedAt = firstString(rawItem, ["publishedAt", "published_at"]);
    const id = firstString(rawItem, ["id", "publicationId", "publication_id"])
      ?? `experience-${index}-${publishedAt ?? "undated"}-${body.slice(0, 24)}`;

    return [{
      id,
      body,
      relationship: firstString(rawItem, ["relationship", "publicRelationship", "public_relationship"]),
      period: firstString(rawItem, ["period", "publicPeriod", "public_period"]),
      publishedAt,
      kind: rawItem.kind === "visit" ? "visit" : "residential",
      perspective: rawItem.perspective === "resident" || rawItem.perspective === "family" || rawItem.perspective === "visitor"
        ? rawItem.perspective
        : null,
    }];
  });

  return {
    count: normalizeCount(payload.count ?? payload.total, items.length),
    items,
    nextCursor: firstString(payload, ["nextCursor", "next_cursor"]),
  };
}

function mergeUnique(current: PublicExperience[], incoming: PublicExperience[]) {
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()];
}

function formatPublishedDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("es-UY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function FacilityExperiences({ facilityId }: { facilityId: string }) {
  const titleId = useId();
  const requestRef = useRef<AbortController | null>(null);
  const [items, setItems] = useState<PublicExperience[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const fetchPage = useCallback(async (cursor: string | null, replace: boolean) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    if (replace) setLoading(true);
    else setLoadingMore(true);
    setError("");

    const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (cursor) params.set("cursor", cursor);

    try {
      const response = await fetch(`/api/residenciales/${encodeURIComponent(facilityId)}/experiencias?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = isRecord(payload) && typeof payload.error === "string"
          ? payload.error
          : "No pudimos cargar las experiencias.";
        throw new Error(message);
      }

      const page = normalizePage(payload);
      setItems((current) => replace ? page.items : mergeUnique(current, page.items));
      setCount(page.count);
      setNextCursor(page.nextCursor);
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
      setError(fetchError instanceof Error ? fetchError.message : "No pudimos cargar las experiencias.");
    } finally {
      if (requestRef.current === controller) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [facilityId]);

  useEffect(() => {
    void fetchPage(null, true);
    return () => requestRef.current?.abort();
  }, [fetchPage]);

  const announcement = loading
    ? "Cargando experiencias publicadas."
    : error
      ? "No se pudieron cargar las experiencias."
      : count === 0
        ? "Todavía no hay experiencias publicadas."
        : `${count ?? items.length} experiencias publicadas.`;

  return (
    <section className="facilityExperiencesSection" aria-labelledby={titleId} aria-busy={loading || loadingMore}>
      <div className="facilityExperiencesHeader">
        <h2 id={titleId}>Experiencias {count !== null && <span>({count})</span>}</h2>
      </div>

      <p className="facilityExperiencesAnnouncement" aria-live="polite">{announcement}</p>

      {loading && <p className="facilityExperiencesFeedback" role="status">Cargando experiencias…</p>}

      {!loading && error && (
        <div className="facilityExperiencesFeedback" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => void fetchPage(null, true)}>Reintentar</button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="facilityExperiencesFeedback">Todavía no hay experiencias publicadas.</p>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="facilityExperiencesList">
          {items.map((item) => {
            const publishedDate = formatPublishedDate(item.publishedAt);
            const details = [item.relationship, item.period].filter(Boolean);

            return (
              <li className="facilityExperiencesItem" key={item.id}>
                {(details.length > 0 || publishedDate) && (
                  <p className="facilityExperiencesMeta">
                    {details.map((detail, index) => (
                      <span key={`${item.id}:${detail}`}>
                        {index > 0 && <i aria-hidden="true">·</i>}
                        {detail}
                      </span>
                    ))}
                    {publishedDate && (
                      <time dateTime={item.publishedAt ?? undefined}>
                        {details.length > 0 && <i aria-hidden="true">·</i>}
                        {publishedDate}
                      </time>
                    )}
                  </p>
                )}
                {item.perspective && <p className="facilityExperienceKind">{{ resident: "Experiencia de una persona residente", family: "Experiencia de un familiar o persona allegada", visitor: "Experiencia de visita" }[item.perspective]}</p>}
                {!item.perspective && item.kind === "visit" && <p className="facilityExperienceKind">Experiencia de visita</p>}
                <p className="facilityExperiencesBody">{item.body}</p>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && !error && nextCursor && (
        <button
          type="button"
          className="facilityExperiencesLoadMore"
          disabled={loadingMore}
          onClick={() => void fetchPage(nextCursor, false)}
        >
          {loadingMore ? "Cargando…" : "Cargar más"}
        </button>
      )}
    </section>
  );
}

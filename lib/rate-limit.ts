// Limitador de frecuencia por ventana fija.
//
// Compatible con el runtime Edge a propósito: sólo `Map` y `Date.now()`, sin
// `node:crypto` ni acceso a disco, porque corre desde `middleware.ts`.
//
// LIMITACIÓN CONOCIDA: el almacén en memoria es por instancia. En Vercel cada
// instancia serverless lleva su propio contador, así que esto **demora** un
// ataque de fuerza bruta, no lo impide. Por eso el almacén está detrás de una
// interfaz: pasar a Redis/Upstash es implementar `RateLimitStore`, no reescribir
// las reglas ni el middleware.

export type RateLimitRule = {
  /** Peticiones permitidas dentro de la ventana. */
  limit: number;
  /** Tamaño de la ventana en milisegundos. */
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  /** Segundos hasta que la ventana se reinicia. */
  retryAfterSeconds: number;
};

export interface RateLimitStore {
  hit(key: string, rule: RateLimitRule, now: number): RateLimitResult;
}

type Counter = { count: number; resetAt: number };

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly counters = new Map<string, Counter>();
  private lastPrune = 0;

  hit(key: string, rule: RateLimitRule, now = Date.now()): RateLimitResult {
    this.prune(now);

    const existing = this.counters.get(key);
    if (!existing || existing.resetAt <= now) {
      this.counters.set(key, { count: 1, resetAt: now + rule.windowMs });
      return { allowed: true, remaining: rule.limit - 1, retryAfterSeconds: 0 };
    }

    existing.count += 1;
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    if (existing.count > rule.limit) {
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }
    return { allowed: true, remaining: rule.limit - existing.count, retryAfterSeconds };
  }

  /** Evita que el mapa crezca sin límite; basta con barrer de vez en cuando. */
  private prune(now: number) {
    if (now - this.lastPrune < 60_000) return;
    this.lastPrune = now;
    for (const [key, counter] of this.counters) {
      if (counter.resetAt <= now) this.counters.delete(key);
    }
  }
}

/**
 * Identificador del cliente. `NextRequest.ip` ya no existe en Next 15, así que
 * se leen los encabezados que pone el proxy. Si no hay ninguno, se agrupa todo
 * bajo una misma clave: es preferible limitar de más que no limitar.
 */
export function clientIdentifier(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "desconocido";
}

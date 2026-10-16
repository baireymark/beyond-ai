// Browser side of the contact form: posts the lead straight to BeyondAi Admin (`POST {api}/api/leads`), maps each
// response to what the form shows, and falls back to the SMTP email server action only when the API itself fails.
// No proxy through this site: the admin app checks the browser's Origin and rate-limits by the visitor's IP.
import type { FieldErrors, LeadPayload } from './enquiry';

export type Outcome =
  | { kind: 'sent' } // 201, or the email fallback succeeded
  | { kind: 'invalid'; fields: FieldErrors } // 400
  | { kind: 'verification_failed' } // 403
  | { kind: 'too_large' } // 413
  | { kind: 'rate_limited'; retryAfterSeconds: number | null } // 429
  | { kind: 'failed' }; // 500, any other status, network or CORS failure, timeout

/** Sends the enquiry by email when the API failed. Resolves to whether the email went out. */
export type EmailFallback = (payload: LeadPayload) => Promise<'sent' | 'invalid' | 'error'>;

export const API_TIMEOUT_MS = 15_000;

/** Base URL without a trailing slash; empty when not configured. */
export const leadsEndpoint = (apiUrl: string | undefined) => {
  const base = (apiUrl ?? '').trim().replace(/\/+$/, '');
  return base ? `${base}/api/leads` : '';
};

/** `Retry-After` in seconds (the API sends seconds; an HTTP date is accepted too). */
export function parseRetryAfter(header: string | null, now = Date.now()): number | null {
  if (!header) return null;
  if (/^\d+$/.test(header.trim())) return Number(header.trim());
  const at = Date.parse(header);
  return Number.isNaN(at) ? null : Math.max(0, Math.ceil((at - now) / 1000));
}

export function interpretResponse(status: number, body: unknown, retryAfter: string | null): Outcome {
  switch (status) {
    case 201:
      return { kind: 'sent' };
    case 400: {
      const raw = (body as { fields?: unknown } | null)?.fields;
      const fields: FieldErrors = {};
      if (raw && typeof raw === 'object') {
        for (const [name, msg] of Object.entries(raw)) if (typeof msg === 'string' && msg) fields[name as keyof FieldErrors] = msg;
      }
      if (!Object.keys(fields).length) fields._form = 'Please check your details and try again.';
      return { kind: 'invalid', fields };
    }
    case 403:
      return { kind: 'verification_failed' };
    case 413:
      return { kind: 'too_large' };
    case 429:
      return { kind: 'rate_limited', retryAfterSeconds: parseRetryAfter(retryAfter) };
    default:
      return { kind: 'failed' };
  }
}

export async function postLead(endpoint: string, payload: LeadPayload, fetchImpl: typeof fetch = fetch): Promise<Outcome> {
  if (!endpoint) return { kind: 'failed' };
  let res: Response;
  try {
    res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, // the only header the API's CORS setup allows
      body: JSON.stringify(payload),
      credentials: 'omit',
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
  } catch {
    return { kind: 'failed' }; // network error, CORS rejection or timeout: fetch gives no further detail
  }
  const body = res.status === 400 ? await res.json().catch(() => null) : null;
  return interpretResponse(res.status, body, res.headers.get('Retry-After'));
}

/**
 * Posts to the API; when it fails (not when it rejects the enquiry), emails it instead. 400, 403, 413 and 429 are
 * deliberate answers, so they never fall back: that would skip the API's validation, bot check and rate limit.
 */
export async function submitEnquiry(
  payload: LeadPayload,
  { endpoint, fallback, fetchImpl }: { endpoint: string; fallback: EmailFallback; fetchImpl?: typeof fetch },
): Promise<{ outcome: Outcome; via: 'api' | 'email' }> {
  const outcome = await postLead(endpoint, payload, fetchImpl);
  if (outcome.kind !== 'failed') return { outcome, via: 'api' };
  try {
    return { outcome: (await fallback(payload)) === 'sent' ? { kind: 'sent' } : { kind: 'failed' }, via: 'email' };
  } catch {
    return { outcome: { kind: 'failed' }, via: 'email' };
  }
}

/**
 * Turnstile tokens are single use. 201 and 403 used the token; after 500 or a failed request the API may have
 * used it. 400, 413 and 429 are answered before verification, so the token is kept.
 */
export const needsNewToken = (o: Outcome) => o.kind === 'sent' || o.kind === 'verification_failed' || o.kind === 'failed';

export const SUCCESS_MESSAGE = 'Thanks, we’ll reply within one business day.';

/** The status line for outcomes other than field errors; `email` is the contact address shown on the site. */
export function outcomeMessage(o: Outcome, email: string): string {
  switch (o.kind) {
    case 'sent':
      return SUCCESS_MESSAGE;
    case 'invalid':
      return '';
    case 'verification_failed':
      return 'We couldn’t verify your submission. Please try again.';
    case 'too_large':
      return 'Your message is too long.';
    case 'rate_limited': {
      // Browsers only let the page read Retry-After if the API lists it in Access-Control-Expose-Headers.
      if (o.retryAfterSeconds === null) return 'Too many submissions. Please try again in a few minutes.';
      const minutes = Math.max(1, Math.ceil(o.retryAfterSeconds / 60));
      return `Too many submissions. Please try again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`;
    }
    case 'failed':
      return `Something went wrong. Please try again, or email us at ${email}.`;
  }
}

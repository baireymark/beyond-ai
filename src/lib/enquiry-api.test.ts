// The browser's request to the enquiry API, how each response maps to what the form shows, and when the
// email fallback runs. fetch is replaced by a stub; nothing leaves the machine.
import { describe, expect, it, vi } from 'vitest';
import { buildLeadPayload } from './enquiry';
import {
  interpretResponse, leadsEndpoint, needsNewToken, outcomeMessage, parseRetryAfter, postLead, submitEnquiry,
  type EmailFallback, type Outcome,
} from './enquiry-api';

const payload = buildLeadPayload(
  { fullName: 'Ana Reyes', workEmail: 'ana@example.ph', organization: '', topic: 'PRODUCT_DEMO', interest: 'ERP', preferredTime: '', message: 'Please show us the ERP.', consent: true, companyUrl: '' },
  { turnstileToken: 'tok-1', consentVersion: '2026-10', pathname: '/contact', search: '' },
);
const ENDPOINT = 'https://admin.example/api/leads';
const EMAIL = 'sakib@beyondai.ph';

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const replying = (res: Response | (() => never)) =>
  vi.fn<typeof fetch>(async () => (typeof res === 'function' ? res() : res));

/** Every response the API documents, and what the visitor should see for it. */
const cases: [string, () => Response | never, Outcome, string][] = [
  ['201 created', () => json(201, { id: 'lead_1', status: 'NEW', replyDueAt: '2026-10-21T14:00:00+08:00' }), { kind: 'sent' }, 'Thanks, we’ll reply within one business day.'],
  ['400 validation_failed', () => json(400, { error: 'validation_failed', fields: { workEmail: 'Enter a valid work email.', _form: 'Check the form.' } }),
    { kind: 'invalid', fields: { workEmail: 'Enter a valid work email.', _form: 'Check the form.' } }, ''],
  ['403 verification_failed', () => json(403, { error: 'verification_failed' }), { kind: 'verification_failed' }, 'We couldn’t verify your submission. Please try again.'],
  ['413 payload_too_large', () => json(413, { error: 'payload_too_large' }), { kind: 'too_large' }, 'Your message is too long.'],
  ['429 rate_limited', () => json(429, { error: 'rate_limited' }, { 'Retry-After': '540' }), { kind: 'rate_limited', retryAfterSeconds: 540 }, 'Too many submissions. Please try again in 9 minutes.'],
  ['500 server_error', () => json(500, { error: 'server_error' }), { kind: 'failed' }, `Something went wrong. Please try again, or email us at ${EMAIL}.`],
  ['network failure', () => { throw new TypeError('Failed to fetch'); }, { kind: 'failed' }, `Something went wrong. Please try again, or email us at ${EMAIL}.`],
];

describe('postLead', () => {
  it('posts the JSON payload with Content-Type as its only header and no cookies', async () => {
    const fetchImpl = replying(json(201, { id: 'lead_1' }));
    await postLead(ENDPOINT, payload, fetchImpl);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(ENDPOINT);
    expect(init).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit' });
    expect(Object.keys(init!.headers as object)).toEqual(['Content-Type']);
    expect(JSON.parse(init!.body as string)).toEqual(payload);
    expect(init!.signal).toBeInstanceOf(AbortSignal);
  });

  it.each(cases)('maps %s', async (_name, res, outcome) => {
    await expect(postLead(ENDPOINT, payload, vi.fn<typeof fetch>(async () => res()))).resolves.toEqual(outcome);
  });

  it('treats a timeout (aborted request) as a failure', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => { throw new DOMException('The operation timed out.', 'TimeoutError'); });
    await expect(postLead(ENDPOINT, payload, fetchImpl)).resolves.toEqual({ kind: 'failed' });
  });

  it('fails without calling anything when the API URL is not configured', async () => {
    const fetchImpl = replying(json(201, {}));
    await expect(postLead('', payload, fetchImpl)).resolves.toEqual({ kind: 'failed' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('interpretResponse', () => {
  it('puts a form-level message on a 400 without usable field messages', () => {
    expect(interpretResponse(400, null, null)).toEqual({ kind: 'invalid', fields: { _form: 'Please check your details and try again.' } });
    expect(interpretResponse(400, { fields: { fullName: 7 } }, null)).toEqual({ kind: 'invalid', fields: { _form: 'Please check your details and try again.' } });
  });

  it.each([404, 405, 502, 503, 200])('treats an unexpected %i as a failure', status => {
    expect(interpretResponse(status, null, null)).toEqual({ kind: 'failed' });
  });

  it('keeps a 429 without Retry-After', () => {
    expect(interpretResponse(429, null, null)).toEqual({ kind: 'rate_limited', retryAfterSeconds: null });
  });
});

describe('submitEnquiry', () => {
  const fallbackReturning = (r: Awaited<ReturnType<EmailFallback>>) => vi.fn<EmailFallback>(async () => r);

  it.each(cases.filter(([, , o]) => o.kind !== 'failed'))('does not email when the API answers %s', async (_name, res, outcome) => {
    const fallback = fallbackReturning('sent');
    await expect(submitEnquiry(payload, { endpoint: ENDPOINT, fallback, fetchImpl: vi.fn<typeof fetch>(async () => res()) }))
      .resolves.toEqual({ outcome, via: 'api' });
    expect(fallback).not.toHaveBeenCalled();
  });

  it.each([
    ['500', () => json(500, { error: 'server_error' })],
    ['502 from the platform', () => new Response('Bad gateway', { status: 502 })],
    ['network or CORS failure', () => { throw new TypeError('Failed to fetch'); }],
  ] as const)('emails the same payload when the API fails with %s', async (_name, res) => {
    const fallback = fallbackReturning('sent');
    await expect(submitEnquiry(payload, { endpoint: ENDPOINT, fallback, fetchImpl: vi.fn<typeof fetch>(async () => res()) }))
      .resolves.toEqual({ outcome: { kind: 'sent' }, via: 'email' });
    expect(fallback).toHaveBeenCalledWith(payload);
  });

  it('emails when the API URL is missing', async () => {
    const fallback = fallbackReturning('sent');
    await expect(submitEnquiry(payload, { endpoint: '', fallback })).resolves.toEqual({ outcome: { kind: 'sent' }, via: 'email' });
  });

  it.each(['error', 'invalid'] as const)('reports a failure when the API fails and the email fallback returns %s', async r => {
    await expect(submitEnquiry(payload, { endpoint: ENDPOINT, fallback: fallbackReturning(r), fetchImpl: replying(json(500, {})) }))
      .resolves.toEqual({ outcome: { kind: 'failed' }, via: 'email' });
  });

  it('reports a failure when the email fallback cannot be reached either', async () => {
    const fallback = vi.fn<EmailFallback>(async () => { throw new TypeError('Failed to fetch'); });
    await expect(submitEnquiry(payload, { endpoint: ENDPOINT, fallback, fetchImpl: replying(json(500, {})) }))
      .resolves.toEqual({ outcome: { kind: 'failed' }, via: 'email' });
  });
});

describe('form state for each outcome', () => {
  it.each(cases)('%s shows the right message', (_name, _res, outcome, message) => {
    expect(outcomeMessage(outcome, EMAIL)).toBe(message);
  });

  it('resets Turnstile after 201, 403 and failures, and keeps the token after 400, 413 and 429', () => {
    const resets = Object.fromEntries(cases.map(([name, , o]) => [name, needsNewToken(o)]));
    expect(resets).toEqual({
      '201 created': true, '400 validation_failed': false, '403 verification_failed': true, '413 payload_too_large': false,
      '429 rate_limited': false, '500 server_error': true, 'network failure': true,
    });
  });

  it.each([
    [null, 'in a few minutes'], [0, 'in 1 minute'], [30, 'in 1 minute'], [60, 'in 1 minute'], [61, 'in 2 minutes'], [3600, 'in 60 minutes'],
  ])('rounds Retry-After %j seconds up to whole minutes', (seconds, text) => {
    expect(outcomeMessage({ kind: 'rate_limited', retryAfterSeconds: seconds }, EMAIL)).toContain(text);
  });
});

describe('parseRetryAfter', () => {
  it('reads seconds and HTTP dates', () => {
    expect(parseRetryAfter('120')).toBe(120);
    expect(parseRetryAfter('Wed, 21 Oct 2026 07:28:00 GMT', Date.parse('Wed, 21 Oct 2026 07:25:00 GMT'))).toBe(180);
    expect(parseRetryAfter('soon')).toBeNull();
    expect(parseRetryAfter(null)).toBeNull();
  });
});

describe('leadsEndpoint', () => {
  it.each([
    ['https://beyondai-admin-rosy.vercel.app/', 'https://beyondai-admin-rosy.vercel.app/api/leads'],
    ['http://localhost:3001', 'http://localhost:3001/api/leads'],
    [' ', ''],
    [undefined, ''],
  ])('%j → %j', (base, url) => expect(leadsEndpoint(base)).toBe(url));
});

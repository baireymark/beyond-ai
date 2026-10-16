// The email fallback server action end to end: real validation, rate limit, mailer and nodemailer message composition.
// Only the network is replaced: nodemailer's stream transport builds the complete message instead of sending it.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { site } from '@/content/site';
import { sendEnquiryByEmail } from './actions';

interface Sent { html: unknown; text: unknown; recipients: string[]; raw: string }

const { request, sent, smtp } = vi.hoisted(() => ({
  request: { headers: new Headers() },
  sent: [] as Sent[],
  smtp: { failure: null as Error | null },
}));

vi.mock('next/headers', () => ({ headers: async () => request.headers }));
vi.mock('nodemailer', async importOriginal => {
  const nodemailer = (await importOriginal<typeof import('nodemailer')>()).default;
  return {
    default: {
      createTransport: () => {
        const stream = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
        return {
          async sendMail(mail: Parameters<typeof stream.sendMail>[0]) {
            if (smtp.failure) throw smtp.failure;
            const info = await stream.sendMail(mail);
            sent.push({ html: mail.html, text: mail.text, recipients: info.envelope.to, raw: info.message.toString() });
            return info;
          },
        };
      },
    },
  };
});

let client = 0;
/** The next request comes from these headers, or from a new client address. */
const from = (headers?: Record<string, string>) => { request.headers = new Headers(headers ?? { 'x-real-ip': `198.51.100.${++client}` }); };
/** The same payload the browser sends to the enquiry API. */
const submit = (fields: Record<string, unknown> = {}) => sendEnquiryByEmail({
  fullName: 'Ana Reyes', workEmail: 'ana@example.ph', organization: null, topic: 'PRODUCT_DEMO', interestAreas: [],
  preferredCallTime: null, message: 'Please show us the ERP.', consent: true, consentVersion: '2026-10',
  turnstileToken: 'tok-1', companyUrl: '', sourcePage: '/contact', ...fields,
});
const headerLines = (raw: string) => raw.slice(0, raw.indexOf('\n\n')).split('\n');

beforeEach(() => {
  sent.length = 0;
  smtp.failure = null;
  vi.stubEnv('SMTP_USER', 'website@beyondai.ph');
  vi.stubEnv('SMTP_PASS', 'abcdefghijklmnop');
  vi.stubEnv('CONTACT_TO_EMAIL', '');
  from();
});

describe('sendEnquiryByEmail', () => {
  it('emails a valid enquiry to the team only, with the visitor as Reply-To', async () => {
    await expect(submit()).resolves.toBe('sent');
    expect(sent).toHaveLength(1);
    expect(sent[0].recipients).toEqual([site.email]);
    const headers = headerLines(sent[0].raw);
    expect(headers).toContain(`To: ${site.email}`);
    expect(headers.find(h => h.startsWith('From:'))).toContain('<website@beyondai.ph>');
    expect(headers.find(h => h.startsWith('Reply-To:'))).toContain('<ana@example.ph>');
    expect(sent[0].text).toContain('Topic: Product demo');
    expect(sent[0].text).toContain('API was unavailable');
  });

  it('cannot be steered into adding recipients or headers', async () => {
    await submit({ fullName: 'Ana\r\nBcc: victim@example.com', organization: 'Acme\r\nCc: victim@example.com' });
    expect(sent[0].recipients).toEqual([site.email]);
    expect(headerLines(sent[0].raw).filter(h => /^(to|cc|bcc):/i.test(h))).toEqual([`To: ${site.email}`]);
  });

  it('escapes visitor markup in the HTML part', async () => {
    await submit({ message: '<script>alert(1)</script>' });
    expect(sent[0].html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(sent[0].html).not.toContain('<script');
  });

  it('accepts honeypot submissions without sending anything', async () => {
    await expect(submit({ companyUrl: 'https://spam.example' })).resolves.toBe('sent');
    expect(sent).toHaveLength(0);
  });

  it('sends nothing when the enquiry is invalid', async () => {
    await expect(submit({ workEmail: 'not-an-email', message: '' })).resolves.toBe('invalid');
    await expect(submit({ consent: 'true' })).resolves.toBe('invalid');
    await expect(submit({ topic: 'demo' })).resolves.toBe('invalid');
    await expect(sendEnquiryByEmail('not an object')).resolves.toBe('invalid');
    expect(sent).toHaveLength(0);
  });

  it('limits each client to 5 enquiries per 10 minutes without affecting other clients', async () => {
    const results: string[] = [];
    for (let i = 0; i < 6; i++) results.push(await submit());
    expect(results).toEqual(['sent', 'sent', 'sent', 'sent', 'sent', 'error']);
    expect(sent).toHaveLength(5);
    from();
    await expect(submit()).resolves.toBe('sent');
  });

  it('identifies the client by the first X-Forwarded-For address when X-Real-IP is absent', async () => {
    from({ 'x-forwarded-for': '203.0.113.50, 10.0.0.1' });
    for (let i = 0; i < 5; i++) await submit();
    await expect(submit()).resolves.toBe('error');
    from({ 'x-forwarded-for': '203.0.113.51, 10.0.0.1' });
    await expect(submit()).resolves.toBe('sent');
  });

  it('reports a failed send and logs the cause without the enquiry', async () => {
    smtp.failure = new Error('Invalid login: 535-5.7.8 Username and Password not accepted');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(submit({ message: 'Confidential project details' })).resolves.toBe('error');
    expect(log).toHaveBeenCalledTimes(1);
    const logged = log.mock.calls.flat().join(' ');
    expect(logged).toContain('Invalid login');
    expect(logged).not.toMatch(/Ana Reyes|ana@example\.ph|Confidential project details/);
  });

  it('reports an error when the SMTP credentials are missing', async () => {
    vi.stubEnv('SMTP_PASS', '');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(submit()).resolves.toBe('error');
    expect(log.mock.calls.flat().join(' ')).toContain('Email is not configured');
    expect(sent).toHaveLength(0);
  });
});

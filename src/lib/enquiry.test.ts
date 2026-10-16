// Server-side enquiry rules: the only validation a direct POST to the server action cannot skip.
import { describe, expect, it } from 'vitest';
import { interests } from '@/content/contact';
import { MESSAGE_MAX, enquiryLines, parseEnquiry, type Enquiry } from './enquiry';

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [name, value] of Object.entries(fields)) fd.append(name, value);
  return fd;
};
const valid = { name: 'Ana Reyes', email: 'ana@example.ph', topic: 'demo', message: 'Please show us the ERP.' };
const parsed = (fields: Record<string, string>): Enquiry => {
  const r = parseEnquiry(form(fields));
  if (!r.ok) throw new Error(`expected a valid enquiry, got errors on ${r.fields.join(', ')}`);
  return r.data;
};

describe('parseEnquiry', () => {
  it('accepts a complete enquiry', () => {
    expect(parsed({ ...valid, organization: 'Acme Corp', interest: interests[0], preferred_time: '2026-10-20T14:30' })).toEqual({
      name: 'Ana Reyes', email: 'ana@example.ph', organization: 'Acme Corp', topic: 'demo',
      interest: interests[0], preferredTime: '2026-10-20T14:30', message: 'Please show us the ERP.',
    });
  });

  it('reports every missing required field in display order', () => {
    expect(parseEnquiry(form({}))).toEqual({ ok: false, fields: ['f-name', 'f-email', 'f-msg'] });
  });

  it('treats whitespace-only fields as missing', () => {
    expect(parseEnquiry(form({ ...valid, name: ' \t ', message: '\r\n  ' }))).toEqual({ ok: false, fields: ['f-name', 'f-msg'] });
  });

  it.each(['ana', 'ana@example', 'ana @example.ph', 'ana@ex@ample.ph'])('rejects the email address %j', email => {
    expect(parseEnquiry(form({ ...valid, email }))).toEqual({ ok: false, fields: ['f-email'] });
  });

  it(`rejects a message longer than ${MESSAGE_MAX} characters`, () => {
    expect(parseEnquiry(form({ ...valid, message: 'x'.repeat(MESSAGE_MAX + 1) }))).toEqual({ ok: false, fields: ['f-msg'] });
  });

  it('counts a submitted CRLF line break as one character, as the textarea maxlength does', () => {
    const message = 'a\r\n'.repeat(999) + 'ab'; // 2999 characters as posted, 2000 after normalizing
    expect(parsed({ ...valid, message }).message).toHaveLength(MESSAGE_MAX);
  });

  it('flattens single-line fields so they cannot inject email headers', () => {
    const data = parsed({ ...valid, name: 'Ana\r\nBcc: victim@example.com', organization: 'Acme\nX-Spam: yes' });
    expect(data.name).toBe('Ana Bcc: victim@example.com');
    expect(data.organization).toBe('Acme X-Spam: yes');
  });

  it('rejects an email address carrying an extra header line', () => {
    expect(parseEnquiry(form({ ...valid, email: 'ana@example.ph\r\nBcc: victim@example.com' }))).toEqual({ ok: false, fields: ['f-email'] });
  });

  it('removes control characters but keeps line breaks and tabs in the message', () => {
    const data = parsed({ ...valid, name: 'Ana\u0000\u0007 Reyes', message: 'Line one\u001b\n\tLine two\u007f' });
    expect(data.name).toBe('Ana Reyes');
    expect(data.message).toBe('Line one\n\tLine two');
  });

  it('replaces values the form controls cannot produce with safe defaults', () => {
    const data = parsed({ ...valid, topic: 'admin', interest: 'Free money', preferred_time: 'tomorrow at 3pm' });
    expect(data).toMatchObject({ topic: 'other', interest: '', preferredTime: '' });
  });

  it('truncates over-long single-line fields', () => {
    expect(parsed({ ...valid, name: 'n'.repeat(500), organization: 'o'.repeat(500) })).toMatchObject({ name: 'n'.repeat(200), organization: 'o'.repeat(200) });
  });
});

describe('enquiryLines', () => {
  it('lists the enquiry with readable labels and omits empty optional fields', () => {
    expect(enquiryLines(parsed(valid))).toEqual(['Name: Ana Reyes', 'Email: ana@example.ph', 'Topic: Product demo', '', 'Please show us the ERP.']);
  });

  it('includes optional fields and the call time zone when given', () => {
    const lines = enquiryLines(parsed({ ...valid, organization: 'Acme Corp', interest: 'AI Education', preferred_time: '2026-10-20T14:30' }));
    expect(lines).toContain('Organization: Acme Corp');
    expect(lines).toContain('Area of interest: AI Education');
    expect(lines).toContain('Preferred call time: 2026-10-20 14:30 (Asia/Manila, UTC+8)');
  });
});

// Building the lead payload from the form, the API's field rules (run in the browser and by the email fallback),
// and the fallback email body.
import { describe, expect, it } from 'vitest';
import { interestAreas, topicAliases, topics } from '@/content/contact';
import {
  LIMITS, buildLeadPayload, enquiryLines, parseLead, payloadBytes, readUtm, toManilaIso, validateLead,
  type EnquiryValues, type LeadPayload, type PayloadContext,
} from './enquiry';

const values: EnquiryValues = {
  fullName: 'Ana Reyes', workEmail: 'ana@example.ph', organization: '', topic: 'PRODUCT_DEMO', interest: '',
  preferredTime: '', message: 'Please show us the ERP.', consent: true, companyUrl: '',
};
const ctx: PayloadContext = { turnstileToken: 'tok-1', consentVersion: '2026-10', pathname: '/contact', search: '' };
const build = (v: Partial<EnquiryValues> = {}, c: Partial<PayloadContext> = {}) => buildLeadPayload({ ...values, ...v }, { ...ctx, ...c });

describe('buildLeadPayload', () => {
  it('sends exactly the API fields, with blank optional fields as null and the honeypot present', () => {
    expect(build()).toEqual({
      fullName: 'Ana Reyes', workEmail: 'ana@example.ph', organization: null, topic: 'PRODUCT_DEMO', interestAreas: [],
      preferredCallTime: null, message: 'Please show us the ERP.', consent: true, consentVersion: '2026-10',
      turnstileToken: 'tok-1', companyUrl: '', sourcePage: '/contact',
    });
  });

  it('treats whitespace-only optional fields as blank and trims the rest', () => {
    const p = build({ fullName: '  Ana Reyes ', workEmail: ' ana@example.ph ', organization: '   ', message: '\n Hello there, team \n' });
    expect(p).toMatchObject({ fullName: 'Ana Reyes', workEmail: 'ana@example.ph', organization: null, message: 'Hello there, team' });
  });

  it('keeps a filled-in organization and area of interest', () => {
    expect(build({ organization: ' Acme Corp ', interest: 'ERP' })).toMatchObject({ organization: 'Acme Corp', interestAreas: ['ERP'] });
  });

  it('always includes companyUrl, sending what the hidden input holds unchanged', () => {
    expect(build()).toHaveProperty('companyUrl', '');
    expect(build({ companyUrl: ' https://spam.example ' })).toHaveProperty('companyUrl', ' https://spam.example ');
    expect(JSON.parse(JSON.stringify(build()))).toHaveProperty('companyUrl', '');
  });

  it('converts the Philippine-time call time to ISO 8601 with a +08:00 offset', () => {
    expect(build({ preferredTime: '2026-10-21T14:00' }).preferredCallTime).toBe('2026-10-21T14:00:00+08:00');
  });

  it('records the page path and drops one that is not a path', () => {
    expect(build({}, { pathname: '/contact' }).sourcePage).toBe('/contact');
    expect(build({}, { pathname: '/' + 'x'.repeat(300) }).sourcePage).toHaveLength(LIMITS.sourcePageMax);
    expect(build({}, { pathname: '' })).not.toHaveProperty('sourcePage');
  });

  it('leaves utm out when the URL has no UTM parameters', () => {
    expect(build({}, { search: '?topic=demo&product=ERP' })).not.toHaveProperty('utm');
  });

  it('adds utm with null for each missing parameter', () => {
    expect(build({}, { search: '?utm_source=linkedin&utm_campaign=q4-erp' }).utm).toEqual({ source: 'linkedin', medium: null, campaign: 'q4-erp' });
  });
});

describe('readUtm', () => {
  it('reads all three parameters', () => {
    expect(readUtm('?utm_source=google&utm_medium=cpc&utm_campaign=brand')).toEqual({ source: 'google', medium: 'cpc', campaign: 'brand' });
  });

  it('treats empty or blank parameters as missing', () => {
    expect(readUtm('?utm_source=&utm_medium=%20%20')).toBeUndefined();
    expect(readUtm('?utm_source=&utm_medium=email')).toEqual({ source: null, medium: 'email', campaign: null });
  });

  it(`cuts each value to ${LIMITS.utmMax} characters`, () => {
    expect(readUtm(`?utm_source=${'s'.repeat(150)}`)?.source).toHaveLength(LIMITS.utmMax);
  });

  it('decodes encoded values', () => {
    expect(readUtm('?utm_campaign=Q4%20launch%20%26%20demo')?.campaign).toBe('Q4 launch & demo');
  });
});

describe('toManilaIso', () => {
  it.each([
    ['2026-10-21T14:00', '2026-10-21T14:00:00+08:00'],
    ['2026-10-21T09:05:30', '2026-10-21T09:05:30+08:00'],
    ['', null],
    ['tomorrow at 3pm', null],
  ])('%j → %j', (input, expected) => expect(toManilaIso(input)).toBe(expected));
});

describe('validateLead', () => {
  const ok = build();
  const check = (p: Partial<LeadPayload>) => validateLead({ ...ok, ...p });

  it('accepts a valid enquiry', () => {
    expect(validateLead(ok)).toEqual({});
  });

  it('reports every missing required field', () => {
    expect(Object.keys(check({ fullName: '', workEmail: '', message: '', consent: false as true, turnstileToken: '' })))
      .toEqual(['fullName', 'workEmail', 'message', 'consent', 'turnstileToken']);
  });

  it.each([
    ['fullName', 'A', 'at least 2'],
    ['fullName', 'n'.repeat(121), '120 characters or fewer'],
    ['workEmail', `${'a'.repeat(250)}@x.ph`, '254 characters or fewer'],
    ['workEmail', 'ana@example', 'valid email'],
    ['organization', 'o'.repeat(161), '160 characters or fewer'],
    ['message', 'Too short', 'at least 10'],
    ['message', 'x'.repeat(2001), '2000 characters or fewer'],
    ['topic', 'ADMIN', 'Choose a topic'],
    ['preferredCallTime', '2026-10-21T14:00', 'valid date'],
  ] as const)('rejects %s %j', (field, value, message) => {
    expect(check({ [field]: value })[field]).toContain(message);
  });

  it('accepts values on the limits', () => {
    expect(check({ fullName: 'Al', message: 'x'.repeat(10), organization: 'o'.repeat(160) })).toEqual({});
    expect(check({ fullName: 'n'.repeat(120), message: 'x'.repeat(2000) })).toEqual({});
  });

  it('accepts up to 5 distinct known interest areas', () => {
    const five = interestAreas.slice(0, 5).map(([v]) => v);
    expect(check({ interestAreas: five })).toEqual({});
    expect(check({ interestAreas: interestAreas.slice(0, 6).map(([v]) => v) })).toHaveProperty('interestAreas');
    expect(check({ interestAreas: ['ERP', 'ERP'] })).toHaveProperty('interestAreas');
    expect(check({ interestAreas: ['Free money' as 'ERP'] })).toHaveProperty('interestAreas');
  });

  it('requires consent to be literally true and a consent version', () => {
    expect(check({ consent: 'true' as unknown as true })).toHaveProperty('consent');
    expect(check({ consentVersion: '' })).toHaveProperty('consentVersion');
  });
});

describe('payloadBytes', () => {
  it('keeps the largest possible form well under the 16 KB API limit', () => {
    const big = build({ fullName: '名'.repeat(120), organization: '組'.repeat(160), message: '😀'.repeat(1000) }, { search: `?utm_source=${'s'.repeat(100)}` });
    expect(validateLead(big)).toEqual({});
    expect(payloadBytes(big)).toBeLessThan(LIMITS.bodyBytes);
  });
});

describe('form options', () => {
  it('maps every legacy ?topic= name to an API topic', () => {
    const values = topics.map(([v]) => v as string);
    for (const value of Object.values(topicAliases)) expect(values).toContain(value);
  });
});

describe('parseLead (email fallback)', () => {
  it('accepts the payload the form builds', () => {
    const p = build({ organization: 'Acme', interest: 'ERP', preferredTime: '2026-10-21T14:00' }, { search: '?utm_source=x' });
    expect(parseLead(JSON.parse(JSON.stringify(p)))).toEqual({ ok: true, data: p });
  });

  it('drops unknown fields and coerces wrong types', () => {
    const r = parseLead({ ...build(), isAdmin: true, organization: 42, interestAreas: 'ERP', utm: 'x' });
    expect(r.ok && r.data).toEqual(build());
  });

  it('rejects anything that is not a valid enquiry', () => {
    expect(parseLead(null)).toMatchObject({ ok: false });
    expect(parseLead({ ...build(), consent: 'yes' })).toMatchObject({ ok: false, fields: { consent: expect.any(String) } });
  });

  it('flattens single-line fields so they cannot inject email headers', () => {
    const r = parseLead({ ...build(), fullName: 'Ana\r\nBcc: victim@example.com', organization: 'Acme\nX-Spam: yes' });
    expect(r.ok && [r.data.fullName, r.data.organization]).toEqual(['Ana Bcc: victim@example.com', 'Acme X-Spam: yes']);
  });

  it('removes control characters but keeps line breaks and tabs in the message', () => {
    const r = parseLead({ ...build(), fullName: 'Ana\u0000\u0007 Reyes', message: 'Line one\u001b\n\tLine two\u007f' });
    expect(r.ok && [r.data.fullName, r.data.message]).toEqual(['Ana Reyes', 'Line one\n\tLine two']);
  });
});

describe('enquiryLines', () => {
  it('lists the enquiry with readable labels and omits empty optional fields', () => {
    expect(enquiryLines(build()).slice(2)).toEqual([
      'Name: Ana Reyes', 'Email: ana@example.ph', 'Topic: Product demo', 'Page: /contact',
      'Consent: given (privacy notice 2026-10)', '', 'Please show us the ERP.',
    ]);
  });

  it('says the API was unavailable, and includes optional fields when given', () => {
    const lines = enquiryLines(build({ organization: 'Acme Corp', interest: 'AI_EDUCATION', preferredTime: '2026-10-21T14:30' }, { search: '?utm_source=li&utm_campaign=q4' }));
    expect(lines[0]).toMatch(/API was unavailable/);
    expect(lines).toContain('Organization: Acme Corp');
    expect(lines).toContain('Area of interest: AI Education');
    expect(lines).toContain('Preferred call time: 2026-10-21 14:30 (Asia/Manila, UTC+8)');
    expect(lines).toContain('UTM: source=li, campaign=q4');
  });
});

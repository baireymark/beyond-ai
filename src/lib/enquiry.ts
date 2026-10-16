// Contact enquiry: the BeyondAi Admin lead payload, its field rules and the fallback email body. The same rules run
// in the browser (instant feedback) and in the email fallback's server action; the admin API stays the final authority.
import { interestAreas, topics, type InterestValue, type TopicValue } from '@/content/contact';

export const LIMITS = {
  nameMin: 2, nameMax: 120,
  emailMax: 254,
  organizationMax: 160,
  messageMin: 10, messageMax: 2000,
  interestsMax: 5,
  sourcePageMax: 200,
  utmMax: 100,
  bodyBytes: 16 * 1024,
} as const;

export const MESSAGE_MAX = LIMITS.messageMax;

export interface Utm { source: string | null; medium: string | null; campaign: string | null }

/** Request body for `POST /api/leads`. The API rejects unknown fields, so this is the whole shape. */
export interface LeadPayload {
  fullName: string;
  workEmail: string;
  organization: string | null;
  topic: TopicValue;
  interestAreas: InterestValue[];
  /** ISO 8601 with offset, e.g. `2026-10-21T14:00:00+08:00`. */
  preferredCallTime: string | null;
  message: string;
  consent: true;
  consentVersion: string;
  turnstileToken: string;
  /** Honeypot: always present, sent exactly as the hidden input holds it (empty for people). */
  companyUrl: string;
  sourcePage?: string;
  utm?: Utm;
}

/** What the form holds, before it becomes a payload. */
export interface EnquiryValues {
  fullName: string;
  workEmail: string;
  organization: string;
  topic: string;
  /** One value from the single "Area of interest" select, or empty. */
  interest: string;
  /** `YYYY-MM-DDTHH:MM` from <input type="datetime-local">, in Philippine time; empty when not given. */
  preferredTime: string;
  message: string;
  consent: boolean;
  companyUrl: string;
}

export interface PayloadContext {
  turnstileToken: string;
  consentVersion: string;
  /** `location.pathname` and `location.search` of the page the form is on. */
  pathname: string;
  search: string;
}

/** API field name → message. `_form` holds messages that belong to the form as a whole. */
export type FieldErrors = Partial<Record<keyof LeadPayload | '_form', string>>;

// Deliberately simple: one @, no spaces, a dot in the domain. The API is the final judge.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCAL_TIME = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(:\d{2})?$/;
const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const MANILA_OFFSET = '+08:00'; // Asia/Manila has no daylight saving time

const topicValues: readonly string[] = topics.map(([v]) => v);
const interestValues: readonly string[] = interestAreas.map(([v]) => v);

/** "2026-10-21T14:00" (Philippine time) → "2026-10-21T14:00:00+08:00"; blank or malformed → null. */
export function toManilaIso(local: string): string | null {
  const m = LOCAL_TIME.exec(local.trim());
  return m ? `${m[1]}${m[2] ?? ':00'}${MANILA_OFFSET}` : null;
}

/** `utm_source`, `utm_medium`, `utm_campaign` from a query string; undefined when none of them is present. */
export function readUtm(search: string): Utm | undefined {
  const params = new URLSearchParams(search);
  const read = (name: string) => params.get(name)?.trim().slice(0, LIMITS.utmMax) || null;
  const utm = { source: read('utm_source'), medium: read('utm_medium'), campaign: read('utm_campaign') };
  return utm.source || utm.medium || utm.campaign ? utm : undefined;
}

export function buildLeadPayload(v: EnquiryValues, ctx: PayloadContext): LeadPayload {
  const organization = v.organization.trim();
  const sourcePage = ctx.pathname.startsWith('/') ? ctx.pathname.slice(0, LIMITS.sourcePageMax) : undefined;
  const utm = readUtm(ctx.search);
  return {
    fullName: v.fullName.trim(),
    workEmail: v.workEmail.trim(),
    organization: organization || null,
    topic: v.topic as TopicValue,
    interestAreas: v.interest ? [v.interest as InterestValue] : [],
    preferredCallTime: toManilaIso(v.preferredTime),
    message: v.message.trim(),
    consent: v.consent as true, // validateLead rejects anything but true
    consentVersion: ctx.consentVersion,
    turnstileToken: ctx.turnstileToken,
    companyUrl: v.companyUrl,
    ...(sourcePage ? { sourcePage } : {}),
    ...(utm ? { utm } : {}),
  };
}

const tooLong = (max: number) => `Use ${max} characters or fewer.`;

/** The API's rules for the fields a person fills in, plus the required hidden ones. Empty result = valid. */
export function validateLead(p: LeadPayload): FieldErrors {
  const e: FieldErrors = {};
  if (!p.fullName) e.fullName = 'Enter your full name.';
  else if (p.fullName.length < LIMITS.nameMin) e.fullName = `Enter at least ${LIMITS.nameMin} characters.`;
  else if (p.fullName.length > LIMITS.nameMax) e.fullName = tooLong(LIMITS.nameMax);

  if (p.workEmail.length > LIMITS.emailMax) e.workEmail = tooLong(LIMITS.emailMax);
  else if (!EMAIL.test(p.workEmail)) e.workEmail = 'Enter a valid email address.';

  if (p.organization && p.organization.length > LIMITS.organizationMax) e.organization = tooLong(LIMITS.organizationMax);
  if (!topicValues.includes(p.topic)) e.topic = 'Choose a topic.';
  if (p.interestAreas.length > LIMITS.interestsMax || new Set(p.interestAreas).size !== p.interestAreas.length
    || p.interestAreas.some(a => !interestValues.includes(a))) e.interestAreas = 'Choose an area of interest from the list.';
  if (p.preferredCallTime !== null && !ISO_WITH_OFFSET.test(p.preferredCallTime)) e.preferredCallTime = 'Enter a valid date and time.';

  if (!p.message) e.message = 'Write a short message.';
  else if (p.message.length < LIMITS.messageMin) e.message = `Write at least ${LIMITS.messageMin} characters.`;
  else if (p.message.length > LIMITS.messageMax) e.message = tooLong(LIMITS.messageMax);

  if (p.consent !== true) e.consent = 'Please agree to the privacy notice so we can reply.';
  if (!p.consentVersion) e.consentVersion = 'The privacy notice version is missing. Please reload the page.';
  if (!p.turnstileToken) e.turnstileToken = 'Please complete the verification.';
  return e;
}

/** UTF-8 size of the JSON body; the API refuses bodies over 16 KB. */
export const payloadBytes = (p: LeadPayload) => new TextEncoder().encode(JSON.stringify(p)).length;

// Control characters are removed; single-line fields also lose line breaks so they cannot inject email headers.
const clean = (v: unknown) =>
  typeof v === 'string' ? v.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim() : '';
const oneLine = (v: unknown, max: number) => clean(v).replace(/\s+/g, ' ').slice(0, max);
const optional = (v: string) => v || null;

/**
 * Server side of the email fallback: the server action is callable by anyone, so its argument is untrusted.
 * Coerces it into a payload (dropping unknown fields and wrong types) and applies validateLead.
 */
export function parseLead(input: unknown): { ok: true; data: LeadPayload } | { ok: false; fields: FieldErrors } {
  const o = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const utmIn = (o.utm && typeof o.utm === 'object' ? o.utm : {}) as Record<string, unknown>;
  const utm = { source: optional(oneLine(utmIn.source, LIMITS.utmMax)), medium: optional(oneLine(utmIn.medium, LIMITS.utmMax)), campaign: optional(oneLine(utmIn.campaign, LIMITS.utmMax)) };
  const sourcePage = oneLine(o.sourcePage, LIMITS.sourcePageMax);
  const data: LeadPayload = {
    fullName: oneLine(o.fullName, 1000),
    workEmail: oneLine(o.workEmail, 1000),
    organization: optional(oneLine(o.organization, 1000)),
    topic: oneLine(o.topic, 40) as TopicValue,
    interestAreas: (Array.isArray(o.interestAreas) ? o.interestAreas : []).map(a => oneLine(a, 40) as InterestValue),
    preferredCallTime: optional(oneLine(o.preferredCallTime, 40)),
    message: clean(o.message),
    consent: (o.consent === true) as true,
    consentVersion: oneLine(o.consentVersion, 40),
    turnstileToken: oneLine(o.turnstileToken, 4096),
    companyUrl: typeof o.companyUrl === 'string' ? o.companyUrl : '',
    ...(sourcePage.startsWith('/') ? { sourcePage } : {}),
    ...(utm.source || utm.medium || utm.campaign ? { utm } : {}),
  };
  const fields = validateLead(data);
  return Object.keys(fields).length ? { ok: false, fields } : { ok: true, data };
}

export const topicLabel = (value: string) => topics.find(([v]) => v === value)?.[1] ?? 'Something else';
export const interestLabel = (value: string) => interestAreas.find(([v]) => v === value)?.[1] ?? value;

/** "2026-10-21T14:00:00+08:00" → "2026-10-21 14:00 (UTC+08:00)" */
export const formatCallTime = (iso: string) => {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${m[1]} ${m[2]} (${m[3] === MANILA_OFFSET ? 'Asia/Manila, UTC+8' : `UTC${m[3] === 'Z' ? '' : m[3]}`})`;
};

/** Plain-text body of the fallback email, sent only when the admin API could not take the enquiry. */
export function enquiryLines(p: LeadPayload): string[] {
  const opt = (v: string | null | undefined, label: string) => (v ? `${label}: ${v}` : null);
  const utm = p.utm ? Object.entries(p.utm).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join(', ') : '';
  return [
    'The enquiry API was unavailable, so this enquiry was emailed instead. Add it to BeyondAi Admin as a lead.',
    '',
    `Name: ${p.fullName}`,
    `Email: ${p.workEmail}`,
    opt(p.organization, 'Organization'),
    `Topic: ${topicLabel(p.topic)}`,
    opt(p.interestAreas.map(interestLabel).join(', '), 'Area of interest'),
    opt(p.preferredCallTime && formatCallTime(p.preferredCallTime), 'Preferred call time'),
    opt(p.sourcePage, 'Page'),
    opt(utm, 'UTM'),
    `Consent: given (privacy notice ${p.consentVersion})`,
    '',
    p.message,
  ].filter((v): v is string => v !== null);
}

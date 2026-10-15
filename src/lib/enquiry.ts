// Contact enquiry: field rules, server-side parsing and the email body. Used by the form and the server action.
import { interests, topics, type TopicValue } from '@/content/contact';

/** Fields the form validates, in display order, with the message shown when each is invalid. */
export const requiredFields = [
  ['f-name', 'Enter your full name.'],
  ['f-email', 'Enter a valid email address.'],
  ['f-msg', 'Write a short message.'],
] as const;

export type FieldId = (typeof requiredFields)[number][0];

export const MESSAGE_MAX = 2000;

export interface Enquiry {
  name: string;
  email: string;
  organization: string;
  topic: TopicValue;
  interest: string;
  /** `YYYY-MM-DDTHH:MM` from <input type="datetime-local">, in Philippine time; empty when not given. */
  preferredTime: string;
  message: string;
}

export type EnquiryState =
  | { status: 'idle' }
  | { status: 'sent' | 'error' }
  | { status: 'invalid'; fields: FieldId[] };

// Deliberately simple: one @, no spaces, a dot in the domain. The mail server is the final judge.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCAL_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

// Browsers submit textarea line breaks as CRLF; normalize to LF so lengths match the field's maxlength.
// Control characters are removed, and single-line fields lose line breaks so they cannot inject email headers.
const text = (v: FormDataEntryValue | null) =>
  typeof v === 'string' ? v.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim() : '';
const oneLine = (v: FormDataEntryValue | null, max: number) => text(v).replace(/\s+/g, ' ').slice(0, max);

export function parseEnquiry(form: FormData): { ok: true; data: Enquiry } | { ok: false; fields: FieldId[] } {
  const data = {
    name: oneLine(form.get('name'), 200),
    email: oneLine(form.get('email'), 254),
    organization: oneLine(form.get('organization'), 200),
    topic: oneLine(form.get('topic'), 40),
    interest: oneLine(form.get('interest'), 100),
    preferredTime: oneLine(form.get('preferred_time'), 16),
    message: text(form.get('message')),
  };
  const fields: FieldId[] = [];
  if (!data.name) fields.push('f-name');
  if (!EMAIL.test(data.email)) fields.push('f-email');
  if (!data.message || data.message.length > MESSAGE_MAX) fields.push('f-msg');
  if (fields.length) return { ok: false, fields };
  // Select values the form controls; anything else is tampering, so fall back to safe defaults.
  const topic = topics.find(([v]) => v === data.topic)?.[0] ?? 'other';
  const interest = interests.includes(data.interest) ? data.interest : '';
  const preferredTime = LOCAL_TIME.test(data.preferredTime) ? data.preferredTime : '';
  return { ok: true, data: { ...data, topic, interest, preferredTime } };
}

export const topicLabel = (value: string) => topics.find(([v]) => v === value)?.[1] ?? 'Something else';

/** "2026-10-20T14:30" → "2026-10-20 14:30 (Asia/Manila, UTC+8)" */
export const formatLocalTime = (v: string) => {
  if (!v) return '';
  const [date, time] = v.split('T');
  return `${date} ${time} (Asia/Manila, UTC+8)`;
};

/** Plain-text email body; the same lines the static site put into its pre-filled mailto: email. */
export function enquiryLines(e: Enquiry): string[] {
  const opt = (v: string, label: string) => (v ? `${label}: ${v}` : null);
  return [
    `Name: ${e.name}`,
    `Email: ${e.email}`,
    opt(e.organization, 'Organization'),
    `Topic: ${topicLabel(e.topic)}`,
    opt(e.interest, 'Area of interest'),
    opt(formatLocalTime(e.preferredTime), 'Preferred call time'),
    '',
    e.message,
  ].filter((v): v is string => v !== null);
}

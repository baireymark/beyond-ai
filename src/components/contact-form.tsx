'use client';
// Enquiry form. Posts each enquiry from the browser straight to the BeyondAi Admin enquiry API, where it is saved
// as a lead; this site stores nothing. If the API fails, the enquiry is emailed through the server action instead.
// Inline validation mirrors the API's rules; prefill from ?topic= / ?product= / ?service=. Requires JavaScript
// (the Turnstile bot check runs in the browser), so without it the form points visitors to the email address.
import { Fragment, useEffect, useRef, useState, type FormEvent } from 'react';
import { sendEnquiryByEmail } from '@/app/contact/actions';
import { consentNotice, interestAreas, topicAliases, topics } from '@/content/contact';
import { LIMITS, buildLeadPayload, payloadBytes, validateLead, type FieldErrors, type LeadPayload } from '@/lib/enquiry';
import { leadsEndpoint, needsNewToken, outcomeMessage, submitEnquiry, type Outcome } from '@/lib/enquiry-api';
import { ManilaClock } from './manila-clock';
import { Turnstile, type TurnstileHandle } from './turnstile';

const ENDPOINT = leadsEndpoint(process.env.NEXT_PUBLIC_ENQUIRY_API_URL);
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';
const CONSENT_VERSION = process.env.NEXT_PUBLIC_CONSENT_NOTICE_VERSION ?? '';

/** Fields a person can fix, in display order: API field → input id and the name used in the error summary. */
const fields = [
  ['fullName', 'f-name', 'Full name'],
  ['workEmail', 'f-email', 'Work email'],
  ['organization', 'f-org', 'Organization'],
  ['topic', 'f-topic', 'Topic'],
  ['interestAreas', 'f-interest', 'Area of interest'],
  ['preferredCallTime', 'f-time', 'Preferred call time'],
  ['message', 'f-msg', 'Message'],
  ['consent', 'f-consent', 'Privacy notice agreement'],
] as const satisfies readonly (readonly [keyof LeadPayload, string, string])[];

type FieldName = (typeof fields)[number][0];
const fieldNames: readonly string[] = fields.map(([name]) => name);

type Status = { tone: 'info' | 'success' | 'error'; text: string } | null;

export function ContactForm({ email }: { email: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const turnstile = useRef<TurnstileHandle>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const formErrorRef = useRef<HTMLDivElement>(null);
  const [token, setToken] = useState<string | null>(null);
  const [verifyUnavailable, setVerifyUnavailable] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>(null);
  const [count, setCount] = useState(0);
  // Where focus goes once React has rendered the result: the first invalid field, the top message or the status.
  const [focusTo, setFocusTo] = useState<{ el: () => HTMLElement | null } | null>(null);
  useEffect(() => { focusTo?.el()?.focus(); }, [focusTo]);

  useEffect(() => {
    const form = formRef.current!;
    form.noValidate = true; // our validation (below) replaces the browser's
    const params = new URLSearchParams(location.search);
    const topic = form.elements.namedItem('topic') as HTMLSelectElement;
    const interest = form.elements.namedItem('interest') as HTMLSelectElement;
    const t = params.get('topic');
    const topicValue = t && (topicAliases[t] ?? t);
    if (topicValue && [...topic.options].some(o => o.value === topicValue)) topic.value = topicValue;
    const pre = params.get('product') || params.get('service') || params.get('interest');
    const match = pre && [...interest.options].find(o => o.text === pre || o.value === pre);
    if (match) interest.value = match.value;
  }, []);

  const fieldErrors = fields.filter(([name]) => errors[name]);
  // Messages that belong to no visible field (`_form`, or hidden fields such as consentVersion) go at the top.
  const formErrors = Object.entries(errors).filter(([name]) => !fieldNames.includes(name)).map(([, msg]) => msg);

  const err = (name: FieldName) => errors[name];
  const describedBy = (name: FieldName, id: string, hint?: string) =>
    [hint, err(name) ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
  const errorText = (name: FieldName, id: string) =>
    err(name) ? <p className="field-error" id={`${id}-error`}>{err(name)}</p> : null;

  function showFieldErrors(found: FieldErrors) {
    setErrors(found);
    const first = fields.find(([name]) => found[name]);
    setFocusTo({ el: () => (first ? document.getElementById(first[1]) : formErrorRef.current) });
  }

  function finish(outcome: Outcome) {
    if (needsNewToken(outcome)) {
      setToken(null);
      turnstile.current?.reset();
    }
    if (outcome.kind === 'invalid') {
      setStatus(null);
      showFieldErrors(outcome.fields);
      return;
    }
    if (outcome.kind === 'sent') {
      formRef.current?.reset(); // failed sends keep what was typed
      setCount(0);
    }
    setStatus({ tone: outcome.kind === 'sent' ? 'success' : 'error', text: outcomeMessage(outcome, email) });
    setFocusTo({ el: () => statusRef.current });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || !token) return;
    const form = e.currentTarget;
    const value = (name: string) => (form.elements.namedItem(name) as HTMLInputElement).value;
    const payload = buildLeadPayload({
      fullName: value('fullName'),
      workEmail: value('workEmail'),
      organization: value('organization'),
      topic: value('topic'),
      interest: value('interest'),
      preferredTime: value('preferredTime'),
      message: value('message'),
      consent: (form.elements.namedItem('consent') as HTMLInputElement).checked,
      companyUrl: value('companyUrl'),
    }, { turnstileToken: token, consentVersion: CONSENT_VERSION, pathname: location.pathname, search: location.search });

    const found = validateLead(payload);
    if (Object.keys(found).length) {
      setStatus(null);
      showFieldErrors(found);
      return;
    }
    setErrors({});
    if (payloadBytes(payload) > LIMITS.bodyBytes) return finish({ kind: 'too_large' });

    setPending(true);
    setStatus({ tone: 'info', text: 'Sending…' });
    try {
      const { outcome } = await submitEnquiry(payload, { endpoint: ENDPOINT, fallback: sendEnquiryByEmail });
      finish(outcome);
    } finally {
      setPending(false);
    }
  }

  const blocked = verifyUnavailable || !SITE_KEY;

  return (
    <form className="enquiry" data-enquiry="" method="post" onSubmit={onSubmit} ref={formRef} aria-busy={pending}>
      <div className="form-errors" role="alert" id="f-form-error" tabIndex={-1} hidden={!formErrors.length} ref={formErrorRef}>
        {formErrors.map((msg, i) => <Fragment key={i}>{i > 0 ? ' ' : ''}{msg}</Fragment>)}
      </div>
      <noscript><p className="form-errors">This form needs JavaScript for its spam check. Please email us at <a href={`mailto:${email}`}>{email}</a>.</p></noscript>
      <div className="field">
        <label htmlFor="f-name">Full name <span aria-hidden="true">*</span></label>
        <input id="f-name" name="fullName" autoComplete="name" required maxLength={LIMITS.nameMax} aria-invalid={err('fullName') ? true : undefined} aria-describedby={describedBy('fullName', 'f-name')} />
        {errorText('fullName', 'f-name')}
      </div>
      <div className="field">
        <label htmlFor="f-email">Work email <span aria-hidden="true">*</span></label>
        <input id="f-email" name="workEmail" type="email" autoComplete="email" inputMode="email" required maxLength={LIMITS.emailMax} aria-invalid={err('workEmail') ? true : undefined} aria-describedby={describedBy('workEmail', 'f-email')} />
        {errorText('workEmail', 'f-email')}
      </div>
      <div className="field">
        <label htmlFor="f-org">Organization <span className="opt">(optional)</span></label>
        <input id="f-org" name="organization" autoComplete="organization" maxLength={LIMITS.organizationMax} aria-invalid={err('organization') ? true : undefined} aria-describedby={describedBy('organization', 'f-org')} />
        {errorText('organization', 'f-org')}
      </div>
      <div className="field">
        <label htmlFor="f-topic">Topic <span aria-hidden="true">*</span></label>
        <select id="f-topic" name="topic" required aria-invalid={err('topic') ? true : undefined} aria-describedby={describedBy('topic', 'f-topic')}>
          {topics.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {errorText('topic', 'f-topic')}
      </div>
      <div className="field">
        <label htmlFor="f-interest">Area of interest <span className="opt">(optional)</span></label>
        <select id="f-interest" name="interest" aria-invalid={err('interestAreas') ? true : undefined} aria-describedby={describedBy('interestAreas', 'f-interest')}>
          {interestAreas.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {errorText('interestAreas', 'f-interest')}
      </div>
      <div className="field">
        <label htmlFor="f-time">Preferred call time <span className="opt">(optional · Philippine time, Asia/Manila)</span></label>
        <input id="f-time" name="preferredTime" type="datetime-local" aria-invalid={err('preferredCallTime') ? true : undefined} aria-describedby={describedBy('preferredCallTime', 'f-time', 'f-time-hint')} />
        <p className="hint" id="f-time-hint">Times are in Philippine Standard Time (UTC+8). <ManilaClock variant="hint" /></p>
        {errorText('preferredCallTime', 'f-time')}
      </div>
      <div className="field full">
        <label htmlFor="f-msg">Message <span aria-hidden="true">*</span></label>
        <textarea id="f-msg" name="message" rows={6} minLength={LIMITS.messageMin} maxLength={LIMITS.messageMax} required aria-invalid={err('message') ? true : undefined} aria-describedby={describedBy('message', 'f-msg', 'f-msg-hint')} onInput={e => setCount(e.currentTarget.value.length)} />
        <p className="hint" id="f-msg-hint"><span data-count="">{count}</span> / {LIMITS.messageMax} characters (at least {LIMITS.messageMin})</p>
        {errorText('message', 'f-msg')}
      </div>
      {/* Spam trap: off-screen, out of the tab order and hidden from assistive technology. People leave it empty;
          the API quietly drops enquiries where it is filled in. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="f-company-url">Company website (leave this field empty)</label>
        <input id="f-company-url" name="companyUrl" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      </div>
      <div className="field full">
        <div className="check">
          <input id="f-consent" name="consent" type="checkbox" required aria-invalid={err('consent') ? true : undefined} aria-describedby={describedBy('consent', 'f-consent')} />
          <label htmlFor="f-consent">
            {consentNotice.before}
            <a href={consentNotice.href} target="_blank" rel="noopener noreferrer">{consentNotice.linkText}<span className="sr-only"> (opens in a new tab)</span></a>
            {consentNotice.after} <span aria-hidden="true">*</span>
          </label>
        </div>
        {errorText('consent', 'f-consent')}
      </div>
      <div className="field full">
        {SITE_KEY ? <Turnstile ref={turnstile} siteKey={SITE_KEY} onToken={setToken} onUnavailable={() => setVerifyUnavailable(true)} /> : null}
        {blocked ? <p className="hint" role="alert">The spam check could not load, so the form can’t be sent. Please reload the page, or email us at <a href={`mailto:${email}`}>{email}</a>.</p> : null}
      </div>
      <p className="form-errors" role="alert" data-errors="" hidden={!fieldErrors.length}>
        {fieldErrors.length ? (
          <>
            <span>Please fix the following: </span>
            {fieldErrors.map(([name, id, label], i) => (
              <Fragment key={name}>
                <a href={`#${id}`} onClick={ev => { ev.preventDefault(); document.getElementById(id)?.focus(); }}>{label}</a>
                {i < fieldErrors.length - 1 ? ' ' : ''}
              </Fragment>
            ))}
          </>
        ) : null}
      </p>
      <div className="field full submit-row">
        {/* Disabled until Turnstile gives a token; while sending it stays focusable (aria-disabled) and ignores clicks. */}
        <button className="p-cta" type="submit" disabled={!token} aria-disabled={pending || undefined} aria-describedby={!token && !blocked ? 'f-submit-hint' : undefined}>
          {pending ? 'Sending…' : 'Send enquiry'} <i aria-hidden="true" />
        </button>
        <p className="hint" id="f-submit-hint">{token || blocked ? 'Your enquiry is sent securely to the BeyondAi team.' : 'Complete the spam check above to send your enquiry.'}</p>
      </div>
      <div className="form-status" role="status" aria-live="polite" data-status="" data-tone={status?.tone} tabIndex={-1} ref={statusRef}>{status?.text}</div>
    </form>
  );
}

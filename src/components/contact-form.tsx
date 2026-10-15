'use client';
// Enquiry form. With JavaScript: inline validation, an error summary, prefill from ?topic= / ?product= / ?service=,
// and submission through the server action without a page reload. Without JavaScript the same server action
// handles a normal form post (browser validation applies) and the page re-renders with the result.
import Link from 'next/link';
import { Fragment, startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from 'react';
import { sendEnquiry } from '@/app/contact/actions';
import { interests, topics } from '@/content/contact';
import { MESSAGE_MAX, requiredFields, type EnquiryState, type FieldId } from '@/lib/enquiry';
import { ManilaClock } from './manila-clock';

const initial: EnquiryState = { status: 'idle' };

export function ContactForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState(sendEnquiry, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const [count, setCount] = useState(0);
  const [errors, setErrors] = useState<FieldId[] | null>(null); // null until the first submit attempt
  const [hideResult, setHideResult] = useState(false); // an invalid new attempt hides the previous result
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    // A new result from the server: after a successful send the (reset) message is empty again.
    setSeen(state);
    if (state.status === 'sent') setCount(0);
  }

  useEffect(() => {
    const form = formRef.current!;
    form.noValidate = true; // our validation (below) replaces the browser's when JavaScript runs
    const params = new URLSearchParams(location.search);
    const topic = form.elements.namedItem('topic') as HTMLSelectElement;
    const interest = form.elements.namedItem('interest') as HTMLSelectElement;
    const t = params.get('topic');
    if (t && [...topic.options].some(o => o.value === t)) topic.value = t;
    const pre = params.get('product') || params.get('service') || params.get('interest');
    if (pre && [...interest.options].some(o => o.text === pre)) interest.value = pre;
  }, []);

  // After a successful send, clear the form for the next enquiry. Failed sends keep what was typed.
  useEffect(() => {
    if (state.status === 'sent') formRef.current?.reset();
  }, [state]);

  const serverErrors = state.status === 'invalid' && !hideResult ? state.fields : null;
  const shownErrors = errors?.length ? errors : serverErrors;
  const result = state.status !== 'idle' && !hideResult ? state.status : null;
  const statusText = pending ? 'Sending…'
    : result === 'sent' ? 'Thank you — your enquiry was sent. We aim to reply within 24 hours.'
      : result === 'error' ? `Sorry, your enquiry could not be sent. Please email us at ${email}.`
        : '';
  const invalid = (id: FieldId) => (shownErrors ? shownErrors.includes(id) : errors ? false : undefined);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); // stops React's automatic form action; we validate first and then call it ourselves
    if (pending) return;
    const form = e.currentTarget;
    const bad = requiredFields.filter(([id]) => {
      const el = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)!;
      return !(el.value.trim() && el.checkValidity());
    }).map(([id]) => id);
    setErrors(bad);
    setHideResult(bad.length > 0);
    if (bad.length) {
      document.getElementById(bad[0])?.focus();
      return;
    }
    const data = new FormData(form);
    startTransition(() => formAction(data));
  }

  return (
    <form className="enquiry" data-enquiry="" action={formAction} onSubmit={onSubmit} ref={formRef}>
      <div className="field"><label htmlFor="f-name">Full name <span aria-hidden="true">*</span></label><input id="f-name" name="name" autoComplete="name" required aria-invalid={invalid('f-name')} /></div>
      <div className="field"><label htmlFor="f-email">Work email <span aria-hidden="true">*</span></label><input id="f-email" name="email" type="email" autoComplete="email" inputMode="email" required aria-invalid={invalid('f-email')} /></div>
      <div className="field"><label htmlFor="f-org">Organization <span className="opt">(optional)</span></label><input id="f-org" name="organization" autoComplete="organization" /></div>
      <div className="field">
        <label htmlFor="f-topic">Topic <span aria-hidden="true">*</span></label>
        <select id="f-topic" name="topic" required>{topics.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </div>
      <div className="field">
        <label htmlFor="f-interest">Area of interest <span className="opt">(optional)</span></label>
        <select id="f-interest" name="interest"><option value="">Not sure yet</option>{interests.map(n => <option key={n}>{n}</option>)}</select>
      </div>
      <div className="field">
        <label htmlFor="f-time">Preferred call time <span className="opt">(optional · Philippine time, Asia/Manila)</span></label>
        <input id="f-time" name="preferred_time" type="datetime-local" aria-describedby="f-time-hint" />
        <p className="hint" id="f-time-hint">Times are in Philippine Standard Time (UTC+8). <ManilaClock variant="hint" /></p>
      </div>
      <div className="field full">
        <label htmlFor="f-msg">Message <span aria-hidden="true">*</span></label>
        <textarea id="f-msg" name="message" rows={6} maxLength={MESSAGE_MAX} required aria-describedby="f-msg-hint" aria-invalid={invalid('f-msg')} onInput={e => setCount(e.currentTarget.value.length)} />
        <p className="hint" id="f-msg-hint"><span data-count="">{count}</span> / {MESSAGE_MAX} characters</p>
      </div>
      {/* Spam trap: hidden from people and assistive technology; bots that fill it are ignored by the server. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="f-website">Leave this field empty</label>
        <input id="f-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <p className="form-errors" role="alert" data-errors="" hidden={!shownErrors?.length}>
        {shownErrors?.length ? (
          <>
            <span>Please fix the following: </span>
            {shownErrors.map((id, i) => (
              <Fragment key={id}>
                <a href={`#${id}`} onClick={ev => { ev.preventDefault(); document.getElementById(id)?.focus(); }}>
                  {requiredFields.find(([f]) => f === id)![1]}
                </a>
                {i < shownErrors.length - 1 ? ' ' : ''}
              </Fragment>
            ))}
          </>
        ) : null}
      </p>
      <div className="field full submit-row">
        <button className="p-cta" type="submit">Send enquiry <i aria-hidden="true" /></button>
        <p className="hint">Your enquiry is sent securely to the BeyondAi team. See our <Link href="/privacy">privacy notice</Link>.</p>
      </div>
      <div className="form-status" role="status" aria-live="polite" data-status="">{statusText}</div>
    </form>
  );
}

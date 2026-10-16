'use client';
// Cloudflare Turnstile widget (explicit rendering). Reports each token through onToken, and null when there is no
// usable token: tokens are single use and expire after about 5 minutes, so an expired widget resets itself.
import { useEffect, useEffectEvent, useImperativeHandle, useRef, type Ref } from 'react';

interface TurnstileApi {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}
declare global { interface Window { turnstile?: TurnstileApi } }

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<TurnstileApi> | undefined;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile unavailable')));
    script.onerror = () => { loading = undefined; script.remove(); reject(new Error('Turnstile unavailable')); };
    document.head.appendChild(script);
  });
  return loading;
}

/** reset() fetches a new token; the caller treats its current token as gone. */
export interface TurnstileHandle { reset(): void }

export function Turnstile({ siteKey, onToken, onUnavailable, ref }: {
  siteKey: string;
  onToken: (token: string | null) => void;
  onUnavailable: () => void;
  ref?: Ref<TurnstileHandle>;
}) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<{ api: TurnstileApi; id: string } | null>(null);
  const emit = useEffectEvent(onToken);
  const unavailable = useEffectEvent(onUnavailable);

  useImperativeHandle(ref, () => ({
    reset() {
      if (widget.current) widget.current.api.reset(widget.current.id);
    },
  }), []);

  useEffect(() => {
    if (!siteKey) { unavailable(); return; }
    let cancelled = false;
    loadTurnstile().then(api => {
      if (cancelled || !box.current) return;
      const reset = () => { emit(null); if (widget.current) api.reset(widget.current.id); };
      const id = api.render(box.current, {
        sitekey: siteKey,
        theme: 'dark',
        size: 'flexible',
        'refresh-expired': 'manual', // we reset on expiry ourselves, so the form knows the token is gone
        callback: (token: string) => emit(token),
        'expired-callback': reset,
        'timeout-callback': reset,
        'error-callback': () => { emit(null); }, // Turnstile retries on its own
      });
      widget.current = { api, id };
    }, () => { if (!cancelled) unavailable(); });
    return () => {
      cancelled = true;
      if (widget.current) widget.current.api.remove(widget.current.id);
      widget.current = null;
    };
  }, [siteKey]);

  return <div className="turnstile" ref={box} />;
}

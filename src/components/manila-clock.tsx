'use client';
// Current time in Clark (Asia/Manila), for scheduling. Server HTML shows the time zone only; the clock starts on load.
import { useEffect, useState } from 'react';

export function ManilaClock({ variant }: { variant: 'card' | 'hint' }) {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', hour: 'numeric', minute: '2-digit' });
    const tick = () => setNow(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return variant === 'card'
    ? <p data-clock="">{now ? `${now} in Clark (Asia/Manila, UTC+8)` : 'Asia/Manila (UTC+8)'}</p>
    : <span data-local-time="">{now ? `It is currently ${now} in Clark.` : null}</span>;
}

'use client';
// Homepage services: hover/focus previews on wide screens, and the active item follows scroll when not hovering.
// Every item is a real link, so the list works the same without JavaScript.
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { clamp, motion } from '@/lib/motion';
import { pad } from './ui';

export interface ServiceItem { slug: string; name: string; short: string; summary: string }

export function ServicesShowcase({ items, children }: { items: ServiceItem[]; children: ReactNode }) {
  const [cur, setCur] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const beamRef = useRef<HTMLDivElement>(null);
  const hoverAt = useRef(0);
  const moved = useRef(false);

  // Wide screens: align the preview with the active item; the beam moves once the selection first changes.
  useEffect(() => {
    if (innerWidth <= 1000) return;
    const li = listRef.current!.children[cur] as HTMLElement;
    panelRef.current!.style.top = li.offsetTop + 'px';
    if (cur !== 0) moved.current = true;
    if (moved.current) beamRef.current!.style.translate = `0 ${(cur - 2.5) * 60}px`;
  }, [cur]);

  useEffect(() => {
    if (!motion().env.fine) return;
    const list = listRef.current!;
    const onScroll = () => {
      if (innerWidth <= 1000 || performance.now() - hoverAt.current < 1500) return;
      const r = list.getBoundingClientRect();
      if (r.top > innerHeight || r.bottom < 0) return;
      setCur(Math.floor(clamp((innerHeight * 0.5 - r.top) / (r.height * 0.9), 0, 0.999) * items.length));
    };
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, [items.length]);

  return (
    <>
      <div className="svc-beam" aria-hidden="true" ref={beamRef} />
      {children}
      <ul className="svc-list" data-svc ref={listRef}>
        {items.map((s, i) => (
          <li key={s.slug} className={i === cur ? 'active' : undefined}>
            <Link href={`/services/${s.slug}`} data-i={i} onPointerEnter={() => { hoverAt.current = performance.now(); setCur(i); }} onFocus={() => setCur(i)}>
              <small aria-hidden="true">{pad(i + 1)}</small>
              <span className="t" data-t={s.name}>{s.name}</span>
              <span className="d">{s.short}</span>
            </Link>
          </li>
        ))}
      </ul>
      <aside className="svc-detail" aria-hidden="true" ref={panelRef}>
        {items.map((s, i) => (
          <div className="swap" key={s.slug} hidden={i !== cur}>
            <span className="p-mono">{pad(i + 1)} / {pad(items.length)}</span>
            <p className="h4">{s.name}</p>
            <p>{s.summary}</p>
            <span className="p-cta ghost">Explore →</span>
          </div>
        ))}
      </aside>
    </>
  );
}

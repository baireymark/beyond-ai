'use client';
// Homepage product rail: mouse drag with inertia and a progress bar. Touch and keyboard use native scrolling.
import Link from 'next/link';
import { useEffect, useRef, type ReactNode } from 'react';
import { motion } from '@/lib/motion';

export function ProductRail({ children }: { children: ReactNode }) {
  const railRef = useRef<HTMLUListElement>(null);
  const barRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const rail = railRef.current!, bar = barRef.current!;
    const { env } = motion();
    const ac = new AbortController();
    const signal = ac.signal;
    const horizontal = () => rail.scrollWidth > rail.clientWidth + 4;
    const update = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      const f = max > 0 ? rail.scrollLeft / max : 0, v = max > 0 ? rail.clientWidth / rail.scrollWidth : 1;
      bar.style.width = v * 100 + '%'; bar.style.left = f * (1 - v) * 100 + '%';
    };
    rail.addEventListener('scroll', update, { passive: true, signal });
    addEventListener('resize', update, { signal });
    update();

    if (env.fine) {
      rail.classList.add('grab');
      let down = false, sx = 0, sl = 0, v = 0, lx = 0, moved = 0, glide = 0;
      rail.addEventListener('pointerdown', e => {
        if (e.pointerType !== 'mouse' || !horizontal()) return;
        cancelAnimationFrame(glide);
        down = true; moved = 0; sx = lx = e.clientX; sl = rail.scrollLeft; v = 0;
      }, { signal });
      addEventListener('pointermove', e => {
        if (!down) return;
        const dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx));
        if (moved > 6) rail.classList.add('dragging');
        rail.scrollLeft = sl - dx; v = e.clientX - lx; lx = e.clientX;
      }, { signal });
      addEventListener('pointerup', () => {
        if (!down) return;
        down = false; rail.classList.remove('dragging');
        if (env.reduce) return;
        const step = () => { if (Math.abs(v) < 0.4) return; rail.scrollLeft -= v; v *= 0.93; glide = requestAnimationFrame(step); };
        step();
      }, { signal });
      // A drag must not also count as a click on the card under the pointer (capture phase runs before Link's handler).
      rail.addEventListener('click', e => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, { capture: true, signal });
      signal.addEventListener('abort', () => cancelAnimationFrame(glide));
    }
    return () => ac.abort();
  }, []);

  return (
    <>
      <ul className="rail" id="rail" aria-label="Products" ref={railRef}>{children}</ul>
      <div className="rail-foot">
        <span className="p-mono rail-hint" aria-hidden="true">Drag or scroll →</span>
        <span className="rail-progress" aria-hidden="true"><i ref={barRef} /></span>
        <Link className="text-link" href="/products">All products →</Link>
      </div>
    </>
  );
}

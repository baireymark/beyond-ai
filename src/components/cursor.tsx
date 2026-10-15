'use client';
// Cursor ring that trails the mouse and grows over interactive elements. Mouse users only; hidden with reduced motion.
import { useEffect } from 'react';
import { lerp, motion } from '@/lib/motion';

export function Cursor() {
  useEffect(() => {
    const { env } = motion();
    if (!env.fine) return;
    const ring = document.createElement('div');
    ring.className = 'cursor'; ring.setAttribute('aria-hidden', 'true');
    document.body.append(ring);
    let mx = -100, my = -100, rx = -100, ry = -100, frame = 0;
    const step = () => {
      frame = 0;
      if (env.reduce || document.hidden) { ring.classList.remove('on'); return; }
      rx = lerp(rx, mx, 0.2); ry = lerp(ry, my, 0.2);
      ring.style.transform = `translate(${rx}px,${ry}px)`;
      if (Math.abs(rx - mx) + Math.abs(ry - my) > 0.1) frame = requestAnimationFrame(step);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || env.reduce) return;
      mx = e.clientX; my = e.clientY;
      if (!ring.classList.contains('on')) { rx = mx; ry = my; }
      ring.classList.add('on');
      ring.classList.toggle('over', !!(e.target as Element).closest?.('a,button,summary,input,textarea,select,label'));
      if (!frame) frame = requestAnimationFrame(step);
    };
    const onLeave = () => ring.classList.remove('on');
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(frame);
      ring.remove();
    };
  }, []);

  return null;
}

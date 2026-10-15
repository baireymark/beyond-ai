'use client';
// Page-level motion that decorates server-rendered markup: scroll reveals (.rv, .split), the outline numbers that fill
// as they rise (.why .n) and the pointer spotlight on cards. Re-applied after every client-side navigation.
// Content stays fully visible if this never runs (see the `js` class bootstrap in the root layout).
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { clamp, motion } from '@/lib/motion';

export function SiteEffects() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.hydrated = ''; // tells the bootstrap script not to fall back to the no-JS styles
    const { env } = motion();
    const ac = new AbortController();
    const signal = ac.signal;

    /* Reveals: headlines and blocks rise in each time they enter the viewport. */
    const targets = [...document.querySelectorAll<HTMLElement>('.rv, .split')];
    let io: IntersectionObserver | undefined;
    if ('IntersectionObserver' in window && !env.reduce) {
      io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('in', e.isIntersecting)), { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
      targets.forEach((el, i) => {
        if (el.classList.contains('rv')) el.style.transitionDelay = (i % 4) * 80 + 'ms';
        io!.observe(el);
      });
    } else targets.forEach(el => el.classList.add('in'));

    /* Outline numbers fill as they rise through the viewport. */
    const nums = [...document.querySelectorAll<HTMLElement>('.why .n')];
    if (nums.length) {
      let ticking = false;
      const fill = () => {
        ticking = false;
        nums.forEach(n => {
          const r = n.getBoundingClientRect(), p = env.reduce ? 1 : clamp((innerHeight * 0.9 - r.top) / (innerHeight * 0.45), 0, 1);
          n.style.backgroundPosition = `0 ${(1 - p) * 100}%`;
        });
      };
      addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(fill); } }, { passive: true, signal });
      fill();
    }

    /* Pointer spotlight on cards, plus a gentle tilt on the showcase visual. */
    if (env.fine) document.querySelectorAll<HTMLElement>('.card,.work-card,.project-visual').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) / r.width * 100 + '%');
        el.style.setProperty('--my', (e.clientY - r.top) / r.height * 100 + '%');
        if (el.classList.contains('project-visual') && !env.reduce) {
          el.style.setProperty('--pitch', (0.5 - (e.clientY - r.top) / r.height) * 8 + 'deg');
          el.style.setProperty('--yaw', ((e.clientX - r.left) / r.width - 0.5) * 12 + 'deg');
        }
      }, { passive: true, signal });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--pitch', '0deg'); el.style.setProperty('--yaw', '0deg'); }, { signal });
    });

    return () => { ac.abort(); io?.disconnect(); };
  }, [pathname]);

  return null;
}

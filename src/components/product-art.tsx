'use client';
// Product light art: one small canvas per product card or product hero, reacting to the pointer over its card.
import { useEffect, useState } from 'react';
import type { ProductArt as ArtKind } from '@/content/products';
import { clamp, fit, lerp, motion } from '@/lib/motion';

export function ProductArt({ kind, variant }: { kind: ArtKind; variant: 'card' | 'hero' }) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!host) return;
    const c = host.querySelector('canvas')!;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const { env, add } = motion();
    const card = host.closest<HTMLElement>('.pcard') ?? host;
    let mx = 0.5, my = 0.45, hover = 0, h0 = 0;
    const ac = new AbortController();
    if (env.fine) {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        mx = (e.clientX - r.left) / r.width; my = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', mx * 100 + '%'); card.style.setProperty('--my', my * 100 + '%');
      }, { signal: ac.signal });
      card.addEventListener('pointerenter', () => { h0 = 1; }, { signal: ac.signal });
      card.addEventListener('pointerleave', () => { h0 = 0; mx = 0.5; my = 0.45; }, { signal: ac.signal });
    }
    const cols: { h: number; p: number; cur?: number }[] = Array.from({ length: 9 }, () => ({ h: 0.3 + Math.random() * 0.6, p: Math.random() * 6 }));
    const sparks = Array.from({ length: 7 }, (_, i) => ({ a: i / 7 * Math.PI * 2, r: 0.18 + Math.random() * 0.22, s: 0.3 + Math.random() * 0.5 }));

    const remove = add(host, t => {
      const [w, h, k] = fit(c, env.artDpr); hover = lerp(hover, h0, 0.08); ctx.clearRect(0, 0, w, h); ctx.globalCompositeOperation = 'lighter';
      const cx = w / 2, cy = h * 0.5, u = Math.min(w, h);
      const glow = (x: number, y: number, r: number, a: number) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(255,180,120,${a})`); g.addColorStop(0.3, `rgba(255,66,0,${a * 0.5})`); g.addColorStop(1, 'rgba(255,66,0,0)');
        ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      };
      if (kind === 'rings') {
        const px = cx + (mx - 0.5) * w * 0.5, py = cy + (my - 0.45) * h * 0.3; glow(px, py, u * 0.32, 0.7 + hover * 0.3);
        for (let i = 0; i < 14; i++) {
          const q = ((i / 14) + t * 0.08) % 1, dd = q * q;
          ctx.strokeStyle = `rgba(255,${(130 + q * 80) | 0},80,${Math.sin(q * Math.PI) * 0.6})`; ctx.lineWidth = k * (0.6 + dd * 2);
          ctx.beginPath(); ctx.ellipse(px + dd * w * 0.6, py - dd * h * 0.15, 8 * k + dd * u * 0.9, 6 * k + dd * u * 1.05, 0, 0, Math.PI * 2); ctx.stroke();
        }
      } else if (kind === 'columns') {
        glow(cx, cy + u * 0.15, u * 0.5, 0.5); const bw = w / 14;
        cols.forEach((col, i) => {
          const x = bw * (1.4 + i * 1.25), near = 1 - Math.min(1, Math.abs(mx * w - x) / (w * 0.3));
          const target = clamp(col.h + Math.sin(t * 1.4 + col.p) * 0.12 + near * hover * 0.35, 0.08, 0.98); col.cur = lerp(col.cur ?? target, target, 0.1);
          const top = h * 0.82 - col.cur * h * 0.62, g = ctx.createLinearGradient(0, top, 0, h * 0.82);
          g.addColorStop(0, 'rgba(255,220,180,.95)'); g.addColorStop(0.3, 'rgba(255,110,40,.7)'); g.addColorStop(1, 'rgba(255,66,0,.05)');
          ctx.fillStyle = g; ctx.beginPath();
          if (typeof ctx.roundRect === 'function') ctx.roundRect(x, top, bw * 0.55, h * 0.82 - top, bw * 0.3); else ctx.rect(x, top, bw * 0.55, h * 0.82 - top);
          ctx.fill();
        });
      } else if (kind === 'orb') {
        const r = u * (0.16 + hover * 0.03 + Math.sin(t * 2) * 0.006); glow(cx, cy, u * 0.55, 0.45 + hover * 0.3);
        const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, 0, cx, cy, r); g.addColorStop(0, '#fff'); g.addColorStop(0.35, '#ffb27a'); g.addColorStop(1, '#ff4200');
        ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) {
          ctx.strokeStyle = `rgba(255,170,110,${0.5 - i * 0.12})`; ctx.lineWidth = k; ctx.beginPath();
          ctx.ellipse(cx, cy, u * (0.42 + i * 0.05), u * (0.18 + i * 0.03), (mx - 0.5) * 0.8 + i * 0.25 + t * 0.15 * (i % 2 ? -1 : 1), 0, Math.PI * 2); ctx.stroke();
        }
        const a = t * 1.2; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * u * 0.42, cy + Math.sin(a) * u * 0.18, 2.5 * k, 0, Math.PI * 2); ctx.fill();
      } else if (kind === 'waves') {
        glow(cx, cy, u * 0.45, 0.35 + hover * 0.3);
        for (let L = 0; L < 5; L++) {
          ctx.beginPath();
          for (let x = 0; x <= w; x += 3 * k) {
            const n = x / w, env2 = Math.sin(n * Math.PI), dist = Math.exp(-Math.pow((n - mx) * 3, 2)) * hover;
            const y = cy + Math.sin(n * 14 + t * (2 + L * 0.5) + L) * env2 * u * (0.08 + L * 0.025) * (1 + dist * 1.6);
            if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          }
          ctx.strokeStyle = `rgba(255,${120 + L * 25},${60 + L * 15},${0.75 - L * 0.12})`; ctx.lineWidth = k * (L ? 1 : 2); ctx.stroke();
        }
      } else if (kind === 'agents') {
        const px = cx + (mx - 0.5) * u * 0.3, py = cy + (my - 0.45) * u * 0.3; glow(px, py, u * 0.3, 0.6 + hover * 0.3);
        const pts = sparks.map(s => { const a = s.a + t * s.s * (1 + hover); return [cx + Math.cos(a) * u * (s.r + 0.12), cy + Math.sin(a * 1.3) * u * (s.r + 0.08)] as const; });
        pts.forEach(([x, y], i) => {
          ctx.strokeStyle = `rgba(255,140,80,${0.25 + hover * 0.35})`; ctx.lineWidth = k; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
          const q = pts[(i + 2) % pts.length]; ctx.strokeStyle = 'rgba(255,120,60,.12)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(q[0], q[1]); ctx.stroke();
          glow(x, y, u * 0.06, 0.8);
        });
        const q = (t * 0.8) % 1, j = ((t * 0.8) | 0) % pts.length; ctx.fillStyle = '#fff'; ctx.beginPath();
        ctx.arc(lerp(px, pts[j][0], q), lerp(py, pts[j][1], q), 2.2 * k, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px, py, u * 0.045, 0, Math.PI * 2); ctx.fill();
      }
    });
    return () => { ac.abort(); remove(); };
  }, [host, kind]);

  return variant === 'card'
    ? <span ref={setHost} className="art" aria-hidden="true" data-art={kind}><canvas /></span>
    : <div ref={setHost} className="hero-art" data-art={kind} aria-hidden="true"><canvas /></div>;
}

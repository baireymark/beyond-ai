'use client';
// Full-bleed canvas backgrounds. ParticleField: the light tunnel (homepage hero, CTAs) and ember drift (inner-page
// heroes); the vanishing point follows the pointer and tunnels pulse on click. LightTunnel: the 404 page's variant.
// Purely decorative: the CSS glow on .tunnel-host remains if canvas is unavailable.
import { useEffect, useState } from 'react';
import { clamp, fit, isSmall, lerp, motion } from '@/lib/motion';

interface Particle { a: number; z: number; s: number; x: number; y: number }

export function ParticleField({ kind, cy = 0.6 }: { kind: 'tunnel' | 'drift'; cy?: number }) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!host) return;
    const canvas = host.querySelector('canvas')!;
    const ctx = canvas.getContext('2d');
    if (!ctx) { host.classList.add('no-field'); return; }
    const { env, add } = motion();
    const section = host.parentElement!;
    const DPR = env.bgDpr, DENSITY = isSmall() ? 0.45 : env.lowPower ? 0.65 : 1;
    const tunnel = kind === 'tunnel';
    const st = { vx: 0.5, vy: cy, tx: 0.5, ty: cy, boost: 0, z: 0, pulses: [] as number[] };
    const count = Math.round((tunnel ? 240 : 120) * DENSITY);
    const rings = tunnel ? Math.round(24 * Math.max(0.6, DENSITY)) : 0;
    const P: Particle[] = Array.from({ length: count }, () => ({ a: Math.random() * Math.PI * 2, z: Math.random(), s: 0.4 + Math.random() * 1.4, x: Math.random(), y: Math.random() }));
    const ac = new AbortController();

    if (env.fine) {
      section.addEventListener('pointermove', e => {
        const r = host.getBoundingClientRect();
        st.tx = 0.5 + ((e.clientX - r.left) / r.width - 0.5) * 0.36;
        st.ty = cy + ((e.clientY - r.top) / r.height - 0.5) * 0.28;
      }, { passive: true, signal: ac.signal });
      section.addEventListener('pointerleave', () => { st.tx = 0.5; st.ty = cy; }, { signal: ac.signal });
    }
    if (tunnel) section.addEventListener('click', e => {
      if (env.reduce || (e.target as Element).closest('a,button,input,textarea,select,form,label')) return;
      st.pulses.push(0); st.boost = 2.2;
    }, { signal: ac.signal });

    function draw(t: number, dt: number) {
      const [w, h] = fit(canvas, DPR);
      st.vx = lerp(st.vx, st.tx, 0.05); st.vy = lerp(st.vy, st.ty, 0.05); st.boost = lerp(st.boost, 0, 0.04);
      const cx = st.vx * w, cyy = st.vy * h, M = Math.max(w, h);
      ctx!.globalCompositeOperation = 'source-over';
      ctx!.fillStyle = tunnel ? 'rgba(10,8,7,.42)' : 'rgba(10,8,7,.5)';
      ctx!.fillRect(0, 0, w, h);
      const core = ctx!.createRadialGradient(cx, cyy, 0, cx, cyy, M * (tunnel ? 0.32 : 0.4));
      core.addColorStop(0, tunnel ? `rgba(255,${(150 + st.boost * 30) | 0},90,${0.5 + st.boost * 0.15})` : 'rgba(255,140,80,.18)');
      core.addColorStop(0.25, tunnel ? 'rgba(255,66,0,.2)' : 'rgba(255,66,0,.07)');
      core.addColorStop(1, 'rgba(255,66,0,0)');
      ctx!.globalCompositeOperation = 'lighter'; ctx!.fillStyle = core; ctx!.fillRect(0, 0, w, h);
      if (tunnel) {
        st.z = (st.z + dt * (0.09 + st.boost * 0.25)) % 1;
        for (let i = 0; i < rings; i++) {
          const k = ((i / rings) + st.z) % 1, d = Math.pow(k, 2.6), rx = 12 * DPR + d * M * 1.25, ry = rx * (0.78 + 0.22 * k);
          const ox = cx + (0.5 * w - cx) * d * 0.9, oy = cyy + d * M * 0.55, a = Math.sin(k * Math.PI) * (0.55 + st.boost * 0.2);
          ctx!.strokeStyle = `rgba(255,${(120 + k * 60) | 0},${(50 + k * 40) | 0},${a * 0.5})`; ctx!.lineWidth = (0.6 + d * 2.4) * DPR;
          ctx!.beginPath(); ctx!.ellipse(ox, oy, rx, ry, 0, 0, Math.PI * 2); ctx!.stroke();
        }
        for (const p of P) {
          p.z += dt * p.s * (0.18 + st.boost * 0.4); if (p.z > 1) { p.z = 0; p.a = Math.random() * Math.PI * 2; }
          const d = Math.pow(p.z, 2.2), r = 8 * DPR + d * M * 0.9, x = cx + Math.cos(p.a) * r, y = cyy + Math.sin(p.a) * r * 0.8 + d * M * 0.25, al = Math.sin(p.z * Math.PI);
          ctx!.fillStyle = `rgba(255,${(170 + p.s * 40) | 0},120,${al * 0.8})`; const sz = (0.6 + d * 2.6) * DPR; ctx!.fillRect(x, y, sz, sz);
        }
        st.pulses = st.pulses.filter(p => p < 1.2);
        st.pulses.forEach((p, i) => {
          st.pulses[i] = p + dt * 0.9; const r = p * M * 0.9;
          ctx!.strokeStyle = `rgba(255,190,140,${(1 - p / 1.2) * 0.8})`; ctx!.lineWidth = 2 * DPR;
          ctx!.beginPath(); ctx!.ellipse(cx, cyy + p * M * 0.12, r, r * 0.8, 0, 0, Math.PI * 2); ctx!.stroke();
        });
      } else {
        for (const p of P) {
          p.y -= dt * p.s * 0.035; p.x += Math.sin(t * 0.4 + p.a) * dt * 0.006; if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
          const dx = p.x * w - cx, dy = p.y * h - cyy, near = Math.max(0, 1 - Math.hypot(dx, dy) / (M * 0.45));
          const al = (0.18 + near * 0.6) * Math.sin(clamp(p.y, 0, 1) * Math.PI);
          ctx!.fillStyle = `rgba(255,${(150 + p.s * 50) | 0},${(90 + p.s * 30) | 0},${al})`;
          const sz = (0.8 + p.s * 1.2 + near * 1.6) * DPR; ctx!.fillRect(p.x * w, p.y * h, sz, sz);
        }
      }
    }

    const remove = add(host, (t, dt, still) => { if (still) { for (let i = 0; i < 40; i++) draw(i * 0.05, 0.05); } else draw(t, dt); });
    return () => { ac.abort(); remove(); };
  }, [host, kind, cy]);

  return <div ref={setHost} className="tunnel-host" data-field={kind} data-cy={cy}><canvas aria-hidden="true" /></div>;
}

/** The original light tunnel: perspective rings flowing toward the viewer, with configurable density. */
export function LightTunnel({ rings: ringCount = 22, particles = 180, cy = 0.6, intensity = 1 }: { rings?: number; particles?: number; cy?: number; intensity?: number }) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!host) return;
    const canvas = host.querySelector('canvas')!;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { env, add } = motion();
    const section = host.parentElement!;
    const density = isSmall() ? 0.4 : env.lowPower ? 0.6 : 1;
    const rings = Math.round(ringCount * (isSmall() ? 0.65 : 1));
    const count = Math.round(particles * density);
    const st = { vx: 0.5, vy: cy, tx: 0.5, ty: cy, boost: 0, z: 0 };
    const P = Array.from({ length: count }, () => ({ a: Math.random() * Math.PI * 2, z: Math.random(), s: 0.4 + Math.random() * 1.4 }));
    const ac = new AbortController();

    if (env.fine) {
      section.addEventListener('pointermove', e => {
        const r = section.getBoundingClientRect();
        st.tx = 0.5 + ((e.clientX - r.left) / r.width - 0.5) * 0.36;
        st.ty = cy + ((e.clientY - r.top) / r.height - 0.5) * 0.28;
      }, { signal: ac.signal });
      section.addEventListener('pointerleave', () => { st.tx = 0.5; st.ty = cy; }, { signal: ac.signal });
    }

    const remove = add(host, (_t, dt, still) => {
      const [w, h, k] = fit(canvas, env.bgDpr);
      if (still) st.z = 0.37;
      st.vx = lerp(st.vx, st.tx, 0.05); st.vy = lerp(st.vy, st.ty, 0.05); st.boost = lerp(st.boost, 0, 0.04);
      st.z = (st.z + dt * (0.09 + st.boost * 0.25)) % 1;
      const cx = st.vx * w, cyy = st.vy * h, M = Math.max(w, h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = still ? 'rgb(10,8,7)' : 'rgba(10,8,7,.42)'; ctx.fillRect(0, 0, w, h);
      const core = ctx.createRadialGradient(cx, cyy, 0, cx, cyy, M * 0.32);
      core.addColorStop(0, `rgba(255,${(150 + st.boost * 30) | 0},90,${(0.55 + st.boost * 0.15) * intensity})`);
      core.addColorStop(0.25, `rgba(255,66,0,${0.22 * intensity})`); core.addColorStop(1, 'rgba(255,66,0,0)');
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = core; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < rings; i++) {
        const q = ((i / rings) + st.z) % 1, dd = Math.pow(q, 2.6), rx = 12 * k + dd * M * 1.25, ry = rx * (0.78 + 0.22 * q);
        const ox = cx + (0.5 * w - cx) * dd * 0.9, oy = cyy + dd * M * 0.55, a = Math.sin(q * Math.PI) * (0.55 + st.boost * 0.2);
        ctx.strokeStyle = `rgba(255,${(120 + q * 60) | 0},${(50 + q * 40) | 0},${a * 0.55})`; ctx.lineWidth = (0.6 + dd * 2.4) * k;
        ctx.beginPath(); ctx.ellipse(ox, oy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
      }
      for (const p of P) {
        p.z += (still ? 0 : dt) * p.s * (0.18 + st.boost * 0.4); if (p.z > 1) { p.z = 0; p.a = Math.random() * Math.PI * 2; }
        const dd = Math.pow(p.z, 2.2), r = 8 * k + dd * M * 0.9, x = cx + Math.cos(p.a) * r, y = cyy + Math.sin(p.a) * r * 0.8 + dd * M * 0.25;
        ctx.fillStyle = `rgba(255,${(170 + p.s * 40) | 0},120,${Math.sin(p.z * Math.PI) * 0.8})`; const sz = (0.6 + dd * 2.6) * k; ctx.fillRect(x, y, sz, sz);
      }
    });
    return () => { ac.abort(); remove(); };
  }, [host, ringCount, particles, cy, intensity]);

  return (
    <div ref={setHost} className="tunnel-host" data-tunnel="" data-rings={ringCount} data-particles={particles} data-cy={cy}>
      <canvas aria-hidden="true" />
    </div>
  );
}

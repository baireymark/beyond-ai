'use client';
// Homepage AI Education path: a light line drawn by scroll; module beads light up as the comet passes.
// Built on mount (it is decorative and aria-hidden), so the line never flashes fully drawn before JavaScript runs.
import { useEffect, useRef } from 'react';
import { clamp, lerp, motion } from '@/lib/motion';

const NS = 'http://www.w3.org/2000/svg';
// [x, y, label, label above the line, project bead] in a 1440×900 viewBox.
const beads: [number, number, string, boolean?, boolean?][] = [
  [135, 620, 'M01'], [245, 583, 'M02', true], [356, 555, 'P1', true, true], [466, 542, 'M04', true], [576, 544, 'M05'],
  [687, 564, 'P2', true, true], [797, 598, 'M07'], [908, 644, 'P3', true, true], [1018, 694, 'M09'], [1128, 742, 'P4', true, true], [1239, 784, 'M11'],
];

// Catmull-Rom spline through the beads, as cubic Béziers.
const pathData = (() => {
  const pts = [[80, 640], ...beads.map(b => [b[0], b[1]]), [1360, 814]];
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`;
  }
  return d;
})();

export function LearningPath() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current!;
    const section = host.closest('section')!;
    const { add } = motion();
    const place = <T extends HTMLElement>(el: T, x: number, y: number) => { el.style.left = x / 14.4 + '%'; el.style.top = y / 9 + '%'; return el; };
    const span = (cls: string) => { const s = document.createElement('span'); s.className = cls; return s; };

    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'path-svg'); svg.setAttribute('viewBox', '0 0 1440 900'); svg.setAttribute('preserveAspectRatio', 'none');
    svg.innerHTML = '<defs><linearGradient id="pathgrad" x1="0" x2="1"><stop offset="0" stop-color="#ff4200" stop-opacity=".2"/><stop offset=".6" stop-color="#ff9d58"/><stop offset="1" stop-color="#ffd2ae"/></linearGradient></defs><path class="ghost"/><path class="glow"/><path class="line"/>';
    svg.querySelectorAll('path').forEach(p => p.setAttribute('d', pathData));
    const nodes: Element[] = [svg];
    const beadEls = beads.map(([x, y, label, up, big]) => {
      const b = place(span(`bead${big ? ' big' : ''}${up ? ' up' : ''}`), x, y);
      const s = document.createElement('span'); s.textContent = big ? 'Project' : label; b.append(s);
      nodes.push(b); return b;
    });
    const cert = place(span('cert'), 1360, 814);
    const certLbl = place(span('cert-lbl'), 1245, 744); certLbl.textContent = '★ Certificate';
    const comet = span('comet');
    nodes.push(cert, certLbl, comet);
    host.append(...nodes);

    const line = svg.querySelector<SVGPathElement>('.line')!, glowP = svg.querySelector<SVGPathElement>('.glow')!, len = line.getTotalLength();
    [line, glowP].forEach(p => { p.style.strokeDasharray = String(len); p.style.strokeDashoffset = String(len); });
    let prog = 0, target = 0;
    const measure = () => { const r = section.getBoundingClientRect(); target = clamp((innerHeight * 0.85 - r.top) / (r.height * 0.9), 0, 1); };
    addEventListener('scroll', measure, { passive: true }); measure();
    const remove = add(section, (_t, _dt, still) => {
      prog = still ? 1 : lerp(prog, target, 0.08);
      const L = len * prog;
      [line, glowP].forEach(p => { p.style.strokeDashoffset = String(len - L); });
      const pt = line.getPointAtLength(L); place(comet, pt.x, pt.y); comet.style.opacity = prog > 0.01 && prog < 0.995 ? '1' : '0';
      beads.forEach(([x], i) => beadEls[i].classList.toggle('lit', pt.x >= x - 2)); cert.classList.toggle('lit', prog > 0.98);
    });

    return () => { removeEventListener('scroll', measure); remove(); nodes.forEach(n => n.remove()); };
  }, []);

  return <div className="path-host" data-path="" aria-hidden="true" ref={hostRef} />;
}

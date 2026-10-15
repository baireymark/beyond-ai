// Shared animation engine for the canvas effects (ported from the static site's site.js).
// One requestAnimationFrame loop drives every effect, only for hosts in view, and pauses while the tab is hidden.
// With reduced motion, each effect draws a single still frame instead. Imported by Client Components only;
// nothing here runs at module load, so it is safe during server rendering.

export type LoopFn = (t: number, dt: number, still: boolean) => void;

export interface MotionEnv {
  reduce: boolean;
  /** Mouse-like pointer that can hover. */
  fine: boolean;
  lowPower: boolean;
  /** Render scale for full-bleed glows (soft, so below 1x on phones and low-powered devices). */
  bgDpr: number;
  /** Render scale for the small product-art canvases (kept crisp). */
  artDpr: number;
}

interface Loop { host: Element; fn: LoopFn; vis: boolean }

interface Engine {
  env: MotionEnv;
  /** Registers an effect for `host`. Returns a function that removes it. */
  add(host: Element, fn: LoopFn): () => void;
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const isSmall = () => innerWidth < 700;

let engine: Engine | null = null;

export function motion(): Engine {
  engine ??= createEngine();
  return engine;
}

function createEngine(): Engine {
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  const lowPower = (nav.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory || 8) <= 4 || !!nav.connection?.saveData;
  const dpr = devicePixelRatio || 1;
  const env: MotionEnv = {
    reduce: reduceMQ.matches,
    fine: matchMedia('(hover: hover) and (pointer: fine)').matches,
    lowPower,
    bgDpr: isSmall() ? 0.75 : lowPower ? 1 : Math.min(dpr, 1.5),
    artDpr: Math.min(dpr, isSmall() ? 2 : 1.5),
  };

  const loops = new Set<Loop>();
  let raf = 0;
  let last = performance.now();

  const visIO = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => {
      for (const e of entries) for (const l of loops) if (l.host === e.target) l.vis = e.isIntersecting;
      kick();
    }, { rootMargin: '120px' })
    : null;

  function kick() {
    if (raf || env.reduce || document.hidden || ![...loops].some(l => l.vis)) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function frame(t: number) {
    raf = 0;
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    let any = false;
    for (const l of loops) if (l.vis) { l.fn(t / 1000, dt, false); any = true; }
    if (any && !document.hidden && !env.reduce) raf = requestAnimationFrame(frame);
  }

  const drawStill = () => loops.forEach(l => l.fn(2, 0, true));

  document.addEventListener('visibilitychange', kick);
  reduceMQ.addEventListener('change', e => {
    env.reduce = e.matches;
    if (env.reduce) { cancelAnimationFrame(raf); raf = 0; drawStill(); } else kick();
  });
  let resizeT: ReturnType<typeof setTimeout>;
  addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { if (env.reduce) drawStill(); }, 150);
  });

  return {
    env,
    add(host, fn) {
      const loop: Loop = { host, fn, vis: !visIO };
      loops.add(loop);
      visIO?.observe(host);
      if (env.reduce) requestAnimationFrame(() => fn(2, 0, true));
      return () => {
        loops.delete(loop);
        if (![...loops].some(l => l.host === host)) visIO?.unobserve(host);
      };
    },
  };
}

/** Sizes a canvas to its CSS box at scale `k`; returns the drawing-buffer size. */
export function fit(c: HTMLCanvasElement, k: number): [w: number, h: number, k: number] {
  const r = c.getBoundingClientRect();
  const w = Math.max(1, (r.width * k) | 0), h = Math.max(1, (r.height * k) | 0);
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  return [w, h, k];
}

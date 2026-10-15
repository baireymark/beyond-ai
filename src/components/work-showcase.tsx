'use client';
// Homepage "Selected work": app/website filters and keyboard-selectable project previews.
import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState, type KeyboardEvent } from 'react';
import type { Project } from '@/content/portfolio';
import { pad } from './ui';

export interface FeaturedProject extends Pick<Project, 'type' | 'name' | 'img' | 'url'> { sector: string }

export function WorkShowcase({ featured, counts }: { featured: FeaturedProject[]; counts: { apps: number; sites: number; total: number } }) {
  const [type, setType] = useState<Project['type']>('app');
  const [selected, setSelected] = useState(featured[0].img);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const visible = featured.filter(p => p.type === type);
  const current = featured.find(p => p.img === selected)!;

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, img: string) => {
    const i = visible.findIndex(p => p.img === img);
    let next: FeaturedProject | undefined;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = visible[(i + 1) % visible.length];
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = visible[(i - 1 + visible.length) % visible.length];
    if (e.key === 'Home') next = visible[0];
    if (e.key === 'End') next = visible.at(-1);
    if (next) { e.preventDefault(); setSelected(next.img); buttons.current.get(next.img)?.focus({ preventScroll: true }); }
  };

  const chooseType = (t: Project['type']) => { setType(t); setSelected(featured.find(p => p.type === t)!.img); };

  return (
    <div className="showcase" data-showcase>
      <div className="showcase-toolbar">
        <p className="p-mono">Selected work <span aria-hidden="true">/</span> <b>2026</b></p>
        <div className="showcase-filters" role="group" aria-label="Project type">
          <button type="button" data-show-type="app" aria-pressed={type === 'app'} onClick={() => chooseType('app')}>Apps <span>{counts.apps}</span></button>
          <button type="button" data-show-type="website" aria-pressed={type === 'website'} onClick={() => chooseType('website')}>Websites <span>{counts.sites}</span></button>
        </div>
      </div>
      <div className="showcase-body">
        <div className="showcase-stage">
          {featured.map(p => {
            const app = p.type === 'app';
            return (
              <article key={p.img} className={`project-panel ${p.type}`} id={`project-${p.img}`} data-project-panel={p.img} aria-labelledby={`project-title-${p.img}`} hidden={p.img !== selected}>
                <a className="project-visual" href={p.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${p.name} ${app ? 'store listing' : 'website'} (opens in a new tab)`}>
                  <span className="project-halo" aria-hidden="true" />
                  <span className="project-watermark" aria-hidden="true" data-text={app ? 'IN YOUR HANDS.' : 'ON YOUR SCREEN.'} />
                  <span className="project-device">
                    <Image
                      src={`/img/portfolio/${p.img}-${app ? '560' : '1200'}.webp`}
                      alt={`${p.name} ${app ? 'app' : 'website'} preview`}
                      width={app ? 560 : 1200} height={app ? 1120 : 750}
                      sizes={app ? '180px' : '(max-width: 900px) 84vw, 50vw'}
                    />
                  </span>
                  <span className="project-open" aria-hidden="true">↗</span>
                </a>
                <div className="project-caption">
                  <div><p className="p-mono">{p.sector}</p><h3 id={`project-title-${p.img}`}>{p.name}</h3></div>
                  <a className="text-link" href={p.url} target="_blank" rel="noopener noreferrer">{app ? 'View app' : 'Visit website'} ↗<span className="sr-only"> (opens in a new tab)</span></a>
                </div>
              </article>
            );
          })}
        </div>
        <div className="project-index" role="group" aria-label="Choose a project">
          {featured.map((p, i) => (
            <button
              key={p.img} type="button" className="project-choice" data-project={p.img} data-project-type={p.type}
              aria-controls={`project-${p.img}`} aria-pressed={p.img === selected} hidden={p.type !== type}
              ref={el => { if (el) buttons.current.set(p.img, el); else buttons.current.delete(p.img); }}
              onClick={() => setSelected(p.img)} onKeyDown={e => onKeyDown(e, p.img)}
            >
              <span className="p-mono project-number">{pad((i % 4) + 1)}</span>
              <span className="project-label"><strong>{p.name}</strong><small>{p.sector}</small></span>
              <span className="project-arrow" aria-hidden="true">↗</span>
            </button>
          ))}
          <div className="project-index-foot">
            <span className="p-mono">Built to be used.<br />Designed to be felt.</span>
            <Link className="text-link" href="/portfolio">Explore all {counts.total} projects →</Link>
          </div>
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite" data-project-status>Showing {current.name}.</p>
    </div>
  );
}

'use client';
// Portfolio search and app/website filter. The selected type is kept in ?type= so filtered views can be shared.
// Without JavaScript every project is listed.
import Image from 'next/image';
import { useState, useSyncExternalStore } from 'react';
import type { Project } from '@/content/portfolio';
import { NewTab, Tag } from './ui';

type Filter = 'all' | Project['type'];

function AppShot({ p }: { p: Project }) {
  return (
    <span className="shot">
      <Image src={`/img/portfolio/${p.img}-560.webp`} alt={`${p.name} app screen`} width={320} height={640} sizes="(max-width: 600px) 45vw, 220px" />
    </span>
  );
}

function ProjectCard({ p, hidden }: { p: Project; hidden: boolean }) {
  const key = p.name.toLowerCase();
  if (p.type === 'website') {
    return (
      <li className="work-card site" data-name={key} hidden={hidden}>
        <a href={p.url} target="_blank" rel="noopener noreferrer">
          <span className="shot">
            <Image src={`/img/portfolio/${p.img}-1200.webp`} alt={`${p.name} website home page`} width={640} height={400} sizes="(max-width: 700px) 92vw, (max-width: 1100px) 45vw, 30vw" />
          </span>
          <span className="meta"><b>{p.name}</b><span className="p-mono">{new URL(p.url).hostname.replace(/^www\./, '')} ↗</span><NewTab /></span>
        </a>
      </li>
    );
  }
  // Listings that no longer resolve stay in the portfolio as shipped work, but without a dead link.
  return p.live ? (
    <li className="work-card app" data-name={key} hidden={hidden}>
      <a href={p.url} target="_blank" rel="noopener noreferrer">
        <AppShot p={p} />
        <span className="meta"><b>{p.name}</b><span className="p-mono">{p.store} ↗</span><NewTab /></span>
      </a>
    </li>
  ) : (
    <li className="work-card app offline" data-name={key} hidden={hidden}>
      <div>
        <AppShot p={p} />
        <span className="meta"><b>{p.name}</b><span className="p-mono">Store listing unavailable</span></span>
      </div>
    </li>
  );
}

// ?type= from the address bar. The server (and hydration) see no query, so the prerendered page lists everything.
const subscribeToHistory = (onChange: () => void) => { addEventListener('popstate', onChange); return () => removeEventListener('popstate', onChange); };
const typeFromUrl = (): Filter => { const t = new URLSearchParams(location.search).get('type'); return t === 'app' || t === 'website' ? t : 'all'; };
const noSubscription = () => () => {};

export function PortfolioBrowser({ apps, sites }: { apps: Project[]; sites: Project[] }) {
  const [term, setTerm] = useState('');
  const [picked, setPicked] = useState<Filter | null>(null);
  const urlFilter = useSyncExternalStore(subscribeToHistory, typeFromUrl, () => 'all' as Filter);
  const hydrated = useSyncExternalStore(noSubscription, () => true, () => false);
  const filter = picked ?? urlFilter;

  const choose = (f: Filter) => {
    setPicked(f);
    const url = new URL(location.href);
    if (f === 'all') url.searchParams.delete('type'); else url.searchParams.set('type', f);
    history.replaceState(history.state, '', url);
  };

  const q = term.trim().toLowerCase();
  const shows = (p: Project) => (filter === 'all' || filter === p.type) && (!q || p.name.toLowerCase().includes(q));
  const shownApps = apps.filter(shows), shownSites = sites.filter(shows);
  const shown = shownApps.length + shownSites.length, total = apps.length + sites.length;
  const status = !hydrated ? '' : q ? `${shown} of ${total} projects match “${term.trim()}”` : `Showing ${shown} projects.`;

  return (
    <>
      <section className="p-section work-section" aria-labelledby="apps-h" data-filter-scope="">
        <div className="work-head">
          <div><Tag>Mobile apps</Tag><h2 className="sec-h" id="apps-h">Apps we’ve built.</h2></div>
          <div className="filter" role="search">
            <label htmlFor="work-q" className="p-mono">Search the portfolio</label>
            <input id="work-q" type="search" placeholder="e.g. Pilates, AI, car" autoComplete="off" data-filter-input="" value={term} onChange={e => setTerm(e.target.value)} />
            <p className="p-mono" role="status" aria-live="polite" data-filter-status="">{status}</p>
          </div>
        </div>
        <div className="portfolio-types" role="group" aria-label="Filter portfolio by type">
          <button type="button" data-portfolio-type="all" aria-pressed={filter === 'all'} onClick={() => choose('all')}>All projects</button>
          <button type="button" data-portfolio-type="app" aria-pressed={filter === 'app'} onClick={() => choose('app')}>Apps · {apps.length}</button>
          <button type="button" data-portfolio-type="website" aria-pressed={filter === 'website'} onClick={() => choose('website')}>Websites · {sites.length}</button>
        </div>
        <ul className="work-grid apps" hidden={!shownApps.length}>{apps.map(p => <ProjectCard key={p.img} p={p} hidden={!shows(p)} />)}</ul>
      </section>
      <section className="p-section work-section" id="websites" aria-labelledby="sites-h">
        <Tag>Websites</Tag>
        <h2 className="sec-h" id="sites-h">Websites and stores.</h2>
        <ul className="work-grid sites" hidden={!shownSites.length}>{sites.map(p => <ProjectCard key={p.img} p={p} hidden={!shows(p)} />)}</ul>
        <p className="note">Screenshots were captured from each live site. Product names and trademarks belong to their owners.</p>
      </section>
    </>
  );
}

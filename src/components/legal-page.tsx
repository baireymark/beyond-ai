// Shared layout for the privacy notice and terms: heading, table of contents and sections.
import { Fragment, type ReactNode } from 'react';
import type { Crumb } from '@/lib/seo';
import { Crumbs, Tag } from './ui';

export interface LegalSection { id: string; title: string; body: ReactNode }

export const LEGAL_UPDATED = '15 October 2026';

export function LegalPage({ trail, title, intro, sections }: { trail: Crumb[]; title: string; intro: ReactNode; sections: LegalSection[] }) {
  return (
    <>
      <section className="p-section legal-hero">
        <Crumbs trail={trail} />
        <Tag>Last updated {LEGAL_UPDATED}</Tag>
        <h1 className="sec-h xl" id="page-title">{title}</h1>
        <p className="sec-lede">{intro}</p>
      </section>
      <section className="p-section legal" aria-labelledby="page-title">
        <nav className="toc" aria-label="Contents">
          <p className="p-mono">Contents</p>
          <ol>{sections.map(s => <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>)}</ol>
        </nav>
        <div className="prose">{sections.map(s => <Fragment key={s.id}><h2 id={s.id}>{s.title}</h2>{s.body}</Fragment>)}</div>
      </section>
    </>
  );
}

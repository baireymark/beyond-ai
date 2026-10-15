import Link from 'next/link';
import { JsonLd } from '@/components/json-ld';
import { Cta, CtaBand, PageHero, Tag, TickList, pad, withBrand } from '@/components/ui';
import { education as e } from '@/content/education';
import { site } from '@/content/site';
import { breadcrumbLd, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'AI Education — learn AI with no code',
  description: 'A practical, no-code AI course from BeyondAi: 11 modules, 4 hands-on projects and a certificate. For students, professionals, managers, founders and creators.',
  path: '/ai-education',
});

const trail = [{ href: '/', label: 'Home' }, { href: '/ai-education', label: 'AI Education' }];
const enquire = '/contact?topic=course';

export default function EducationPage() {
  const jsonLd = [breadcrumbLd(trail), {
    '@context': 'https://schema.org', '@type': 'Course', name: 'AI Education — AI for non-technical people',
    description: e.intro, provider: { '@type': 'Organization', name: site.brand, sameAs: site.url + '/' },
  }];
  return (
    <>
      <JsonLd data={jsonLd} />
      <PageHero
        trail={trail}
        eyebrow="No coding required"
        title={<>Learn AI. <span className="r">No code.</span></>}
        lede={<>{e.headline} {withBrand(e.intro)}</>}
        actions={<><Cta href={enquire}>Enquire about the course</Cta><Cta href="/contact?topic=training" ghost>Train your team</Cta></>}
      />
      <section className="p-section" aria-labelledby="get-h">
        <Tag>What you walk away with</Tag>
        <h2 className="sr-only" id="get-h">What you walk away with</h2>
        <dl className="facts">{e.facts.map(([n, l]) => <div key={l}><dt className="p-mono">{l}</dt><dd>{n}</dd></div>)}</dl>
        <ul className="principle-list">{e.principles.map(([t, d]) => <li key={t}><h3>{t}</h3><p>{d}</p></li>)}</ul>
      </section>
      <section className="p-section split-layout" aria-labelledby="why-h">
        <div><Tag>Why it matters</Tag><h2 className="sec-h" id="why-h">{e.why.title}</h2></div>
        <div className="prose">
          <p>{e.why.text}</p>
          <ol className="feature-grid three tight">
            {e.why.goals.map(([t, d], i) => <li className="feature" key={t}><span className="p-mono" aria-hidden="true">{pad(i + 1)}</span><h3>{t}</h3><p>{d}</p></li>)}
          </ol>
          <h3 className="sub-h">Where AI is already changing work</h3>
          <TickList items={e.why.changing} />
        </div>
      </section>
      <section className="p-section" aria-labelledby="learn-h">
        <Tag>Curriculum</Tag>
        <h2 className="sec-h" id="learn-h">From the basics to modern AI.</h2>
        <p className="sec-lede">Eleven modules take you from what AI is to how today’s systems work and how to use them well. Topics covered include:</p>
        <ul className="chips">{e.topics.map(t => <li key={t}>{t}</li>)}</ul>
        <p className="note">Want the module-by-module syllabus? <Link href={enquire}>Ask us for the full curriculum</Link>.</p>
      </section>
      <section className="p-section" aria-labelledby="who-h">
        <Tag>Who this is for</Tag>
        <h2 className="sec-h" id="who-h">Designed for people who don’t call themselves “tech.”</h2>
        <ul className="grid-3 cards">{e.audiences.map(([t, d]) => <li className="card" key={t}><h3>{t}</h3><p>{d}</p></li>)}</ul>
      </section>
      <section className="p-section" aria-labelledby="proj-h">
        <Tag>Projects and certificate</Tag>
        <h2 className="sec-h" id="proj-h">Proof, not promises.</h2>
        <p className="sec-lede">You finish with real work you can show: three mini-projects and a capstone that demonstrate understanding, practical use and responsible AI practice.</p>
        <ol className="feature-grid four">
          {e.projects.map((p, i) => (
            <li className={`feature${p.capstone ? ' capstone' : ''}`} key={p.title}>
              <span className="p-mono" aria-hidden="true">{p.capstone ? 'Capstone' : `Project ${pad(i + 1)}`}</span>
              <h3>{p.title}</h3><p>{p.text}</p><p className="p-mono deliv">{p.tags.join(' · ')}</p>
            </li>
          ))}
        </ol>
        <div className="cert-card">
          <div className="cert-glow" aria-hidden="true" />
          <div><p className="p-mono">Upon completion</p><h3>Certificate of Completion</h3><p>{e.certificate}</p></div>
        </div>
      </section>
      <section className="p-section" aria-labelledby="teach-h">
        <Tag>How we teach</Tag>
        <h2 className="sec-h" id="teach-h">Supported every step.</h2>
        <TickList items={e.teaching} className="ticks cols" />
      </section>
      <CtaBand
        title={<>Your AI future<br />starts here.</>}
        text="Ask about the next intake, group plans or AI training for your team. We aim to reply within 24 hours."
        primary={[enquire, 'Enquire about the course']}
        secondary={['/contact?topic=training', 'Corporate training']}
      />
    </>
  );
}

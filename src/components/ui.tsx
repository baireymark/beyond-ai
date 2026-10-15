// Small building blocks shared by every page (the static site's templates/ui.mjs). No hooks or server-only APIs,
// so they render in Server Components and can also be used inside Client Components.
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Crumb } from '@/lib/seo';
import { ParticleField } from './particle-field';
import { Split } from './split';

export const pad = (n: number) => String(n).padStart(2, '0');

/** The brand name inside running copy. Wrapped so uppercase display styles never alter its capitalization. */
export const Brand = () => <span className="bn">BeyondAi</span>;

/** Replaces the first "BeyondAi" in a plain string with <Brand />. */
export function withBrand(text: string): ReactNode {
  const at = text.indexOf('BeyondAi');
  return at === -1 ? text : <>{text.slice(0, at)}<Brand />{text.slice(at + 8)}</>;
}

/** The wordmark: Montserrat, exact capitalization, always linked home. */
export function Wordmark({ eager = false }: { eager?: boolean }) {
  return (
    <Link className="brand" href="/" aria-label="BeyondAi home">
      <Image src="/img/brand/mark-96.png" alt="" width={34} height={34} loading={eager ? 'eager' : 'lazy'} />
      <span className="wordmark" aria-hidden="true">Beyond<span>Ai</span></span>
    </Link>
  );
}

const isInternal = (href: string) => href.startsWith('/') && !href.startsWith('//');

/** Pill-shaped call to action. Internal links use client-side navigation. */
export function Cta({ href, children, ghost = false, small = false, ext = false }: { href: string; children: ReactNode; ghost?: boolean; small?: boolean; ext?: boolean }) {
  const className = `p-cta${ghost ? ' ghost' : ''}${small ? ' sm' : ''}`;
  const content = <>{children}{ghost ? null : <>{' '}<i aria-hidden="true" /></>}</>;
  if (isInternal(href) && !ext) return <Link className={className} href={href}>{content}</Link>;
  return <a className={className} href={href} {...(ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{content}</a>;
}

export const TextLink = ({ href, children }: { href: string; children: ReactNode }) => <Link className="text-link" href={href}>{children}</Link>;

export const Tag = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <p className={`p-mono p-tag${className ? ` ${className}` : ''}`}>{children}</p>
);

export const Display = ({ level, id, className = '', children }: { level: 1 | 2; id?: string; className?: string; children: ReactNode }) => (
  <Split as={level === 1 ? 'h1' : 'h2'} id={id} className={`p-display${className ? ` ${className}` : ''}`}>{children}</Split>
);

export function Crumbs({ trail }: { trail: Crumb[] }) {
  return (
    <nav className="crumbs p-mono" aria-label="Breadcrumb">
      <ol>
        {trail.map((c, i) => (i < trail.length - 1
          ? <li key={c.href}><Link href={c.href}>{c.label}</Link></li>
          : <li key={c.href} aria-current="page">{c.label}</li>))}
      </ol>
    </nav>
  );
}

/** Inner-page hero: the drifting ember field behind accessible HTML content. */
export function PageHero({ trail, eyebrow, title, lede, actions, aside, cy = 0.62 }: {
  trail: Crumb[]; eyebrow?: ReactNode; title: ReactNode; lede?: ReactNode; actions?: ReactNode; aside?: ReactNode; cy?: number;
}) {
  return (
    <section className="page-hero" aria-labelledby="page-title">
      <ParticleField kind="drift" cy={cy} /><div className="vignette" aria-hidden="true" />
      <div className={`page-hero-in${aside ? ' has-aside' : ''}`}>
        <div>
          <Crumbs trail={trail} />
          {eyebrow ? <Tag>{eyebrow}</Tag> : null}
          <Display level={1} id="page-title">{title}</Display>
          {lede ? <p className="lede">{lede}</p> : null}
          {actions ? <div className="actions">{actions}</div> : null}
        </div>
        {aside}
      </div>
    </section>
  );
}

/** Closing call to action used at the end of inner pages. */
export function CtaBand({
  title = <>Let’s design<br />what’s next.</>,
  text = 'Tell us what you are working on. We aim to reply within 24 hours.',
  primary = ['/contact', 'Book a consultation'],
  secondary,
}: { title?: ReactNode; text?: ReactNode; primary?: [href: string, label: string]; secondary?: [href: string, label: string] }) {
  return (
    <section className="cta-band" aria-labelledby="cta-title">
      <ParticleField kind="tunnel" cy={0.78} /><div className="vignette" aria-hidden="true" />
      <div className="cta-in">
        <Split as="h2" id="cta-title" className="cta-h">{title}</Split>
        <p className="rv">{text}</p>
        <div className="actions rv">
          <Cta href={primary[0]}>{primary[1]}</Cta>
          {secondary ? <Cta href={secondary[0]} ghost>{secondary[1]}</Cta> : null}
        </div>
      </div>
    </section>
  );
}

export const TickList = ({ items, className = 'ticks' }: { items: ReactNode[]; className?: string }) => (
  <ul className={className}>{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
);

/** Numbered feature cards (<ol class="feature-grid …">). */
export const FeatureGrid = ({ items, className = '' }: { items: [title: string, text: string][]; className?: string }) => (
  <ol className={`feature-grid${className ? ` ${className}` : ''}`}>
    {items.map(([title, text], i) => (
      <li className="feature" key={title}><span className="p-mono" aria-hidden="true">{pad(i + 1)}</span><h3>{title}</h3><p>{text}</p></li>
    ))}
  </ol>
);

export const NewTab = () => <span className="sr-only"> (opens in a new tab)</span>;

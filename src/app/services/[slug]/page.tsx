import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/json-ld';
import { Cta, CtaBand, FeatureGrid, PageHero, Tag, TextLink, TickList, pad, withBrand } from '@/components/ui';
import { portfolio } from '@/content/portfolio';
import { services } from '@/content/services';
import { breadcrumbLd, pageMetadata } from '@/lib/seo';

// Every service page is generated at build time; any other slug is a 404.
export const dynamicParams = false;
export const generateStaticParams = () => services.map(s => ({ slug: s.slug }));

type Props = { params: Promise<{ slug: string }> };

const find = (slug: string) => services.find(s => s.slug === slug);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = find((await params).slug);
  return s ? pageMetadata({ title: s.name, description: s.summary, path: `/services/${s.slug}` }) : {};
}

export default async function ServicePage({ params }: Props) {
  const s = find((await params).slug);
  if (!s) notFound();
  const i = services.indexOf(s);
  const next = services[(i + 1) % services.length];
  const trail = [{ href: '/', label: 'Home' }, { href: '/services', label: 'Services' }, { href: `/services/${s.slug}`, label: s.name }];
  const consult = `/contact?topic=consultation&service=${encodeURIComponent(s.name)}`;
  const showcase = s.portfolio ? portfolio.filter(p => p.type === 'app' && p.live).slice(0, 4) : [];

  return (
    <>
      <JsonLd data={[breadcrumbLd(trail)]} />
      <PageHero
        trail={trail}
        eyebrow={`Service ${pad(i + 1)} / ${pad(services.length)}`}
        title={s.name}
        lede={s.summary}
        actions={<><Cta href={consult}>Discuss your project</Cta><Cta href="/services" ghost>All services</Cta></>}
      />
      <section className="p-section split-layout" aria-labelledby="ov-h">
        <div><Tag>Overview</Tag><h2 className="sec-h" id="ov-h">Why it matters.</h2></div>
        <div className="prose">{s.intro.map(t => <p key={t}>{withBrand(t)}</p>)}</div>
      </section>
      <section className="p-section" aria-labelledby="areas-h">
        <Tag>Focus areas</Tag>
        <h2 className="sec-h" id="areas-h">How we help.</h2>
        <FeatureGrid className="four" items={s.areas} />
      </section>
      <section className="p-section grid-2" aria-label="Capabilities and fit">
        <div><Tag>Capabilities</Tag><h2 className="sec-h sm">What’s included</h2><TickList items={s.capabilities} /></div>
        <div><Tag>Good fit when</Tag><h2 className="sec-h sm">Is this you?</h2><TickList items={s.fit} /></div>
      </section>
      {showcase.length ? (
        <section className="p-section" aria-labelledby="show-h">
          <Tag>Recent work</Tag>
          <h2 className="sec-h" id="show-h">Apps we’ve shipped.</h2>
          <ul className="mini-tiles">
            {showcase.map(p => (
              <li key={p.img}>
                <a href={p.url} target="_blank" rel="noopener noreferrer">
                  <Image src={`/img/portfolio/${p.img}-560.webp`} alt={`${p.name} app screen`} width={320} height={640} sizes="(max-width: 700px) 45vw, 240px" />
                  <span>{p.name} <span aria-hidden="true">↗</span><span className="sr-only"> ({p.store}, opens in a new tab)</span></span>
                </a>
              </li>
            ))}
          </ul>
          <p><TextLink href="/portfolio">See the full portfolio →</TextLink></p>
        </section>
      ) : null}
      <nav className="p-section next-link" aria-label="Next service">
        <Link href={`/services/${next.slug}`}><span className="p-mono">Next service</span><span className="big">{next.name} <span aria-hidden="true">→</span></span></Link>
      </nav>
      <CtaBand
        text={`Tell us where you are today and where you want to be. We will suggest a practical first step for ${s.name}.`}
        primary={[consult, 'Book a consultation']}
      />
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/json-ld';
import { ProductArt } from '@/components/product-art';
import { Cta, CtaBand, FeatureGrid, PageHero, Tag, TickList, pad, withBrand } from '@/components/ui';
import { products } from '@/content/products';
import { breadcrumbLd, pageMetadata } from '@/lib/seo';

// Every product page is generated at build time; any other slug is a 404.
export const dynamicParams = false;
export const generateStaticParams = () => products.map(p => ({ slug: p.slug }));

type Props = { params: Promise<{ slug: string }> };

const find = (slug: string) => products.find(p => p.slug === slug);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = find((await params).slug);
  return p ? pageMetadata({ title: `${p.name} — ${p.category}`, description: p.summary, path: `/products/${p.slug}` }) : {};
}

export default async function ProductPage({ params }: Props) {
  const p = find((await params).slug);
  if (!p) notFound();
  const i = products.indexOf(p);
  const next = products[(i + 1) % products.length];
  const trail = [{ href: '/', label: 'Home' }, { href: '/products', label: 'Products' }, { href: `/products/${p.slug}`, label: p.name }];
  const demo = `/contact?topic=demo&product=${encodeURIComponent(p.name)}`;

  return (
    <>
      <JsonLd data={[breadcrumbLd(trail)]} />
      <PageHero
        trail={trail}
        eyebrow={`Product ${pad(i + 1)} · ${p.category}`}
        title={p.name}
        lede={p.summary}
        actions={<><Cta href={demo}>Request a demo</Cta><Cta href="/products" ghost>All products</Cta></>}
        aside={<ProductArt kind={p.art} variant="hero" />}
      />
      <section className="p-section split-layout" aria-labelledby="ov-h">
        <div><Tag>Overview</Tag><h2 className="sec-h" id="ov-h">What {p.name} does.</h2></div>
        <div className="prose">{p.intro.map(t => <p key={t}>{withBrand(t)}</p>)}</div>
      </section>
      <section className="p-section" aria-labelledby="feat-h">
        <Tag>Key features</Tag>
        <h2 className="sec-h" id="feat-h">Everything in one place.</h2>
        <FeatureGrid items={p.features} />
      </section>
      <section className="p-section grid-2" aria-label="Who it is for and outcomes">
        <div><Tag>Who it’s for</Tag><h2 className="sec-h sm">Made for</h2><TickList items={p.audience} /></div>
        <div><Tag>What changes</Tag><h2 className="sec-h sm">What you gain</h2><TickList items={p.outcomes} /></div>
      </section>
      <nav className="p-section next-link" aria-label="Next product">
        <Link href={`/products/${next.slug}`}><span className="p-mono">Next product</span><span className="big">{next.name} <span aria-hidden="true">→</span></span></Link>
      </nav>
      <CtaBand
        title={<>Put {p.name}<br />to work.</>}
        text="Tell us about your organization and what you need the product to do. We will arrange a walkthrough and answer your questions."
        primary={[demo, 'Request a demo']}
      />
    </>
  );
}

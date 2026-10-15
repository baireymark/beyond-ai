import { JsonLd } from '@/components/json-ld';
import { LearningPath } from '@/components/learning-path';
import { ParticleField } from '@/components/particle-field';
import { ProductCard } from '@/components/product-card';
import { ProductRail } from '@/components/product-rail';
import { ServicesShowcase } from '@/components/services-showcase';
import { Brand, Cta, Display, Tag, TextLink, pad } from '@/components/ui';
import { Split } from '@/components/split';
import { WorkShowcase, type FeaturedProject } from '@/components/work-showcase';
import { portfolio } from '@/content/portfolio';
import { products } from '@/content/products';
import { services } from '@/content/services';
import { site } from '@/content/site';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({ title: site.brand, description: site.description, path: '/', home: true });

const apps = portfolio.filter(p => p.type === 'app');
const sites = portfolio.filter(p => p.type === 'website');

const featuredKeys = ['prime-pilates', 'swiftswap', 'dudu-car', 'my-tracks', 'image_7', 'image_5', 'image_9', 'image_2'];
const sectors = ['Movement & wellbeing', 'Exchange & community', 'Mobility & transport', 'Music & creativity', 'Fashion & commerce', 'Tools & trade', 'Health & wellbeing', 'Beauty & skincare'];
const featured: FeaturedProject[] = featuredKeys.map((key, i) => {
  const { type, name, img, url } = portfolio.find(p => p.img === key)!;
  return { type, name, img, url, sector: sectors[i] };
});

const pillars = [
  ['Cloud-native platforms', 'Secure, cloud-native and AI-powered software platforms.'],
  ['Enterprise AI expertise', 'Cloud, AI, cybersecurity and enterprise-grade products under one roof.'],
  ['Vendor-neutral multi-cloud', 'Solutions across Microsoft Azure, AWS and Google Cloud — chosen for fit, not lock-in.'],
];

const reasons = [
  ['Our own products', 'We build and run our own platforms — HRM, ERP, Count Trust, Talkora AI and Agentic AI — and bring that product thinking to client work.'],
  ['Security first', 'Every service is designed with security at its core, from architecture and access control to monitoring and response.'],
  ['Vendor-neutral', 'We recommend what fits across Microsoft Azure, AWS and Google Cloud — with no platform lock-in.'],
  ['Rooted in the Philippines', 'Based in Clark and working with organizations across the Philippines and around the world.'],
];

const jsonLd = [{
  '@context': 'https://schema.org', '@type': 'Organization', name: site.brand, url: site.url + '/',
  logo: site.url + '/img/brand/icon-512.png', email: site.email,
  address: { '@type': 'PostalAddress', addressLocality: site.location.locality, addressCountry: site.location.country },
  sameAs: site.social.map(s => s.href),
}, { '@context': 'https://schema.org', '@type': 'WebSite', name: site.brand, url: site.url + '/' }];

export default function HomePage() {
  return (
    <>
      <JsonLd data={jsonLd} />

      <section className="p-hero v3-hero" aria-labelledby="hero-h">
        <ParticleField kind="tunnel" cy={0.66} />
        <div className="rays" aria-hidden="true" /><div className="vignette" aria-hidden="true" />
        <p className="p-mono p-tag hero-tag">AI · Cloud · Cybersecurity · Software</p>
        <Split as="h1" id="hero-h" className="hero-h"><span className="l1">We don’t follow</span>{' '}<span className="l2">the future.</span></Split>
        <div className="center">
          <p className="statement">We design it.</p>
          <p className="sub"><Brand /> delivers end-to-end AI, cloud, cybersecurity and software — built to accelerate growth, strengthen security and automate complex workflows. Based in Clark, Philippines.</p>
          <div className="actions"><Cta href="/contact">Book a consultation</Cta><Cta href="/services" ghost>Explore services</Cta></div>
        </div>
        <p className="meta p-mono"><span><b>{products.length}</b> products · <b>{services.length}</b> service pillars · <b>{portfolio.length}</b> projects shipped</span><span>Clark, Philippines</span></p>
      </section>

      <section className="p-section v3-who" id="who" aria-labelledby="who-h">
        <Tag>01 · Who we are</Tag>
        <Display level={2} id="who-h">A technology partner for <span className="r">secure, scalable</span> platforms.</Display>
        <p className="lede rv"><Brand /> delivers enterprise-grade cloud, AI, ERP and cybersecurity solutions — combining global standards with speed, flexibility and ownership.</p>
        <div className="v3-pillars">
          {pillars.map(([title, text], i) => <article className="card rv" key={title}><span className="p-mono">{pad(i + 1)}</span><h3>{title}</h3><p>{text}</p></article>)}
        </div>
        <div className="actions"><TextLink href="/about">About <Brand /> →</TextLink><TextLink href="/board-of-directors">Meet the leadership →</TextLink></div>
      </section>

      <section className="p-section p-products" id="products" aria-labelledby="prod-h">
        <Tag>02 · Products</Tag>
        <div className="head">
          <Display level={2} id="prod-h">Five products.</Display>
          <p className="rv">AI-driven platforms for workforce, operations, elections, calls and sales — one ecosystem for modern organizations.</p>
        </div>
        <ProductRail>{products.map((p, i) => <ProductCard key={p.slug} product={p} index={i} />)}</ProductRail>
      </section>

      <section className="p-section p-services" id="services" aria-labelledby="svc-h">
        <ServicesShowcase items={services.map(({ slug, name, short, summary }) => ({ slug, name, short, summary }))}>
          <Tag>03 · Services</Tag>
          <h2 className="sr-only" id="svc-h">Services</h2>
        </ServicesShowcase>
        <p className="svc-more"><TextLink href="/services">How we deliver →</TextLink></p>
      </section>

      <section className="p-section p-why" id="why" aria-labelledby="why-h">
        <div className="radial" aria-hidden="true" />
        <Tag>04 · Why work with us</Tag>
        <Display level={2} id="why-h">Built on <span className="r">substance.</span></Display>
        <div className="why-grid">
          {reasons.map(([title, text], i) => (
            <div className="why" key={title}><span className="n" aria-hidden="true">{pad(i + 1)}</span><div><h3>{title}</h3><p>{text}</p></div></div>
          ))}
        </div>
      </section>

      <section className="p-section v3-work" id="work" aria-labelledby="work-h">
        <Tag>05 · Portfolio</Tag>
        <div className="work-intro">
          <Display level={2} id="work-h">Built &amp; <span className="r">shipped.</span></Display>
          <p className="lede rv">Real products. Everyday impact.<br />Explore a few of the apps and websites we’ve brought to life.</p>
        </div>
        <WorkShowcase featured={featured} counts={{ apps: apps.length, sites: sites.length, total: portfolio.length }} />
        <noscript><p className="note">Browse every project in our <a href="/portfolio">full portfolio</a>.</p></noscript>
      </section>

      <section className="p-section p-edu" id="education" aria-labelledby="edu-h">
        <Tag>06 · AI Education</Tag>
        <Display level={2} id="edu-h">Learn AI. <span className="r">No code.</span></Display>
        <p className="lede rv">A practical AI-literacy course for students, professionals and founders — 11 modules, 4 hands-on projects and a certificate of completion.</p>
        <div className="actions rv"><Cta href="/ai-education">Explore the course</Cta></div>
        <LearningPath />
      </section>

      <section className="p-contact" aria-labelledby="contact-h">
        <ParticleField kind="tunnel" cy={0.78} /><div className="vignette" aria-hidden="true" />
        <Tag className="contact-tag">07 · Contact</Tag>
        <div className="inner">
          <Split as="h2" id="contact-h">Let’s design<br />what’s next.</Split>
          <p className="rv">Book a consultation and tell us what you are building. We aim to reply within 24 hours.</p>
          <div className="actions rv"><Cta href="/contact">Book a consultation</Cta><Cta href={`mailto:${site.email}`} ghost>{site.email}</Cta></div>
          <p className="p-mono cities">{site.location.primary} · Serving {site.location.market} and clients worldwide</p>
        </div>
      </section>
    </>
  );
}

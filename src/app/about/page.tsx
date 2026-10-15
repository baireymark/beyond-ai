import Link from 'next/link';
import { JsonLd } from '@/components/json-ld';
import { ProcessSection } from '@/components/process-section';
import { Brand, Cta, CtaBand, FeatureGrid, PageHero, Tag, pad } from '@/components/ui';
import { products } from '@/content/products';
import { services } from '@/content/services';
import { principles } from '@/content/site';
import { breadcrumbLd, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'About',
  description: 'BeyondAi is a technology company in Clark, Philippines delivering AI, cloud, cybersecurity and enterprise software, five AI-driven products and no-code AI education.',
  path: '/about',
});

const trail = [{ href: '/', label: 'Home' }, { href: '/about', label: 'About' }];

export default function AboutPage() {
  return (
    <>
      <JsonLd data={[breadcrumbLd(trail)]} />
      <PageHero
        trail={trail}
        eyebrow="Who we are"
        title={<>Built in Clark. <span className="r">Built to scale.</span></>}
        lede={<><Brand /> is a technology company based in Clark, Philippines. We deliver AI, cloud, cybersecurity and enterprise software — and build the products and training that help organizations put them to work.</>}
        actions={<><Cta href="/contact">Book a consultation</Cta><Cta href="/board-of-directors" ghost>Meet the leadership</Cta></>}
      />
      <section className="p-section split-layout" aria-labelledby="what-h">
        <div><Tag>What we do</Tag><h2 className="sec-h" id="what-h">Secure, scalable platforms.</h2></div>
        <div className="prose">
          <p><Brand /> delivers end-to-end AI, cloud, cybersecurity and endpoint technology designed to accelerate growth, strengthen security and automate complex workflows. We combine global engineering standards with the speed, flexibility and ownership of a focused team.</p>
          <p>Our work spans three areas: <Link href="/services">services</Link> for organizations modernizing their technology, <Link href="/products">products</Link> that solve specific operational problems, and <Link href="/ai-education">AI education</Link> that helps non-technical people use AI with confidence.</p>
        </div>
      </section>
      <section className="p-section" aria-labelledby="pill-h">
        <Tag>Core pillars</Tag>
        <h2 className="sec-h" id="pill-h">Three foundations.</h2>
        <FeatureGrid className="three" items={[
          ['Cloud-native platforms', 'Secure, cloud-native and AI-powered software platforms, designed to scale with demand.'],
          ['Enterprise AI expertise', 'Hands-on experience across cloud, AI, cybersecurity and enterprise-grade products.'],
          ['Vendor-neutral multi-cloud', 'Solutions across Microsoft Azure, AWS and Google Cloud, chosen for fit — not for a partnership.'],
        ]} />
      </section>
      <section className="p-section grid-2" aria-labelledby="offer-h">
        <div><Tag>At a glance</Tag><h2 className="sec-h" id="offer-h">What we offer.</h2></div>
        <div className="glance">
          <div>
            <h3 className="p-mono">{products.length} products</h3>
            <ul className="link-list">{products.map(p => <li key={p.slug}><Link href={`/products/${p.slug}`}>{p.name} <span aria-hidden="true">→</span></Link></li>)}</ul>
          </div>
          <div>
            <h3 className="p-mono">{services.length} services</h3>
            <ul className="link-list">{services.map(s => <li key={s.slug}><Link href={`/services/${s.slug}`}>{s.name} <span aria-hidden="true">→</span></Link></li>)}</ul>
          </div>
        </div>
      </section>
      <section className="p-section" aria-labelledby="val-h">
        <Tag>Governance principles</Tag>
        <h2 className="sec-h" id="val-h">How we work.</h2>
        <p className="sec-lede">Robust governance is the foundation of high-performance engineering. These principles guide every engagement.</p>
        <ol className="feature-grid three">
          {principles.map((p, i) => <li className="feature" key={p.title}><span className="p-mono" aria-hidden="true">{pad(i + 1)}</span><h3>{p.title}</h3><p>{p.text}</p></li>)}
        </ol>
      </section>
      <section className="p-section split-layout" aria-labelledby="loc-h">
        <div><Tag>Where we are</Tag><h2 className="sec-h" id="loc-h">Clark, Philippines.</h2></div>
        <div className="prose">
          <p><Brand /> is based in Clark, in Central Luzon. We work with organizations in Metro Manila, across the Philippines and internationally, and schedule meetings in Philippine Standard Time (UTC+8, Asia/Manila).</p>
          <p>Our Director of Philippines Relations works with government, business and institutional partners across the country. <Link href="/board-of-directors">Meet the leadership →</Link></p>
        </div>
      </section>
      <ProcessSection />
      <CtaBand />
    </>
  );
}

import Link from 'next/link';
import { JsonLd } from '@/components/json-ld';
import { ProcessSection } from '@/components/process-section';
import { Brand, Cta, CtaBand, PageHero, Tag, TickList, pad } from '@/components/ui';
import { services } from '@/content/services';
import { breadcrumbLd, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Services',
  description: 'Cloud modernization, AI and analytics, cybersecurity and compliance, software development, managed services and resource augmentation from BeyondAi in Clark, Philippines.',
  path: '/services',
});

const trail = [{ href: '/', label: 'Home' }, { href: '/services', label: 'Services' }];

export default function ServicesPage() {
  return (
    <>
      <JsonLd data={[breadcrumbLd(trail)]} />
      <PageHero
        trail={trail}
        eyebrow="Enterprise technology services"
        title={<>Services that <span className="r">drive results.</span></>}
        lede="AI, cloud, cybersecurity and software expertise — delivered as projects, ongoing operations or extra hands for your team."
        actions={<Cta href="/contact">Book a consultation</Cta>}
      />
      <section className="p-section" aria-labelledby="svc-all">
        <Tag>Six core services</Tag>
        <h2 className="sec-h" id="svc-all">What we build and deliver.</h2>
        <ol className="svc-cards">
          {services.map((s, i) => (
            <li key={s.slug}>
              <Link className="svc-card" href={`/services/${s.slug}`}>
                <span className="p-mono" aria-hidden="true">{pad(i + 1)}</span>
                <h3>{s.name}</h3>
                <p>{s.short}</p>
                <TickList items={s.capabilities.slice(0, 3)} className="mini" />
                <span className="explore" aria-hidden="true">Explore <span>→</span></span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
      <section className="p-section grid-2 principles" aria-labelledby="diff-h">
        <div><Tag>Our approach</Tag><h2 className="sec-h" id="diff-h">Vendor-neutral. <br />Security first.</h2></div>
        <div className="prose">
          <p><Brand /> works across Microsoft Azure, AWS and Google Cloud without favoring a platform, so recommendations follow your needs rather than a partner agreement.</p>
          <p>Security is part of every service from the first design decision. And because we also build and run our own products, we understand what it takes to keep software reliable after launch.</p>
        </div>
      </section>
      <ProcessSection />
      <CtaBand />
    </>
  );
}

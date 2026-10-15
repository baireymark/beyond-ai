import { ContactForm } from '@/components/contact-form';
import { JsonLd } from '@/components/json-ld';
import { ManilaClock } from '@/components/manila-clock';
import { PageHero, Tag } from '@/components/ui';
import { site } from '@/content/site';
import { breadcrumbLd, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Contact and book a consultation',
  description: 'Contact BeyondAi in Clark, Philippines. Book a consultation, request a product demo or ask about AI Education and team training.',
  path: '/contact',
});

const trail = [{ href: '/', label: 'Home' }, { href: '/contact', label: 'Contact' }];

const jsonLd = [breadcrumbLd(trail), {
  '@context': 'https://schema.org', '@type': 'ContactPage', name: 'Contact BeyondAi', url: site.url + '/contact',
  mainEntity: {
    '@type': 'Organization', name: site.brand, email: site.email, telephone: site.phone.display,
    address: { '@type': 'PostalAddress', addressLocality: site.location.locality, addressCountry: site.location.country },
  },
}];

export default function ContactPage() {
  return (
    <>
      <JsonLd data={jsonLd} />
      <PageHero
        trail={trail}
        eyebrow="Book a consultation"
        title={<>Let’s design <span className="r">what’s next.</span></>}
        lede="Tell us what you are working on — a project, a product demo, AI training or a partnership. We aim to reply within 24 hours."
        cy={0.55}
      />
      <section className="p-section contact-layout" aria-labelledby="form-h">
        <div className="contact-form-wrap">
          <Tag>Send an enquiry</Tag>
          <h2 className="sec-h sm" id="form-h">Your enquiry</h2>
          <ContactForm email={site.email} />
        </div>
        <aside className="contact-aside" aria-label="Contact details">
          <div className="card">
            <h2 className="p-mono">Email</h2><p><a href={`mailto:${site.email}`}>{site.email}</a></p>
            <h2 className="p-mono">Phone</h2><p><a href={`tel:${site.phone.href}`}>{site.phone.display}</a></p>
            <h2 className="p-mono">Location</h2><p>{site.location.primary}<br /><span className="muted">Serving {site.location.market}, the wider Philippines and international clients</span></p>
            <h2 className="p-mono">Local time</h2><ManilaClock variant="card" />
            <h2 className="p-mono">Follow</h2>
            <p className="inline-links">{site.social.map(s => <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer">{s.name} ↗<span className="sr-only"> (opens in a new tab)</span></a>)}</p>
          </div>
        </aside>
      </section>
    </>
  );
}

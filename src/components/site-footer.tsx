// Site footer: contact details and links to every product, service and company page.
import Link from 'next/link';
import { products } from '@/content/products';
import { services } from '@/content/services';
import { site } from '@/content/site';
import { Wordmark } from './ui';

function FootCol({ title, items }: { title: string; items: [href: string, label: string][] }) {
  return (
    <div className="foot-col">
      <h2 className="p-mono">{title}</h2>
      <ul>{items.map(([href, label]) => <li key={href}><Link href={href}>{label}</Link></li>)}</ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="p-foot">
      <div className="foot-top">
        <div className="foot-brand">
          <Wordmark />
          <p>{site.tagline}</p>
          <address>
            <span>{site.location.primary}</span>
            <a href={`mailto:${site.email}`}>{site.email}</a>
            <a href={`tel:${site.phone.href}`}>{site.phone.display}</a>
          </address>
        </div>
        <div className="foot-nav">
          <FootCol title="Products" items={[['/products', 'All products'], ...products.map(p => [`/products/${p.slug}`, p.name] as [string, string])]} />
          <FootCol title="Services" items={[['/services', 'All services'], ...services.map(s => [`/services/${s.slug}`, s.name] as [string, string])]} />
          <FootCol title="Company" items={[['/about', 'About'], ['/board-of-directors', 'Leadership'], ['/portfolio', 'Portfolio'], ['/ai-education', 'AI Education'], ['/contact', 'Contact']]} />
        </div>
      </div>
      <div className="foot-bottom">
        <p>{`© ${new Date().getFullYear()} BeyondAi. All rights reserved.`}</p>
        <ul className="foot-legal">
          <li><Link href="/privacy">Privacy</Link></li><li><Link href="/terms">Terms</Link></li>
          {site.social.map(s => (
            <li key={s.name}>
              <a href={s.href} target="_blank" rel="noopener noreferrer">{s.name} <span aria-hidden="true">↗</span><span className="sr-only">(opens in a new tab)</span></a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}

import Link from 'next/link';
import { LightTunnel } from '@/components/particle-field';
import { Cta, Tag } from '@/components/ui';
import { Split } from '@/components/split';
import { pageMetadata } from '@/lib/seo';

// Next.js adds <meta name="robots" content="noindex"> and responds with status 404.
export const metadata = pageMetadata({
  title: 'Page not found',
  description: 'The page you are looking for could not be found. Explore BeyondAi products, services, portfolio and AI Education instead.',
  path: null,
});

export default function NotFound() {
  return (
    <section className="page-hero nf" aria-labelledby="page-title">
      <LightTunnel rings={18} particles={120} cy={0.55} /><div className="vignette" aria-hidden="true" />
      <div className="page-hero-in">
        <div>
          <Tag>Error 404</Tag>
          <Split as="h1" id="page-title" className="p-display">Lost in <span className="r">the light.</span></Split>
          <p className="lede">The page you are looking for doesn’t exist or has moved. Try one of these instead.</p>
          <div className="actions"><Cta href="/">Back to home</Cta><Cta href="/contact" ghost>Contact us</Cta></div>
          <ul className="chips nf-links">
            <li><Link href="/products">Products</Link></li><li><Link href="/services">Services</Link></li><li><Link href="/portfolio">Portfolio</Link></li>
            <li><Link href="/ai-education">AI Education</Link></li><li><Link href="/about">About</Link></li>
          </ul>
        </div>
      </div>
    </section>
  );
}

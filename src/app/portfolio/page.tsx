import { JsonLd } from '@/components/json-ld';
import { PortfolioBrowser } from '@/components/portfolio-browser';
import { Cta, CtaBand, PageHero } from '@/components/ui';
import { portfolio } from '@/content/portfolio';
import { breadcrumbLd, pageMetadata } from '@/lib/seo';

const apps = portfolio.filter(p => p.type === 'app');
const sites = portfolio.filter(p => p.type === 'website');

export const metadata = pageMetadata({
  title: 'Portfolio — apps and websites',
  description: `Explore ${apps.length} mobile apps and ${sites.length} websites built by BeyondAi for clients worldwide — from fitness and food to finance and transportation.`,
  path: '/portfolio',
});

const trail = [{ href: '/', label: 'Home' }, { href: '/portfolio', label: 'Portfolio' }];

export default function PortfolioPage() {
  return (
    <>
      <JsonLd data={[breadcrumbLd(trail)]} />
      <PageHero
        trail={trail}
        eyebrow={`${apps.length} apps · ${sites.length} websites`}
        title={<>Built &amp; <span className="r">shipped.</span></>}
        lede="From fitness to finance, food to transportation — mobile apps and websites crafted for clients worldwide. Live products link to their store listing or website."
        actions={<Cta href="/services/software-development" ghost>Software development</Cta>}
      />
      <PortfolioBrowser apps={apps} sites={sites} />
      <CtaBand
        title={<>Your product<br />could be next.</>}
        text="Bring an idea, a prototype or an app that needs a rebuild. We will help you plan the path to launch."
        primary={['/contact?topic=consultation&service=Software%20Development', 'Start a project']}
      />
    </>
  );
}

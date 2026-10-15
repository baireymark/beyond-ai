// Terms of use, written for BeyondAi and pending review by BeyondAi's counsel.
import { JsonLd } from '@/components/json-ld';
import { LegalPage, type LegalSection } from '@/components/legal-page';
import { Brand } from '@/components/ui';
import { site } from '@/content/site';
import { breadcrumbLd, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Terms of use',
  description: 'Terms of use for the BeyondAi website: how site information may be used, intellectual property, external links and how to contact us.',
  path: '/terms',
});

const trail = [{ href: '/', label: 'Home' }, { href: '/terms', label: 'Terms' }];

const sections: LegalSection[] = [
  { id: 'use', title: 'Using this website', body: <p>This website provides general information about <Brand />, its services, products and AI education program. By using it, you agree to these terms.</p> },
  { id: 'info', title: 'Information on this site', body: <p>We aim to keep content accurate and current, but it is provided for general information and does not form an offer or contract. Product features, service scope and course details are confirmed in writing for each engagement.</p> },
  { id: 'ip', title: 'Intellectual property', body: <p>The <Brand /> name, logo, design and original content on this site belong to <Brand />. Portfolio screenshots show work for clients and remain the property of their respective owners. Third-party names and trademarks belong to their owners.</p> },
  { id: 'links', title: 'External links', body: <p>Links to app stores, client websites and social networks are provided for convenience. We are not responsible for the content or availability of external sites.</p> },
  { id: 'liability', title: 'Limitation of liability', body: <p>To the extent permitted by law, <Brand /> is not liable for losses arising from use of, or reliance on, this website’s general information.</p> },
  { id: 'contact', title: 'Contact', body: <p>Questions about these terms can be sent to <a href={`mailto:${site.email}`}>{site.email}</a>.</p> },
];

export default function TermsPage() {
  return (
    <>
      <JsonLd data={[breadcrumbLd(trail)]} />
      <LegalPage trail={trail} title="Terms of use" intro="The terms that apply when you use this website." sections={sections} />
    </>
  );
}

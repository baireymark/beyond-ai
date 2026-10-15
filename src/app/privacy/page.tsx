// The privacy notice describes what this website actually does (verified in the implementation).
// It is written for BeyondAi, not copied from any other company, and is pending review by BeyondAi's counsel.
import { JsonLd } from '@/components/json-ld';
import { LegalPage, type LegalSection } from '@/components/legal-page';
import { Brand } from '@/components/ui';
import { site } from '@/content/site';
import { breadcrumbLd, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Privacy notice',
  description: 'How the BeyondAi website handles personal information: no cookies or trackers, enquiries by email only, and your rights under the Philippine Data Privacy Act.',
  path: '/privacy',
});

const trail = [{ href: '/', label: 'Home' }, { href: '/privacy', label: 'Privacy' }];
const mail = <a href={`mailto:${site.email}`}>{site.email}</a>;

const sections: LegalSection[] = [
  { id: 'summary', title: 'Summary', body: <p>This website does not use cookies, analytics, advertising trackers or third-party scripts. We only receive personal information when you choose to contact us.</p> },
  {
    id: 'what', title: 'Information we receive', body: <>
      <p>When you send an enquiry, we receive what you choose to include — typically your name, email address, organization, topic, preferred call time and message. If you email or call us directly, we receive your contact details and anything you share.</p>
      <p>When you submit the contact form, your enquiry is sent to our team as an email through Google’s email service (Gmail). It is not stored in a database on our web server; it is kept in our email as correspondence.</p>
    </>,
  },
  { id: 'use', title: 'How we use it', body: <p>We use enquiry information only to respond to you, to arrange consultations, demos or training, and to keep a record of our correspondence. We do not sell personal information or use it for unrelated marketing without your consent.</p> },
  { id: 'cookies', title: 'Cookies and local storage', body: <p>We do not set cookies and do not use browser local storage. The site’s fonts and images are served from our own domain, so loading a page does not send your information to font or analytics providers.</p> },
  { id: 'hosting', title: 'Hosting and technical logs', body: <p>Like any website, our hosting provider may process technical information such as IP addresses, browser type and the pages requested, in server logs used for security and reliability. These logs are not used to profile visitors.</p> },
  { id: 'links', title: 'Links to other websites', body: <p>Our portfolio and social links lead to app stores, client websites and social networks. Those sites have their own privacy practices, which we do not control.</p> },
  { id: 'rights', title: 'Your rights', body: <p>Under the Philippine Data Privacy Act of 2012 (Republic Act No. 10173), you may ask to access, correct or delete personal information we hold about you, or object to its processing. Contact us at {mail} and we will respond within a reasonable time.</p> },
  { id: 'retention', title: 'Retention and security', body: <p>We keep enquiry correspondence only as long as needed to respond and to maintain business records, and we protect it with reasonable organizational and technical measures.</p> },
  { id: 'changes', title: 'Changes and contact', body: <p>We may update this notice when the website changes. The date at the top shows the latest version. Questions about privacy can be sent to {mail}.</p> },
];

export default function PrivacyPage() {
  return (
    <>
      <JsonLd data={[breadcrumbLd(trail)]} />
      <LegalPage trail={trail} title="Privacy notice" intro={<>How <Brand /> handles information you share through this website.</>} sections={sections} />
    </>
  );
}

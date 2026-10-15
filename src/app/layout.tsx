import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import type { ReactNode } from 'react';
import { Cursor } from '@/components/cursor';
import { SiteEffects } from '@/components/site-effects';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { site } from '@/content/site';
import { HOME_TITLE } from '@/lib/seo';
import { fontVariables } from './fonts';
import '@/styles/site.css';
import '@/styles/v3.css';
import '@/styles/via.css';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: HOME_TITLE, template: `%s | ${site.brand}` },
  description: site.description,
  icons: {
    icon: [{ url: '/favicon.ico', sizes: 'any' }, { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' }],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0807',
  colorScheme: 'dark',
};

// Runs before first paint. The `js` class switches on the reveal styles (content starts hidden and rises in).
// If the app has not hydrated after 4 s (script blocked or failed), the class is removed so nothing stays hidden.
const bootstrap = "document.documentElement.classList.add('js');setTimeout(function(){var d=document.documentElement;if(!d.hasAttribute('data-hydrated'))d.classList.remove('js')},4000)";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: the bootstrap script adds a class to <html> before React hydrates.
    // data-scroll-behavior: CSS smooth scrolling applies to in-page anchors; route changes jump to the top instantly.
    <html lang="en" className={fontVariables} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootstrap }} />
      </head>
      {/* suppressHydrationWarning: browser extensions (e.g. Grammarly) add attributes to <body> before React hydrates.
          It covers <body>'s own attributes only; mismatches inside the page are still reported. */}
      <body suppressHydrationWarning>
        <SiteHeader />
        <main id="main" tabIndex={-1}>{children}</main>
        <SiteFooter />
        <SiteEffects />
        <Cursor />
        {/* Via, the on-site chat assistant: a prebuilt script that runs entirely in the browser (no network calls). */}
        <Script src={`/js/via.js?v=${process.env.NEXT_PUBLIC_VIA_VERSION}`} strategy="lazyOnload" />
      </body>
    </html>
  );
}

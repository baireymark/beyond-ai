// Page metadata and structured data, matching the tags the static build emitted for every page.
import type { Metadata } from 'next';
import { site } from '@/content/site';

export interface Crumb { href: string; label: string }

export const HOME_TITLE = `${site.brand} — AI, cloud and cybersecurity from Clark, Philippines`;

const ogImage = { url: '/img/og.png', width: 1200, height: 630, alt: 'BeyondAi — We don’t follow the future. We design it.' };

/**
 * Title, description, canonical URL, Open Graph and Twitter tags for one page. `path` is relative to site.url;
 * pass `null` for pages without a canonical URL (the 404 page).
 */
export function pageMetadata({ title, description, path, home = false }: { title: string; description: string; path: string | null; home?: boolean }): Metadata {
  return {
    title: home ? { absolute: HOME_TITLE } : title,
    description,
    ...(path ? { alternates: { canonical: path } } : {}),
    openGraph: {
      type: 'website',
      siteName: site.brand,
      locale: site.locale,
      title: home ? HOME_TITLE : title,
      description,
      ...(path ? { url: path } : {}),
      images: [ogImage],
    },
    twitter: { card: 'summary_large_image' },
  };
}

export const breadcrumbLd = (trail: Crumb[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: trail.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.label, item: site.url + c.href })),
});

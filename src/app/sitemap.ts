// /sitemap.xml — every indexable page, generated at build time.
import type { MetadataRoute } from 'next';
import { products } from '@/content/products';
import { services } from '@/content/services';
import { site } from '@/content/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const paths = [
    '/', '/about', '/board-of-directors',
    '/products', ...products.map(p => `/products/${p.slug}`),
    '/services', ...services.map(s => `/services/${s.slug}`),
    '/portfolio', '/ai-education', '/contact', '/privacy', '/terms',
  ];
  return paths.map(path => ({ url: site.url + path, lastModified }));
}

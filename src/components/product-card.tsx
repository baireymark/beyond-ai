// Product card used by the homepage rail and the products index.
import Link from 'next/link';
import type { Product } from '@/content/products';
import { ProductArt } from './product-art';
import { pad } from './ui';

export function ProductCard({ product: p, index, withSummary = false }: { product: Product; index: number; withSummary?: boolean }) {
  return (
    <li>
      <Link className="pcard" href={`/products/${p.slug}`} data-art={p.art}>
        <span className="num p-mono" aria-hidden="true">{pad(index + 1)}</span>
        <ProductArt kind={p.art} variant="card" />
        <span className="info">
          <span className="h4">{p.name}</span>
          <span className="p-mono cat">{p.category}</span>
          {withSummary ? <span className="pdesc">{p.summary}</span> : null}
          <span className="explore" aria-hidden="true">Explore <span>→</span></span>
        </span>
      </Link>
    </li>
  );
}

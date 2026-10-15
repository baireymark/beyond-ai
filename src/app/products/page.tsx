import Link from 'next/link';
import { JsonLd } from '@/components/json-ld';
import { ProductCard } from '@/components/product-card';
import { Brand, Cta, CtaBand, PageHero, Tag } from '@/components/ui';
import { products } from '@/content/products';
import { breadcrumbLd, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Products',
  description: 'BeyondAi products: HRM Software, ERP, Count Trust secure voting, Talkora AI voice automation and Agentic AI — one AI-driven ecosystem for modern organizations.',
  path: '/products',
});

const trail = [{ href: '/', label: 'Home' }, { href: '/products', label: 'Products' }];

export default function ProductsPage() {
  return (
    <>
      <JsonLd data={[breadcrumbLd(trail)]} />
      <PageHero
        trail={trail}
        eyebrow="AI-driven product ecosystem"
        title={<>Five products. <span className="r">One ecosystem.</span></>}
        lede={<>Each <Brand /> product solves a specific operational challenge — and all of them are designed to work together.</>}
        actions={<Cta href="/contact">Request a demo</Cta>}
      />
      <section className="p-section" aria-labelledby="all-h">
        <Tag>The products</Tag>
        <h2 className="sec-h" id="all-h">Choose where to start.</h2>
        <ul className="product-grid">{products.map((p, i) => <ProductCard key={p.slug} product={p} index={i} withSummary />)}</ul>
      </section>
      <section className="p-section" aria-labelledby="eco-h">
        <Tag>Why one ecosystem</Tag>
        <h2 className="sec-h" id="eco-h">Built to work together.</h2>
        <div className="grid-3">
          <div className="card"><h3>Shared foundations</h3><p>Secure access, real-time data and analytics are designed in across the products rather than bolted on.</p></div>
          <div className="card"><h3>Start small, extend later</h3><p>Begin with the product that solves today’s problem and connect others as your needs grow.</p></div>
          <div className="card"><h3>Backed by services</h3><p>Our <Link href="/services/software-development">software</Link>, <Link href="/services/cloud-modernization">cloud</Link> and <Link href="/services/managed-services">managed services</Link> teams handle integration, hosting and support.</p></div>
        </div>
      </section>
      <CtaBand title={<>See a product<br />in action.</>} text="Tell us which product you are interested in and how your team works today. We will arrange a walkthrough." primary={['/contact?topic=demo', 'Request a demo']} />
    </>
  );
}

import Image from 'next/image';
import { JsonLd } from '@/components/json-ld';
import { CtaBand, PageHero, Tag } from '@/components/ui';
import { board, governance, leaders, type Person } from '@/content/leadership';
import { breadcrumbLd, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Leadership & Board of Directors',
  description: 'Meet BeyondAi’s leadership team and Board of Directors guiding strategy, growth and governance across enterprise technology, AI and public-private partnership.',
  path: '/board-of-directors',
});

const trail = [{ href: '/', label: 'Home' }, { href: '/about', label: 'About' }, { href: '/board-of-directors', label: 'Leadership' }];

function People({ list }: { list: Person[] }) {
  return (
    <div className="leadership-people">
      {list.map(p => (
        <article className="leadership-person rv" key={p.name}>
          <div className="leadership-photo">
            <Image src={p.photo} alt={p.name} width={400} height={500} sizes="(max-width: 600px) 100vw, 360px" />
          </div>
          <div className="leadership-bio"><h3>{p.name}</h3><p className="leadership-role">{p.role}</p><p className="leadership-description">{p.bio}</p></div>
        </article>
      ))}
    </div>
  );
}

export default function BoardPage() {
  return (
    <div className="leadership-v2">
      <JsonLd data={[breadcrumbLd(trail)]} />
      <PageHero
        trail={trail}
        eyebrow="Corporate governance"
        title={<>Leadership <span className="r">&amp; board.</span></>}
        lede="The people guiding BeyondAi’s strategy, growth and governance across enterprise technology, AI and public-private partnership."
        cy={0.45}
      />
      <section className="leadership-section" aria-labelledby="exec-h">
        <div className="leadership-wrap">
          <Tag>Leadership</Tag><h2 className="leadership-heading rv" id="exec-h">Executive team.</h2>
          <People list={leaders} />
        </div>
      </section>
      <section className="leadership-section" aria-labelledby="board-h">
        <div className="leadership-wrap">
          <Tag>Board of Directors</Tag><h2 className="leadership-heading rv" id="board-h">Board.</h2>
          <People list={board} />
        </div>
      </section>
      <section className="leadership-section" aria-labelledby="gov-h">
        <div className="leadership-wrap">
          <Tag>Governance</Tag><h2 className="leadership-heading rv" id="gov-h">Our principles.</h2>
          <div className="leadership-principles">{governance.map(g => <article className="card rv" key={g.title}><h3>{g.title}</h3><p>{g.text}</p></article>)}</div>
        </div>
      </section>
      <CtaBand title="Partner with BeyondAi." text="For partnerships, government and institutional enquiries, get in touch with our team." />
    </div>
  );
}

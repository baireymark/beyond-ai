// The six-step delivery process, shown on About and Services.
import { process } from '@/content/site';
import { Tag, pad } from './ui';

export function ProcessSection() {
  return (
    <section className="p-section" id="process" aria-labelledby="proc-h">
      <Tag>How we work</Tag>
      <h2 className="sec-h" id="proc-h">A six-step delivery process.</h2>
      <p className="sec-lede">Every engagement follows the same structured, transparent path from first conversation to live operation.</p>
      <ol className="steps">
        {process.map((s, i) => (
          <li className="step" key={s.title}>
            <span className="n" aria-hidden="true">{pad(i + 1)}</span>
            <div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
              <p className="p-mono deliv"><span className="sr-only">Deliverables: </span>{s.deliverables.join(' · ')}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

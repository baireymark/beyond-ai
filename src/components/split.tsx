// Display headings whose characters rise in on reveal. The static site split them in the browser after load; here the
// markup is rendered up front (one aria-hidden copy split into words and characters, plus one plain copy for screen
// readers), so React owns the final DOM. Without JavaScript the `.js` class is absent and the text simply shows.
import { cloneElement, Fragment, isValidElement, type CSSProperties, type ReactNode } from 'react';

type HeadingTag = 'h1' | 'h2' | 'h3';

export function Split({ as: Tag = 'h2', id, className, children }: { as?: HeadingTag; id?: string; className?: string; children: ReactNode }) {
  const counter = { i: 0 };
  return (
    <Tag id={id} className={`${className ? `${className} ` : ''}split ready`}>
      <span className="sr-only">{plainText(children).replace(/\s+/g, ' ').trim()}</span>
      <span aria-hidden="true" className="split-vis">{splitNode(children, counter)}</span>
    </Tag>
  );
}

function splitNode(node: ReactNode, counter: { i: number }): ReactNode {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node).split(/(\s+)/).map((part, k) => {
      if (!part) return null;
      if (/^\s+$/.test(part)) return ' ';
      return (
        <span className="w" key={k}>
          {[...part].map((ch, j) => <span className="ch" key={j} style={{ '--i': counter.i++ } as CSSProperties}>{ch}</span>)}
        </span>
      );
    });
  }
  if (Array.isArray(node)) return node.map((n, k) => <Fragment key={k}>{splitNode(n, counter)}</Fragment>);
  if (isValidElement<{ children?: ReactNode }>(node)) {
    if (node.type === Fragment) return splitNode(node.props.children, counter);
    // Host elements such as <span className="r"> keep their tag and get split children. <br> has none.
    if (typeof node.type === 'string' && node.props.children != null) return cloneElement(node, undefined, splitNode(node.props.children, counter));
  }
  return node;
}

function plainText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(plainText).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return node.type === 'br' ? ' ' : plainText(node.props.children);
  return '';
}

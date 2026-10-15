// Structured data for search engines. `<` is escaped so content can never close the script element.
export function JsonLd({ data }: { data: object[] }) {
  return data.map((d, i) => (
    <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d).replace(/</g, '\\u003c') }} />
  ));
}

/** Structured data for search and answer engines (schema.org JSON-LD). */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\u003c') }} type="application/ld+json" />;
}

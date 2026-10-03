import { readLegalDocument, renderLegalMarkdown } from '@/lib/legal-markdown';
import { siteUrl } from '@/lib/urls';

// Terms and privacy pages: the Markdown in content/legal. The effective date is in each document (부칙, 11. 변경).
export default function LegalDocument({ name }: { name: 'terms' | 'privacy' }) {
  const { title, body } = renderLegalMarkdown(readLegalDocument(name));
  return (
    <main className="cl-legal">
      <a className="cl-legal__logo" href={siteUrl('/')}>
        <img alt="Clipers" src="/logo/clipers-wordmark.svg" />
      </a>
      <h1>{title}</h1>
      <article className="cl-legal__body">{body}</article>
    </main>
  );
}

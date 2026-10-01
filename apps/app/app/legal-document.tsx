import { readLegalDocument, renderLegalMarkdown } from '@/lib/legal-markdown';
import { siteUrl } from '@/lib/urls';

// Terms and privacy pages: the Markdown in content/legal, with a notice while the text is still a pre-launch draft
// (remove the notice once the lawyer's review is in; see docs/legal/README.md).
const DRAFT_NOTICE = '시행 전 초안이에요. 법률 검토를 거쳐 서비스 출시 때 확정되며, 그 전에 내용이 바뀔 수 있어요.';

export default function LegalDocument({ name }: { name: 'terms' | 'privacy' }) {
  const { title, body } = renderLegalMarkdown(readLegalDocument(name));
  return (
    <main className="cl-legal">
      <a className="cl-legal__logo" href={siteUrl('/')}>
        <img alt="Clipers" src="/logo/clipers-wordmark.svg" />
      </a>
      <h1>{title}</h1>
      <p className="cl-alert cl-tone-amber" role="note">
        {DRAFT_NOTICE}
      </p>
      <article className="cl-legal__body">{body}</article>
    </main>
  );
}

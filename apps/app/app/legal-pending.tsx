import { FileTextIcon } from '@phosphor-icons/react/ssr';
import { EmptyState } from '@clipers/ui';

// Placeholder until the legally reviewed documents are ready (tracked as an open item in the UI redesign spec §4).
export default function LegalPending({ title }: { title: string }) {
  return (
    <main className="cl-page-plain">
      <EmptyState
        description="문서를 준비하고 있어요. 확정되면 이 페이지에 게시합니다."
        icon={<FileTextIcon size={24} />}
        title={title}
        tone="neutral"
      />
    </main>
  );
}

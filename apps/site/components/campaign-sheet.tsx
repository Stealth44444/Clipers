'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Expand, Link2, X } from 'lucide-react';
import { IconButton } from '@clipers/ui';

/** Campaign detail opened over the marketplace grid (intercepted route). Closing returns to the grid. */
export default function CampaignSheet({ campaignId, children }: { campaignId: string; children: ReactNode }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const close = () => router.back();
  const fullPageUrl = `/campaigns/${campaignId}`;

  async function copyLink() {
    await navigator.clipboard.writeText(new URL(fullPageUrl, window.location.origin).toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <dialog
      aria-label="캠페인 상세"
      className="cl-sheet"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === ref.current) close();
      }}
      ref={ref}
    >
      <div className="cl-sheet__bar">
        <IconButton label="닫기" onClick={close}>
          <X size={18} />
        </IconButton>
        <div className="cl-inline">
          <IconButton label={copied ? '복사했어요' : '링크 복사'} onClick={() => void copyLink()}>
            {copied ? <Check size={18} /> : <Link2 size={18} />}
          </IconButton>
          <IconButton label="전체 화면으로 보기" onClick={() => window.location.assign(fullPageUrl)}>
            <Expand size={18} />
          </IconButton>
        </div>
      </div>
      <div className="cl-sheet__content">{children}</div>
    </dialog>
  );
}

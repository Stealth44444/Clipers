'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, ArrowsOutIcon, CheckIcon, LinkIcon } from '@phosphor-icons/react/ssr';

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
        <button aria-label="닫기" className="cl-float-button" onClick={close} type="button">
          <ArrowLeftIcon size={18} />
        </button>
        <div className="cl-inline">
          <button aria-label="전체 화면으로 보기" className="cl-float-button" onClick={() => window.location.assign(fullPageUrl)} type="button">
            <ArrowsOutIcon size={16} />
          </button>
          <button aria-label={copied ? '복사했어요' : '링크 복사'} className="cl-float-button" onClick={() => void copyLink()} type="button">
            {copied ? <CheckIcon size={16} /> : <LinkIcon size={16} />}
          </button>
        </div>
      </div>
      <div className="cl-sheet__content">{children}</div>
    </dialog>
  );
}

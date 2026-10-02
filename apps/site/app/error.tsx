'use client';

import { useEffect } from 'react';
import { Button, ButtonLink } from '@clipers/ui';
import LandingChrome from '@/components/landing-chrome';

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <LandingChrome cta="무료로 시작하기" path="/">
      <div className="cl-status-page">
        <h1>페이지를 불러오지 못했어요</h1>
        <p>잠시 후 다시 시도해 주세요.</p>
        <div className="cl-status-page__actions">
          <Button onClick={reset} variant="primary">
            다시 시도
          </Button>
          <ButtonLink href="/" variant="secondary">
            홈으로
          </ButtonLink>
        </div>
      </div>
    </LandingChrome>
  );
}

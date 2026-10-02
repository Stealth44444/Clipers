'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Button, ButtonLink } from '@clipers/ui';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="cl-auth">
      <section aria-labelledby="error-title" className="cl-auth__card">
        <Link className="cl-auth__logo" href="/">
          <img alt="Clipers" src="/logo/clipers-wordmark.svg" />
        </Link>
        <div>
          <h1 className="cl-auth__title" id="error-title">
            화면을 불러오지 못했어요
          </h1>
          <p className="cl-auth__subtitle">잠시 후 다시 시도해 주세요. 계속 안 되면 아래 오류 번호와 함께 운영팀에 알려 주세요.</p>
        </div>
        <div className="cl-auth__actions">
          <Button onClick={reset} variant="primary">
            다시 시도
          </Button>
          <ButtonLink href="/" variant="secondary">
            처음으로
          </ButtonLink>
        </div>
        {error.digest && <p className="cl-auth__note">오류 번호 {error.digest}</p>}
      </section>
    </main>
  );
}

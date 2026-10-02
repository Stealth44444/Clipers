'use client';

import { Button } from '@clipers/ui';
import './globals.css';

/** Replaces the root layout when the layout itself fails, so it brings its own html, body and styles. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ko">
      <body>
        <main className="cl-auth">
          <section aria-labelledby="global-error-title" className="cl-auth__card">
            <div>
              <h1 className="cl-auth__title" id="global-error-title">
                Clipers를 불러오지 못했어요
              </h1>
              <p className="cl-auth__subtitle">잠시 후 다시 시도해 주세요.</p>
            </div>
            <div className="cl-auth__actions">
              <Button onClick={reset} variant="primary">
                다시 시도
              </Button>
            </div>
            {error.digest && <p className="cl-auth__note">오류 번호 {error.digest}</p>}
          </section>
        </main>
      </body>
    </html>
  );
}

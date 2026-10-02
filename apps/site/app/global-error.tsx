'use client';

import { Button } from '@clipers/ui';
import './globals.css';

/** Replaces the root layout when the layout itself fails, so it brings its own html, body and styles. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ko">
      <body>
        <div className="cl-landing">
          <main className="cl-status-page">
            <h1>Clipers를 불러오지 못했어요</h1>
            <p>잠시 후 다시 시도해 주세요.</p>
            <div className="cl-status-page__actions">
              <Button onClick={reset} variant="primary">
                다시 시도
              </Button>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}

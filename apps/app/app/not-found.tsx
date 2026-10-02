import Link from 'next/link';
import { ButtonLink } from '@clipers/ui';

export default function NotFound() {
  return (
    <main className="cl-auth">
      <section aria-labelledby="not-found-title" className="cl-auth__card">
        <Link className="cl-auth__logo" href="/">
          <img alt="Clipers" src="/logo/clipers-wordmark.svg" />
        </Link>
        <div>
          <h1 className="cl-auth__title" id="not-found-title">
            페이지를 찾을 수 없어요
          </h1>
          <p className="cl-auth__subtitle">주소가 바뀌었거나 없어진 페이지예요. 권한이 없는 캠페인도 이렇게 보여요.</p>
        </div>
        <div className="cl-auth__actions">
          <ButtonLink href="/" variant="primary">
            처음으로
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}

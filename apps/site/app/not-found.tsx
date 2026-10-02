import { ButtonLink } from '@clipers/ui';
import LandingChrome from '@/components/landing-chrome';

export default function NotFound() {
  return (
    <LandingChrome cta="무료로 시작하기" path="/">
      <div className="cl-status-page">
        <h1>페이지를 찾을 수 없어요</h1>
        <p>주소가 바뀌었거나 없어진 페이지예요. 끝난 캠페인도 이렇게 보일 수 있어요. 지금 진행 중인 캠페인은 둘러보기에서 찾을 수 있어요.</p>
        <div className="cl-status-page__actions">
          <ButtonLink href="/discover" variant="primary">
            캠페인 둘러보기
          </ButtonLink>
          <ButtonLink href="/" variant="secondary">
            홈으로
          </ButtonLink>
        </div>
      </div>
    </LandingChrome>
  );
}

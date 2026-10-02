import type { Metadata } from 'next';
import { MIN_CAMPAIGN_BUDGET, PLATFORMS, REVIEW_SLA_OPTIONS } from '@clipers/db';
import { ButtonLink, formatKRW } from '@clipers/ui';
import JsonLd from '@/components/json-ld';
import LandingChrome from '@/components/landing-chrome';
import { COMPANY, ORGANIZATION_ID } from '@/lib/company';
import { siteUrl } from '@/lib/urls';

export const metadata: Metadata = {
  title: 'Clipers 소개 — 검증된 조회수만큼 쓰는 숏폼 캠페인 플랫폼',
  description:
    'Clipers는 광고주가 연 숏폼 캠페인에 크리에이터가 참여하고, 검수를 통과한 영상의 검증된 조회수만큼만 정산하는 국내 플랫폼이에요.',
  alternates: { canonical: '/about' },
};

// Every number here comes from @clipers/db so the page never drifts from the product. No rates (brand or creator).
const FACTS: { label: string; value: string }[] = [
  { label: '캠페인 최소 예산', value: `${formatKRW(MIN_CAMPAIGN_BUDGET)} (부가세 별도)` },
  { label: '올릴 수 있는 플랫폼', value: PLATFORMS.map((platform) => platform.label).join(' · ') },
  { label: '영상 검수', value: `캠페인마다 ${REVIEW_SLA_OPTIONS.map((hours) => `${hours}시간`).join(' 또는 ')} 안에` },
  { label: '조회수 확인', value: '유튜브는 자동 수집, 다른 플랫폼은 화면 캡처를 운영팀이 대조' },
  { label: '크리에이터 참여', value: '캠페인마다 지원하고 운영팀 승인 후 참여, 가입과 지원은 무료' },
];

const STEPS = [
  '광고주가 캠페인을 만들고 예산을 입금해요. 운영팀이 입금을 확인하면 캠페인이 공개돼요.',
  '크리에이터가 캠페인에 지원하고, 운영팀이 승인해요.',
  '크리에이터가 숏폼을 올리고 링크를 제출하면, 운영팀이 정해진 시간 안에 검수해요.',
  '검수를 통과한 영상의 조회수를 매주 확인해 크리에이터에게 정산하고, 광고주 예산에서 그만큼 차감해요.',
];

export default function AboutPage() {
  return (
    <LandingChrome cta="캠페인 시작하기" path="/about">
      <article className="cl-guide">
        <h1 className="cl-guide__title">Clipers 소개</h1>
        <div className="cl-guide__answer">
          <p>
            Clipers는 국내 숏폼 클리핑 캠페인 플랫폼이에요. 브랜드·아티스트·방송사 같은 광고주가 캠페인을 열면, 크리에이터가 정해진
            영상을 편집하거나 제품을 소개하는 숏폼을 만들어 유튜브 쇼츠·틱톡·릴스 등에 올려요.
          </p>
          <p>
            광고주는 검수를 통과한 영상의 검증된 조회수만큼만 비용을 내고, 크리에이터는 그 조회수만큼 Clipers에서 정산받아요. 구독자
            수와 상관없이 누구나 지원할 수 있어요.
          </p>
        </div>

        <section className="cl-guide__section">
          <h2>어떻게 돌아가나요</h2>
          <ol>
            {STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="cl-guide__section">
          <h2>한눈에 보기</h2>
          <table className="cl-guide__table">
            <tbody>
              {FACTS.map((fact) => (
                <tr key={fact.label}>
                  <th scope="row">{fact.label}</th>
                  <td>{fact.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="cl-guide__section">
          <h2>운영하는 회사</h2>
          <table className="cl-guide__table">
            <tbody>
              <tr>
                <th scope="row">상호</th>
                <td>{COMPANY.legalName}</td>
              </tr>
              <tr>
                <th scope="row">대표</th>
                <td>{COMPANY.representative}</td>
              </tr>
              <tr>
                <th scope="row">사업자등록번호</th>
                <td>{COMPANY.registrationNumber}</td>
              </tr>
              <tr>
                <th scope="row">주소</th>
                <td>{COMPANY.address}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="cl-guide__section">
          <h2>문의</h2>
          <p>캠페인 구성, 예산, 일정이 궁금하면 상담 문의를 남겨 주세요. 운영팀이 이메일로 답해 드려요.</p>
          <div className="cl-status-page__actions">
            <ButtonLink href="/contact?from=/about" variant="primary">
              상담 문의
            </ButtonLink>
            <ButtonLink href="/discover" variant="secondary">
              캠페인 둘러보기
            </ButtonLink>
          </div>
        </section>
      </article>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          url: siteUrl('/about'),
          name: 'Clipers 소개',
          inLanguage: 'ko-KR',
          mainEntity: { '@id': ORGANIZATION_ID },
        }}
      />
    </LandingChrome>
  );
}

import type { ReactNode } from 'react';
import { Activity, Clock, Smartphone, Wallet } from 'lucide-react';
import { MIN_CAMPAIGN_BUDGET, PLATFORMS, REVIEW_SLA_OPTIONS } from '@clipers/db';
import { ButtonLink, MeshGradient } from '@clipers/ui';
import DepositDemo from '@/components/brand/demos/deposit-demo';
import { SIGN_UP } from '@/components/landing-chrome';

// Spec §4.8, after the reference's "Run your next campaign": four facts and the buttons on the left, the real deposit
// card on the right.

export const CONTACT = '/contact?from=/brands';

const FACTS: { icon: ReactNode; lead?: string; strong: string; rest: string }[] = [
  { icon: <Wallet size={18} />, strong: `${MIN_CAMPAIGN_BUDGET / 10_000}만 원`, rest: '부터 시작' },
  { icon: <Smartphone size={18} />, strong: `${PLATFORMS.length}개`, rest: ' 숏폼 플랫폼' },
  { icon: <Clock size={18} />, strong: `${Math.max(...REVIEW_SLA_OPTIONS)}시간`, rest: ' 안에 검수' },
  { icon: <Activity size={18} />, lead: '남은 예산 ', strong: '실시간', rest: ' 확인' },
];

export default function StartCard() {
  return (
    <section aria-labelledby="start-title" className="cl-landing-section">
      <div className="cl-start">
        <div aria-hidden className="cl-start__mesh">
          {/* Wide card: a lower noise scale keeps the shapes as broad as the hero's. */}
          <MeshGradient scale={0.45} />
        </div>
        <div>
          <h2 className="cl-start__title" id="start-title">
            다음 캠페인을
            <br />
            Clipers에서
          </h2>
          <ul className="cl-start__facts">
            {FACTS.map((fact) => (
              <li key={fact.strong}>
                {fact.icon}
                <span>
                  {fact.lead}
                  <strong>{fact.strong}</strong>
                  {fact.rest}
                </span>
              </li>
            ))}
          </ul>
          <div className="cl-start__actions">
            <ButtonLink href={SIGN_UP} size="lg" variant="primary">
              캠페인 시작하기
            </ButtonLink>
            <ButtonLink href={CONTACT} size="lg" variant="secondary">
              상담 문의
            </ButtonLink>
          </div>
        </div>
        <div aria-hidden>
          <DepositDemo />
        </div>
      </div>
    </section>
  );
}

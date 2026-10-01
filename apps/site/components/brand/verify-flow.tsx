import { UserCheck } from 'lucide-react';
import { MeshGradient, PlatformIcon, StatusDot } from '@clipers/ui';
import VerifiedViews from '@/components/brand/demos/verified-views';

// Spec §4.7, after the reference's verification layer: a flow from platform data to verified views on the hero's
// mesh, then four plain points. No step numbers.

const SOURCES = [
  { platform: 'youtube_shorts', label: '유튜브 쇼츠', how: '조회수 자동 수집' },
  { platform: 'tiktok', label: '틱톡', how: '화면 캡처 대조' },
  { platform: 'instagram_reels', label: '인스타그램 릴스', how: '화면 캡처 대조' },
];
const CHECKS = [
  { label: '요구사항', tone: 'green' as const },
  { label: '조회수 대조', tone: 'green' as const },
  { label: '급증 감지', tone: 'yellow' as const, pulse: true },
];
const STAGES = ['플랫폼 데이터', '사람이 직접 검수', '이상 여부 확인', '검증된 조회수만 정산'];
const POINTS = [
  { lead: '사람이 직접 검수해요.', text: '올라온 영상은 운영팀이 48시간 안에 요구사항대로인지 확인해요. 통과한 영상만 정산돼요.' },
  { lead: '플랫폼에 맞게 확인해요.', text: '유튜브는 조회수를 자동으로 가져오고, 다른 플랫폼은 크리에이터가 낸 화면 캡처와 대조해요.' },
  { lead: '급증은 따로 봐요.', text: '짧은 시간에 비정상적으로 늘어난 조회수는 정산 전에 따로 확인해요.' },
  { lead: '걸러진 조회수엔 쓰이지 않아요.', text: '검증을 통과한 조회수만큼만 예산이 쓰여요.' },
];

export default function VerifyFlow() {
  return (
    <section aria-labelledby="verify-title" className="cl-landing-section">
      <h2 className="cl-landing-section__title" id="verify-title">
        검증된 조회수에만
        <br />
        예산이 쓰여요
      </h2>
      <div className="cl-verify-flow">
        <div aria-hidden className="cl-verify-flow__mesh">
          {/* Wide card: a lower noise scale keeps the shapes as broad as the hero's. */}
          <MeshGradient scale={0.45} />
        </div>
        <div aria-hidden className="cl-verify-flow__stage">
          <div className="cl-glass cl-verify-flow__sources">
            {SOURCES.map((source) => (
              <div key={source.platform}>
                <PlatformIcon platform={source.platform} size={22} />
                <span>
                  {source.label}
                  <small>{source.how}</small>
                </span>
              </div>
            ))}
          </div>
          <div className="cl-verify-flow__rings">
            <i />
            <i />
            <i />
            <UserCheck size={28} />
          </div>
          <div className="cl-verify-flow__checks">
            {CHECKS.map((check) => (
              <div className="cl-glass" key={check.label}>
                <StatusDot pulse={check.pulse} tone={check.tone}>
                  {check.label}
                </StatusDot>
              </div>
            ))}
          </div>
          <div className="cl-glass cl-verify-flow__result">
            <StatusDot tone="green">
              <span>
                <VerifiedViews />
                <small>검증된 조회수</small>
              </span>
            </StatusDot>
          </div>
        </div>
        <ul className="cl-verify-flow__labels">
          {STAGES.map((stage) => (
            <li key={stage}>{stage}</li>
          ))}
        </ul>
      </div>
      <div className="cl-verify-points">
        {POINTS.map((point) => (
          <p key={point.lead}>
            <strong>{point.lead}</strong> {point.text}
          </p>
        ))}
      </div>
    </section>
  );
}

'use client';

import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { Clapperboard, Music, Scissors } from 'lucide-react';
import MockCampaignCard, { MOCK_CAMPAIGNS } from '@/components/mock-campaign-card';
import { useStickySteps } from '@/components/use-sticky-steps';
import type { ShowcaseKind, ShowcaseVideo } from '@/lib/youtube-showcase';

// Campaign kinds, after contentrewards.com: on wide screens the stage sticks while the page scrolls and
// each kind takes over in turn (a segmented progress bar shows where you are and jumps on click);
// on narrow screens the kinds simply stack. Cards show real YouTube videos when the page passes them in.

//   keeps a modifier with its noun (정해 준 영상을) so Korean lines don't break between them.
const KINDS: { id: keyof typeof MOCK_CAMPAIGNS; label: string; icon: ReactNode; title: string; body: string }[] = [
  {
    id: 'clipping',
    label: '클리핑',
    icon: <Scissors size={26} />,
    title: '클리핑 캠페인.',
    body: '캠페인이 정해 준 영상을 내 방식대로 편집해 숏폼으로 만들어요. 얼굴을 드러내지 않아도, 편집만 할 줄 알면 시작할 수 있어요.',
  },
  {
    id: 'ugc',
    label: '소개',
    icon: <Clapperboard size={26} />,
    title: '소개 캠페인.',
    body: '제품이나 서비스를 내 스타일대로 소개하는 숏폼을 찍어요. 리뷰, 일상, 상황극 무엇이든 괜찮아요.',
  },
  {
    id: 'music',
    label: '음악',
    icon: <Music size={26} />,
    title: '음악 캠페인.',
    body: '정해진 음원을 배경음으로 쓰거나 챌린지에 참여해요. 춤, 립싱크, 브이로그 무엇이든 괜찮아요.',
  },
];

export default function CampaignTypes({ videos = {} }: { videos?: Partial<Record<ShowcaseKind, ShowcaseVideo[]>> }) {
  const { rootRef, progress, active, jumpTo } = useStickySteps(KINDS.length);

  return (
    <section aria-label="캠페인 종류" className="cl-kinds" ref={rootRef} style={{ '--kinds': KINDS.length } as CSSProperties}>
      <div className="cl-kinds__stage">
        {KINDS.map((kind, index) => (
          <article className="cl-kinds__item" data-kind={kind.id} data-state={index < active ? 'past' : index === active ? 'active' : 'next'} key={kind.id}>
            <p className="cl-kinds__text">
              <span aria-hidden className="cl-kinds__icon">
                {kind.icon}
              </span>
              <span>
                <strong>{kind.title}</strong>{' '}
                {kind.body.split(/(?<=\.) /).map((sentence) => (
                  <Fragment key={sentence}>
                    <span className="cl-phrase">{sentence}</span>{' '}
                  </Fragment>
                ))}
              </span>
            </p>
            <div aria-hidden className="cl-kinds__stack">
              {MOCK_CAMPAIGNS[kind.id].map((campaign, slot) => (
                <div className="cl-kinds__card" key={campaign.title}>
                  <MockCampaignCard campaign={campaign} video={videos[kind.id]?.[slot]} />
                </div>
              ))}
            </div>
          </article>
        ))}

        <nav aria-label="캠페인 종류 진행" className="cl-kinds__progress">
          {KINDS.map((kind, index) => (
            <button
              aria-current={index === active ? 'step' : undefined}
              aria-label={kind.label}
              className="cl-kinds__step"
              key={kind.id}
              onClick={() => jumpTo(index)}
              type="button"
            >
              <span aria-hidden className="cl-kinds__step-track">
                <span style={{ transform: `scaleX(${Math.min(1, Math.max(0, progress * KINDS.length - index))})` }} />
              </span>
            </button>
          ))}
        </nav>
      </div>
    </section>
  );
}

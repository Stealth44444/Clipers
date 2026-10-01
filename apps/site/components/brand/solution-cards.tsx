import type { ReactNode } from 'react';
import CampaignEditorDemo from '@/components/brand/demos/campaign-editor-demo';
import ClipSubmitDemo from '@/components/brand/demos/clip-submit-demo';
import ReceivedClipsDemo from '@/components/brand/demos/received-clips-demo';

// Spec §4.4, after the reference's "Introducing the new solution": a crop of the real product on top, fading out,
// then a centred title and one sentence.

const CARDS: { title: string; body: string; demo: ReactNode }[] = [
  { title: '예산과 조건만 정하세요', body: '캠페인 종류, 올릴 플랫폼, 예산만 정하면 준비가 끝나요.', demo: <CampaignEditorDemo /> },
  { title: '크리에이터가 만들어요', body: '승인된 크리에이터들이 각자 영상을 만들어 올리고, 링크로 제출해요.', demo: <ClipSubmitDemo /> },
  { title: '나머지는 Clipers가', body: '검수, 조회수 집계, 크리에이터 정산과 지급까지 Clipers가 해요.', demo: <ReceivedClipsDemo /> },
];

export default function SolutionCards() {
  return (
    <section aria-labelledby="solution-title" className="cl-landing-section">
      <h2 className="cl-landing-section__title" id="solution-title">
        정하기만 하면, 나머지는 Clipers가
      </h2>
      <div className="cl-solution">
        {CARDS.map((card) => (
          <article className="cl-solution__card" key={card.title}>
            <div aria-hidden className="cl-solution__visual">
              {card.demo}
            </div>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

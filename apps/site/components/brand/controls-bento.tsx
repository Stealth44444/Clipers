import type { ReactNode } from 'react';
import { ApplicantsDemo, BudgetDemo, ClipCapDemo, RequirementsDemo } from '@/components/brand/demos/control-demos';

// Spec §4.6 (and 2026-10-02-brand-reach-section-design.md §5, which folded the solution cards in), after the reference's "The best by design.": small and large cards alternate per row; a large title,
// one sentence, and a crop of the real app cut by the card's bottom-right edge.

const CARDS: { size: 's' | 'l'; title: string; body: string; demo: ReactNode }[] = [
  { size: 's', title: '예산과 조건만 정하세요', body: '캠페인 종류와 예산, 꼭 지킬 조건을 정하면 준비가 끝나요.', demo: <RequirementsDemo /> },
  { size: 'l', title: '클립마다 상한', body: '영상 하나가 예산을 독차지하지 않도록, 클립 하나에 쓰일 예산의 상한을 정해요.', demo: <ClipCapDemo /> },
  { size: 'l', title: '승인된 크리에이터가 만들어요', body: '크리에이터는 캠페인마다 지원하고, 운영팀이 승인한 사람만 영상을 만들어 올려요.', demo: <ApplicantsDemo /> },
  { size: 's', title: '나머지는 Clipers가', body: '검수, 조회수 집계, 정산과 지급까지 Clipers가 해요.', demo: <BudgetDemo /> },
];

export default function ControlsBento() {
  return (
    <section aria-labelledby="controls-title" className="cl-landing-section">
      <h2 className="cl-landing-section__title" id="controls-title">
        정하기만 하면, 나머지는 Clipers가
      </h2>
      <div className="cl-bento2">
        {CARDS.map((card) => (
          <article className="cl-bento2__card" data-size={card.size} key={card.title}>
            <div className="cl-bento2__text">
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </div>
            <div aria-hidden className="cl-bento2__visual">
              {card.demo}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

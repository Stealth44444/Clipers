// Influencer seeding beside a Clipers campaign, row by row (spec §4.3). Facts only: no rates, no other companies' names.

const ROWS = [
  { label: '비용을 내는 기준', them: '섭외할 때 정한 금액', us: '검증된 조회수만큼만' },
  { label: '조회수가 나오지 않으면', them: '비용은 그대로 나가요', us: '예산도 쓰이지 않아요' },
  { label: '만들어지는 영상', them: '섭외한 사람 수만큼', us: '참여한 크리에이터마다 각자의 영상' },
  { label: '섭외·계약·정산', them: '한 명씩 직접', us: '검수부터 지급까지 Clipers가' },
  { label: '올라가는 곳', them: '크리에이터의 채널 하나', us: '7개 숏폼 플랫폼 중 원하는 곳에' },
];

export default function CompareTable() {
  return (
    <section aria-labelledby="compare-title" className="cl-landing-section">
      <h2 className="cl-landing-section__title" id="compare-title">
        섭외하는 대신, 캠페인을 여세요
      </h2>
      <p className="cl-landing-section__lead">같은 예산이어도, 어디에 쓰이는지가 달라요.</p>
      <div className="cl-compare">
        <table>
          <caption>인플루언서 섭외와 Clipers 캠페인 비교</caption>
          <colgroup>
            <col className="cl-compare__col-label" />
            <col />
            <col />
          </colgroup>
          <thead>
            <tr>
              <td />
              <th className="cl-compare__them" scope="col">
                인플루언서 섭외
              </th>
              <th className="cl-compare__us" scope="col">
                <span>
                  <img alt="" height="22" src="/logo/clipers-mark.svg" width="22" />
                  Clipers 캠페인
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td className="cl-compare__them" data-label="인플루언서 섭외">
                  {row.them}
                </td>
                <td className="cl-compare__us" data-label="Clipers 캠페인">
                  {row.us}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

'use client';

import { Badge, Button, Card, SummaryList, formatKRW } from '@clipers/ui';
import DemoCursor from '@/components/brand/demo-cursor';
import { useDemoFrame } from '@/components/brand/use-demo-frame';
import { DEPOSIT_FRAMES, DEPOSIT_STATUS } from '@/lib/brand-demos';

/** The brand campaign page's deposit card: 입금했어요 → 입금 확인 중 → 진행 중. The real account number is never shown. */
export default function DepositDemo() {
  const { ref, frame } = useDemoFrame(DEPOSIT_FRAMES);
  const status = DEPOSIT_STATUS[frame.status];

  return (
    <div className="cl-app-dark cl-bdemo cl-bdemo--deposit" inert ref={ref}>
      <Card actions={<Badge tone={status.tone}>{status.label}</Badge>} description={status.lead} title="예산 입금">
        <div className="cl-stack-tight">
          <SummaryList
            rows={[
              { label: '입금 금액', value: formatKRW(3_000_000) },
              { label: '입금 계좌', value: 'Clipers 운영 계좌' },
              { label: '입금자명', value: '브랜드명과 같게 입력해 주세요' },
            ]}
          />
          <div>
            <Button data-demo="deposit" disabled={frame.status !== 'draft'} variant="primary">
              {frame.sending ? '알리는 중…' : '입금했어요'}
            </Button>
          </div>
        </div>
      </Card>
      <DemoCursor click={frame.click} stage={ref} target={frame.cursor} />
    </div>
  );
}

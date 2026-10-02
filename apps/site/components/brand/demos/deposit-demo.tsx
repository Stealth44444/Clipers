import { depositAmount, vatOn } from '@clipers/db';
import { Badge, Button, Card, SummaryList, formatKRW } from '@clipers/ui';
import { DEPOSIT_LEAD } from '@/lib/brand-demos';

const SERVICE_AMOUNT = 3_000_000;

/** The brand campaign page's deposit card before the transfer is reported. The real account number is never shown. */
export default function DepositDemo() {
  return (
    <div className="cl-app-dark cl-bdemo cl-bdemo--deposit" inert>
      <Card actions={<Badge tone="neutral">입금 전</Badge>} description={DEPOSIT_LEAD} title="예산 입금">
        <div className="cl-stack-tight">
          <SummaryList
            rows={[
              { label: '서비스 대금', value: formatKRW(SERVICE_AMOUNT) },
              { label: '부가세 (10%)', value: formatKRW(vatOn(SERVICE_AMOUNT)) },
              { label: '입금 금액', value: <strong>{formatKRW(depositAmount(SERVICE_AMOUNT))}</strong> },
              { label: '입금 계좌', value: 'Clipers 운영 계좌' },
              { label: '입금자명', value: '브랜드명과 같게 입력해 주세요' },
            ]}
          />
          <div>
            <Button variant="primary">입금했어요</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

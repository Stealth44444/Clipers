import { Page, PageHeader } from '@clipers/ui';
import SettlementPanel from './settlement-panel';

export default function AdminSettlementsPage() {
  return (
    <Page>
      <PageHeader
        description="지난 완료 주의 조회수 증가분으로 정산을 만들어요. 이체는 CSV로 내보낸 뒤 직접 처리하고, 끝나면 지급 완료로 바꿔 주세요."
        title="주간 정산"
      />
      <SettlementPanel />
    </Page>
  );
}

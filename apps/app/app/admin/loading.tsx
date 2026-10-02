import { Page, Skeleton } from '@clipers/ui';

export default function AdminLoading() {
  return (
    <Page>
      <div aria-busy aria-label="불러오는 중" className="cl-stack">
        <div className="cl-stack-tight">
          <Skeleton height={30} width={240} />
          <Skeleton height={18} width={320} />
        </div>
        <Skeleton height={88} />
        <Skeleton height={220} />
      </div>
    </Page>
  );
}

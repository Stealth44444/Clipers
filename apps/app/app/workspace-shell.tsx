import type { ReactNode } from 'react';

type WorkspaceRole = 'admin' | 'brand' | 'creator';

const workspaceNavigation: Record<WorkspaceRole, { title: string; items: { label: string; href: string }[] }> = {
  brand: {
    title: '브랜드 워크스페이스',
    items: [
      { label: '캠페인 만들기', href: '#create-campaign-title' },
      { label: '내 캠페인', href: '#my-campaigns-title' },
    ],
  },
  admin: {
    title: '운영 워크스페이스',
    items: [
      { label: '캠페인 현황', href: '#campaign-overview-title' },
      { label: '지원서 검토', href: '#application-queue-title' },
      { label: '클립 검수', href: '#clip-queue-title' },
      { label: '조회수 신고', href: '#manual-view-report-queue-title' },
      { label: '이의제기', href: '#dispute-queue-title' },
      { label: '주간 정산', href: '#settlements-title' },
    ],
  },
  creator: {
    title: '크리에이터 워크스페이스',
    items: [
      { label: '캠페인', href: '#campaigns-title' },
      { label: '내 지원', href: '#applications-title' },
      { label: '내 클립', href: '#clips-title' },
      { label: '내 정산', href: '#settlements-title' },
    ],
  },
};

export default function WorkspaceShell({ role, children }: { role: WorkspaceRole; children: ReactNode }) {
  const navigation = workspaceNavigation[role];

  return (
    <div className="app-page">
      <header className="app-global-header">
        <a className="app-wordmark" href="/"><img alt="Clipers" src="/brand/clipers-wordmark.svg" /></a>
        <nav className="app-global-nav" aria-label="서비스">
          <a href="/brand">브랜드</a>
          <a href="/creator">크리에이터</a>
        </nav>
        <a href="/login">계정</a>
      </header>
      <div className="app-workspace-body">
        <aside className="app-sidebar" aria-label={navigation.title}>
          <p className="app-eyebrow">WORKSPACE</p>
          <h2>{navigation.title}</h2>
          <nav className="app-sidebar-nav" aria-label="페이지">
            {navigation.items.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
          </nav>
        </aside>
        <main className="app-main-content">{children}</main>
      </div>
    </div>
  );
}
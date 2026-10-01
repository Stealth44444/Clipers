'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowUpRightIcon, BankIcon, ChartLineIcon, ClipboardTextIcon, CompassIcon, FilmStripIcon, GaugeIcon, GearSixIcon, HouseIcon, MegaphoneIcon, MoneyIcon, ReceiptIcon, ScalesIcon, ScrollIcon, UserCheckIcon, WalletIcon } from '@phosphor-icons/react/ssr';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { AppShell, Sidebar, UserMenu, type SidebarSection } from '@clipers/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { siteUrl } from '@/lib/urls';

export type WorkspaceRole = 'admin' | 'brand' | 'creator';

const ROLE_LABEL: Record<WorkspaceRole, string> = { admin: '운영자', brand: '브랜드', creator: '크리에이터' };

const ICON = { size: 18 };

/** Regular glyph normally, filled glyph on the current page (iOS tab-bar convention). */
const navIcon = (Icon: PhosphorIcon) => ({ icon: <Icon {...ICON} />, activeIcon: <Icon {...ICON} weight="fill" /> });

const NAVIGATION: Record<WorkspaceRole, SidebarSection[]> = {
  creator: [
    {
      title: '탐색',
      items: [
        { href: '/creator', label: '홈', ...navIcon(HouseIcon), exact: true },
        { href: '/creator/campaigns', label: '캠페인', ...navIcon(MegaphoneIcon) },
        { href: siteUrl('/discover'), label: '디스커버', ...navIcon(CompassIcon), badge: <ArrowUpRightIcon size={14} /> },
      ],
    },
    {
      title: '내 활동',
      items: [
        { href: '/creator/analytics', label: '분석', ...navIcon(ChartLineIcon) },
        { href: '/creator/submissions', label: '제출 현황', ...navIcon(FilmStripIcon) },
        { href: '/creator/earnings', label: '수익', ...navIcon(WalletIcon) },
      ],
    },
    {
      title: '계정',
      items: [{ href: '/creator/settings', label: '설정', ...navIcon(GearSixIcon) }],
    },
  ],
  brand: [
    {
      title: '개요',
      items: [
        { href: '/brand', label: '홈', ...navIcon(HouseIcon), exact: true },
        { href: '/brand/campaigns', label: '캠페인', ...navIcon(MegaphoneIcon) },
      ],
    },
    {
      title: '관리',
      items: [
        { href: '/brand/analytics', label: '분석', ...navIcon(ChartLineIcon) },
        { href: '/brand/spend', label: '예산 사용 내역', ...navIcon(ReceiptIcon) },
      ],
    },
    {
      title: '브랜드',
      items: [{ href: '/brand/settings', label: '설정', ...navIcon(GearSixIcon) }],
    },
  ],
  admin: [
    {
      title: '개요',
      items: [{ href: '/admin', label: '현황', ...navIcon(GaugeIcon), exact: true }],
    },
    {
      title: '검수',
      items: [
        { href: '/admin/applications', label: '지원서', ...navIcon(UserCheckIcon) },
        { href: '/admin/clips', label: '클립', ...navIcon(ClipboardTextIcon) },
        { href: '/admin/view-reports', label: '조회수 신고', ...navIcon(ScrollIcon) },
        { href: '/admin/disputes', label: '이의제기', ...navIcon(ScalesIcon) },
      ],
    },
    {
      title: '정산',
      items: [
        { href: '/admin/deposits', label: '입금 확인', ...navIcon(BankIcon) },
        { href: '/admin/settlements', label: '주간 정산', ...navIcon(MoneyIcon) },
      ],
    },
  ],
};

export default function WorkspaceShell({ role, displayName, topbarExtra, badges, children }: {
  role: WorkspaceRole;
  displayName: string;
  topbarExtra?: ReactNode;
  /** Pending-work counts keyed by sidebar href; zero hides the badge. */
  badges?: Record<string, number>;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  async function signOut() {
    await getSupabaseBrowserClient().auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <AppShell
      logo={
        <Link className="cl-topbar__logo" href={`/${role}`}>
          <img alt="Clipers" src="/logo/clipers-wordmark.svg" />
        </Link>
      }
      sidebar={<Sidebar activePath={pathname} LinkComponent={Link} sections={withBadges(NAVIGATION[role], badges)} />}
      topbarEnd={
        <>
          {topbarExtra}
          <UserMenu name={displayName} onSignOut={() => void signOut()} subtitle={ROLE_LABEL[role]} />
        </>
      }
    >
      {children}
    </AppShell>
  );
}

function withBadges(sections: SidebarSection[], badges: Record<string, number> = {}): SidebarSection[] {
  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) =>
      badges[item.href] ? { ...item, badge: <span className="cl-count-badge">{badges[item.href]}</span> } : item
    ),
  }));
}

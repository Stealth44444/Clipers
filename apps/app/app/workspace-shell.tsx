'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  Banknote,
  ChartLine,
  ClipboardCheck,
  Compass,
  Film,
  Gauge,
  Globe,
  House,
  Landmark,
  Megaphone,
  MessageSquareWarning,
  Receipt,
  ScrollText,
  Settings,
  Undo2,
  UserCheck,
  Wallet,
} from 'lucide-react';
import { AppShell, Sidebar, UserMenu, type SidebarSection } from '@clipers/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { siteUrl } from '@/lib/urls';

export type WorkspaceRole = 'admin' | 'brand' | 'creator';

const ROLE_LABEL: Record<WorkspaceRole, string> = { admin: '운영자', brand: '브랜드', creator: '크리에이터' };

const ICON = { size: 18 };

const NAVIGATION: Record<WorkspaceRole, SidebarSection[]> = {
  creator: [
    {
      title: '탐색',
      items: [
        { href: '/creator', label: '홈', icon: <House {...ICON} />, exact: true },
        { href: '/creator/campaigns', label: '캠페인', icon: <Megaphone {...ICON} /> },
        { href: siteUrl('/discover'), label: '디스커버', icon: <Compass {...ICON} />, badge: <ArrowUpRight size={14} /> },
      ],
    },
    {
      title: '내 활동',
      items: [
        { href: '/creator/analytics', label: '분석', icon: <ChartLine {...ICON} /> },
        { href: '/creator/submissions', label: '제출 현황', icon: <Film {...ICON} /> },
        { href: '/creator/earnings', label: '수익', icon: <Wallet {...ICON} /> },
      ],
    },
    {
      title: '계정',
      items: [{ href: '/creator/settings', label: '설정', icon: <Settings {...ICON} /> }],
    },
  ],
  brand: [
    {
      title: '개요',
      items: [
        { href: '/brand', label: '홈', icon: <House {...ICON} />, exact: true },
        { href: '/brand/campaigns', label: '캠페인', icon: <Megaphone {...ICON} /> },
      ],
    },
    {
      title: '관리',
      items: [
        { href: '/brand/analytics', label: '분석', icon: <ChartLine {...ICON} /> },
        { href: '/brand/spend', label: '예산 사용 내역', icon: <Receipt {...ICON} /> },
      ],
    },
    {
      title: '브랜드',
      items: [{ href: '/brand/settings', label: '설정', icon: <Settings {...ICON} /> }],
    },
  ],
  admin: [
    {
      title: '개요',
      items: [{ href: '/admin', label: '현황', icon: <Gauge {...ICON} />, exact: true }],
    },
    {
      title: '검수',
      items: [
        { href: '/admin/applications', label: '지원서', icon: <UserCheck {...ICON} /> },
        { href: '/admin/clips', label: '클립', icon: <ClipboardCheck {...ICON} /> },
        { href: '/admin/view-reports', label: '조회수 신고', icon: <ScrollText {...ICON} /> },
        { href: '/admin/disputes', label: '이의제기', icon: <MessageSquareWarning {...ICON} /> },
      ],
    },
    {
      title: '정산',
      items: [
        { href: '/admin/deposits', label: '입금 확인', icon: <Landmark {...ICON} /> },
        { href: '/admin/settlements', label: '정산·지급', icon: <Banknote {...ICON} /> },
        { href: '/admin/refunds', label: '반환', icon: <Undo2 {...ICON} /> },
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
          <UserMenu
            links={[{ href: siteUrl('/'), label: 'Clipers 홈', icon: <Globe size={16} /> }]}
            name={displayName}
            onSignOut={() => void signOut()}
            subtitle={ROLE_LABEL[role]}
          />
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

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
  House,
  Megaphone,
  MessageSquareWarning,
  PlusCircle,
  ScrollText,
  Settings,
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
  // Hash links until phases 4-5 split these workspaces into routes.
  brand: [
    {
      title: '브랜드',
      items: [
        { href: '#create-campaign-title', label: '캠페인 만들기', icon: <PlusCircle {...ICON} /> },
        { href: '#my-campaigns-title', label: '내 캠페인', icon: <Megaphone {...ICON} /> },
      ],
    },
  ],
  admin: [
    {
      title: '운영',
      items: [
        { href: '#campaign-overview-title', label: '캠페인 현황', icon: <Gauge {...ICON} /> },
        { href: '#application-queue-title', label: '지원서 검토', icon: <UserCheck {...ICON} /> },
        { href: '#clip-queue-title', label: '클립 검수', icon: <ClipboardCheck {...ICON} /> },
        { href: '#manual-view-report-queue-title', label: '조회수 신고', icon: <ScrollText {...ICON} /> },
        { href: '#dispute-queue-title', label: '이의제기', icon: <MessageSquareWarning {...ICON} /> },
        { href: '#settlements-title', label: '주간 정산', icon: <Banknote {...ICON} /> },
      ],
    },
  ],
};

export default function WorkspaceShell({ role, displayName, topbarExtra, children }: {
  role: WorkspaceRole;
  displayName: string;
  topbarExtra?: ReactNode;
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
      sidebar={<Sidebar activePath={pathname} LinkComponent={Link} sections={NAVIGATION[role]} />}
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

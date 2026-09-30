'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Banknote,
  ClipboardCheck,
  Film,
  Gauge,
  Megaphone,
  MessageSquareWarning,
  PlusCircle,
  ScrollText,
  UserCheck,
  Wallet,
} from 'lucide-react';
import { AppShell, Sidebar, UserMenu, type SidebarSection } from '@clipers/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type WorkspaceRole = 'admin' | 'brand' | 'creator';

const ROLE_LABEL: Record<WorkspaceRole, string> = { admin: '운영자', brand: '브랜드', creator: '크리에이터' };

const ICON = { size: 18 };

// Hash links until phases 3-5 split each workspace into real routes.
const NAVIGATION: Record<WorkspaceRole, SidebarSection[]> = {
  creator: [
    {
      title: '크리에이터',
      items: [
        { href: '#campaigns-title', label: '캠페인', icon: <Megaphone {...ICON} /> },
        { href: '#applications-title', label: '내 지원', icon: <UserCheck {...ICON} /> },
        { href: '#clips-title', label: '내 클립', icon: <Film {...ICON} /> },
        { href: '#settlements-title', label: '내 정산', icon: <Wallet {...ICON} /> },
      ],
    },
  ],
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

export default function WorkspaceShell({ role, children }: { role: WorkspaceRole; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', data.user.id).maybeSingle();
      setDisplayName(profile?.display_name ?? data.user.email ?? '');
    })();
  }, []);

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
      topbarEnd={<UserMenu name={displayName} onSignOut={() => void signOut()} subtitle={ROLE_LABEL[role]} />}
    >
      {children}
    </AppShell>
  );
}

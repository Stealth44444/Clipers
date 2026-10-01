import type { ReactNode } from 'react';
import Link from 'next/link';
import { BookOpen, Dumbbell, LayoutGrid, Palette, ShoppingBag, Sparkles } from 'lucide-react';
import { INTEREST_GROUPS, type InterestGroupId } from '@clipers/db';
import { AppShell, ButtonLink, Sidebar } from '@clipers/ui';
import { appUrl } from '@/lib/urls';

const ICON = { size: 18 };
const GROUP_ICONS: Record<InterestGroupId, ReactNode> = {
  entertainment: <Sparkles {...ICON} />,
  lifestyle: <ShoppingBag {...ICON} />,
  health: <Dumbbell {...ICON} />,
  knowledge: <BookOpen {...ICON} />,
  hobby: <Palette {...ICON} />,
};

export function discoverHref(group?: string | null): string {
  return group ? `/discover?group=${group}` : '/discover';
}

/** Public marketplace frame: the sidebar filters campaigns by interest group, the top bar leads into the app. */
export default function SiteShell({ activeGroup, children }: { activeGroup?: string | null; children: ReactNode }) {
  return (
    <AppShell
      logo={
        <Link className="cl-topbar__logo" href="/">
          <img alt="Clipers" src="/logo/clipers-wordmark.svg" />
        </Link>
      }
      sidebar={
        <Sidebar
          activePath={discoverHref(activeGroup)}
          LinkComponent={Link}
          sections={[
            { title: '탐색', items: [{ href: discoverHref(), label: '모든 캠페인', icon: <LayoutGrid {...ICON} />, exact: true }] },
            {
              title: '분야',
              items: INTEREST_GROUPS.map((group) => ({ href: discoverHref(group.id), label: group.label, icon: GROUP_ICONS[group.id], exact: true })),
            },
          ]}
        />
      }
      topbarEnd={
        <>
          <ButtonLink href={appUrl('/login')} size="sm" variant="ghost">
            로그인
          </ButtonLink>
          <ButtonLink href={appUrl('/login?mode=sign-up')} size="sm" variant="primary">
            시작하기
          </ButtonLink>
        </>
      }
    >
      {children}
    </AppShell>
  );
}

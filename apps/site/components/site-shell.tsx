import type { ReactNode } from 'react';
import Link from 'next/link';
import { BarbellIcon, BookOpenIcon, PaletteIcon, ShoppingBagIcon, SparkleIcon, SquaresFourIcon } from '@phosphor-icons/react/ssr';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { INTEREST_GROUPS, type InterestGroupId } from '@clipers/db';
import { AppShell, ButtonLink, Sidebar } from '@clipers/ui';
import { appUrl } from '@/lib/urls';

const ICON = { size: 18 };

/** Regular glyph normally, filled glyph on the current page (iOS tab-bar convention). */
const navIcon = (Icon: PhosphorIcon) => ({ icon: <Icon {...ICON} />, activeIcon: <Icon {...ICON} weight="fill" /> });
const GROUP_ICONS: Record<InterestGroupId, PhosphorIcon> = {
  entertainment: SparkleIcon,
  lifestyle: ShoppingBagIcon,
  health: BarbellIcon,
  knowledge: BookOpenIcon,
  hobby: PaletteIcon,
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
            { title: '탐색', items: [{ href: discoverHref(), label: '모든 캠페인', ...navIcon(SquaresFourIcon), exact: true }] },
            {
              title: '분야',
              items: INTEREST_GROUPS.map((group) => ({ href: discoverHref(group.id), label: group.label, ...navIcon(GROUP_ICONS[group.id]), exact: true })),
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

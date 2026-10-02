import type { ReactNode } from 'react';
import Link from 'next/link';
import { BookOpen, CircleHelp, Clapperboard, Dumbbell, LayoutGrid, Megaphone, Palette, Scissors, ShoppingBag, Sparkles } from 'lucide-react';
import { INTEREST_GROUPS, type InterestGroupId } from '@clipers/db';
import { AppShell, ButtonLink, Sidebar } from '@clipers/ui';
import { signUpUrl } from '@/components/landing-chrome';
import { CAMPAIGN_KINDS, discoverUrl, type CampaignKindId, type DiscoverFilters } from '@/lib/discover';
import { appUrl } from '@/lib/urls';

const ICON = { size: 18 };
const GROUP_ICONS: Record<InterestGroupId, ReactNode> = {
  entertainment: <Sparkles {...ICON} />,
  lifestyle: <ShoppingBag {...ICON} />,
  health: <Dumbbell {...ICON} />,
  knowledge: <BookOpen {...ICON} />,
  hobby: <Palette {...ICON} />,
};
const KIND_ICONS: Record<CampaignKindId, ReactNode> = {
  clipping: <Scissors {...ICON} />,
  ugc: <Clapperboard {...ICON} />,
};

/**
 * Public marketplace frame: the sidebar filters campaigns by kind and interest group (each link keeps the other
 * filters), points newcomers to the guides, and the top bar leads into the app.
 */
export default function SiteShell({ filters = {}, children }: { filters?: Omit<DiscoverFilters, 'q'>; children: ReactNode }) {
  const { group = null, type = null, platform = null } = filters;
  return (
    <AppShell
      logo={
        <Link className="cl-topbar__logo" href="/">
          <img alt="Clipers" src="/logo/clipers-wordmark.svg" />
        </Link>
      }
      sidebar={
        <Sidebar
          activePath={discoverUrl({ group, type, platform })}
          footer={
            <div className="cl-sidebar__section">
              <p className="cl-sidebar__section-title">안내</p>
              <Link className="cl-sidebar__item" href="/guides">
                <CircleHelp {...ICON} />
                크리에이터 가이드
              </Link>
              <Link className="cl-sidebar__item" href="/brands">
                <Megaphone {...ICON} />
                브랜드로 캠페인 열기
              </Link>
            </div>
          }
          LinkComponent={Link}
          sections={[
            { title: '탐색', items: [{ href: discoverUrl(), label: '모든 캠페인', icon: <LayoutGrid {...ICON} />, exact: true }] },
            {
              title: '종류',
              items: CAMPAIGN_KINDS.map((kind) => ({ href: discoverUrl({ group, type: kind.id, platform }), label: kind.label, icon: KIND_ICONS[kind.id], exact: true })),
            },
            {
              title: '분야',
              items: INTEREST_GROUPS.map((item) => ({ href: discoverUrl({ group: item.id, type, platform }), label: item.label, icon: GROUP_ICONS[item.id], exact: true })),
            },
          ]}
        />
      }
      topbarEnd={
        <>
          <ButtonLink href={appUrl('/login')} size="sm" variant="ghost">
            로그인
          </ButtonLink>
          <ButtonLink href={signUpUrl('creator')} size="sm" variant="primary">
            시작하기
          </ButtonLink>
        </>
      }
    >
      {children}
    </AppShell>
  );
}

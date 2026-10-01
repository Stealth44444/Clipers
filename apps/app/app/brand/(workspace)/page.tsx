import Link from 'next/link';
import { BroadcastIcon, EyeIcon, FilmStripIcon, MegaphoneIcon, MoneyIcon, PlusCircleIcon, ShieldCheckIcon, WalletIcon } from '@phosphor-icons/react/ssr';
import { brandChecklist } from '@clipers/db';
import {
  ButtonLink,
  Card,
  Checklist,
  EmptyState,
  Page,
  PageHeader,
  SectionHeader,
  Stack,
  StatCard,
  StatGrid,
  formatCompactNumber,
  formatKRW,
  greetingFor,
  type ChecklistItem,
} from '@clipers/ui';
import { getBrandCampaigns } from '@/lib/brand-data';
import { getSession } from '@/lib/session';
import CampaignTable from './campaign-table';

const ICON = { size: 18 };

export default async function BrandHomePage() {
  const { profile } = await getSession();
  const campaigns = await getBrandCampaigns();
  const steps = brandChecklist({
    campaignStatuses: campaigns.map((campaign) => campaign.status),
    clipCount: campaigns.reduce((sum, campaign) => sum + campaign.clipCount, 0),
  });
  const draft = campaigns.find((campaign) => campaign.status === 'draft');

  const STEP_CONTENT: Record<string, Omit<ChecklistItem, 'id' | 'done'>> = {
    create: {
      icon: <PlusCircleIcon {...ICON} />,
      title: '첫 캠페인 만들기',
      description: '예산과 플랫폼, 크리에이터에게 전할 요구사항을 정해요.',
      action: <ButtonLink href="/brand/campaigns/new" size="sm" variant="primary">만들기</ButtonLink>,
    },
    deposit: {
      icon: <MoneyIcon {...ICON} />,
      title: '예산 입금하기',
      description: '캠페인을 만들면 입금 계좌를 안내해 드려요.',
      action: draft ? <ButtonLink href={`/brand/campaigns/${draft.id}`} size="sm" variant="secondary">입금 안내 보기</ButtonLink> : undefined,
    },
    live: {
      icon: <ShieldCheckIcon {...ICON} />,
      title: '운영팀 확인 후 라이브',
      description: '입금이 확인되면 캠페인이 공개되고 크리에이터 지원을 받기 시작해요.',
    },
    first_clip: {
      icon: <FilmStripIcon {...ICON} />,
      title: '첫 클립 받기',
      description: '승인된 크리에이터가 영상을 올리면 여기에서 바로 확인할 수 있어요.',
    },
  };
  const checklistItems: ChecklistItem[] = steps.map((step) => ({ id: step.id, done: step.done, ...STEP_CONTENT[step.id] }));
  const setupComplete = steps.every((step) => step.done);

  const live = campaigns.filter((campaign) => campaign.status === 'live');
  const totals = campaigns.reduce(
    (sum, campaign) => ({
      spent: sum.spent + campaign.spent,
      views: sum.views + campaign.verifiedViews,
      clips: sum.clips + campaign.clipCount,
    }),
    { spent: 0, views: 0, clips: 0 }
  );

  return (
    <Page>
      <PageHeader description="캠페인 현황을 한눈에 확인하세요." title={`${greetingFor(new Date())}, ${profile.display_name}님`} />
      <Stack>
        {!setupComplete && (
          <Checklist description="네 단계를 마치면 크리에이터들의 영상이 올라오기 시작해요." items={checklistItems} title="시작하기" />
        )}

        {campaigns.length > 0 && (
          <StatGrid>
            <StatCard highlight icon={<BroadcastIcon {...ICON} />} label="진행 중인 캠페인" tone="brand" value={live.length} />
            <StatCard icon={<WalletIcon {...ICON} />} label="사용한 예산" tone="violet" value={formatKRW(totals.spent)} />
            <StatCard icon={<EyeIcon {...ICON} />} label="검증 조회수" tone="sky" value={formatCompactNumber(totals.views)} />
            <StatCard icon={<FilmStripIcon {...ICON} />} label="받은 클립" tone="amber" value={totals.clips} />
          </StatGrid>
        )}

        <section>
          <SectionHeader
            action={campaigns.length > 5 ? <Link className="cl-link" href="/brand/campaigns">전체 보기</Link> : undefined}
            title="최근 캠페인"
          />
          {campaigns.length > 0 ? (
            <CampaignTable campaigns={campaigns.slice(0, 5)} />
          ) : (
            <Card>
              <EmptyState
                action={<ButtonLink href="/brand/campaigns/new" variant="primary">캠페인 만들기</ButtonLink>}
                description="예산을 걸면 크리에이터들이 숏폼을 만들어 올리고, 검증된 조회수만큼만 예산이 쓰여요."
                icon={<MegaphoneIcon size={24} />}
                title="첫 캠페인을 만들어 보세요"
              />
            </Card>
          )}
        </section>
      </Stack>
    </Page>
  );
}

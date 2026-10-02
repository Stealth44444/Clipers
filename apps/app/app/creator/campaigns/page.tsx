import { Megaphone } from 'lucide-react';
import { categoryLabel, kstDayStart, platformLabels, submissionsLeftToday } from '@clipers/db';
import {
  Badge,
  ButtonLink,
  Card,
  CardGrid,
  EmptyState,
  List,
  ListRow,
  MediaCard,
  Page,
  PageHeader,
  SectionHeader,
  Stack,
} from '@clipers/ui';
import { getSession } from '@/lib/session';
import { cpmRangeLabel } from '@/lib/rates';
import { APPLICATION_STATUS, CREATOR_CONTENT_TYPE_LABEL, statusDisplay } from '@/lib/status';
import { siteUrl } from '@/lib/urls';
import ApplyButton from './apply-button';
import SubmitClipDialog from './submit-clip-dialog';

type Campaign = {
  id: string;
  title: string;
  category: string;
  content_type: string;
  allowed_platforms: string[];
  cover_image_url: string | null;
  review_sla_hours: number;
};

type Application = {
  id: string;
  campaign_id: string;
  status: string;
  campaign: (Pick<Campaign, 'title' | 'category' | 'allowed_platforms'> & { daily_clip_limit: number | null }) | null;
};

const CAP_NOTE: Record<string, string> = {
  near: '이 캠페인에서 받을 수 있는 금액에 거의 다다랐어요',
  reached: '이 캠페인에서 받을 수 있는 금액을 모두 받았어요. 다른 캠페인에도 참여해 보세요',
};

export default async function CreatorCampaignsPage() {
  const { supabase, user } = await getSession();
  const [liveCampaigns, applications] = await Promise.all([
    supabase
      .from('campaigns')
      .select('id, title, category, content_type, allowed_platforms, cover_image_url, review_sla_hours')
      .eq('track', 'self_serve')
      .eq('status', 'live')
      .order('created_at', { ascending: false }),
    supabase
      .from('campaign_applications')
      .select('id, campaign_id, status, campaign:campaigns!campaign_applications_campaign_id_fkey(title, category, allowed_platforms, daily_clip_limit)')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  const campaigns = (liveCampaigns.data ?? []) as Campaign[];
  const myApplications = (applications.data ?? []) as unknown as Application[];
  const appliedIds = new Set(myApplications.map((application) => application.campaign_id));
  const available = campaigns.filter((campaign) => !appliedIds.has(campaign.id));

  // For approved campaigns: today's submissions (for the daily limit) and where the creator stands against their
  // per-campaign cap. The cap state is only 'ok' / 'near' / 'reached' — the amount is never sent to creators.
  const approvedIds = myApplications.filter((application) => application.status === 'approved').map((application) => application.campaign_id);
  const [todayClips, capStates] = approvedIds.length
    ? await Promise.all([
        supabase
          .from('clips')
          .select('campaign_id, status, submitted_at')
          .eq('creator_id', user.id)
          .in('campaign_id', approvedIds)
          .gte('submitted_at', kstDayStart().toISOString()),
        supabase.rpc('creator_campaign_cap_states', { p_campaign_ids: approvedIds }),
      ])
    : [{ data: [] }, { data: [] }];
  const clipsToday = (todayClips.data ?? []) as { campaign_id: string; status: string; submitted_at: string }[];
  const capState = new Map(((capStates.data ?? []) as { campaign_id: string; state: string }[]).map((row) => [row.campaign_id, row.state]));

  const { data: rateRows } = available.length
    ? await supabase.from('campaign_platform_rates').select('campaign_id, cpm_rate').in('campaign_id', available.map((campaign) => campaign.id))
    : { data: [] };
  const ratesByCampaign = new Map<string, number[]>();
  for (const row of rateRows ?? []) {
    ratesByCampaign.set(row.campaign_id, [...(ratesByCampaign.get(row.campaign_id) ?? []), Number(row.cpm_rate)]);
  }

  return (
    <Page>
      <PageHeader description="지원한 캠페인을 관리하고, 새 캠페인에 지원하세요." title="캠페인" />
      <Stack>
        {myApplications.length > 0 && (
          <section>
            <SectionHeader description="승인된 캠페인에 영상 링크를 제출할 수 있어요." title="참여 중인 캠페인" />
            <List>
              {myApplications.map((application) => {
                const status = statusDisplay(APPLICATION_STATUS, application.status);
                const campaign = application.campaign;
                return (
                  <ListRow
                    description={
                      [campaign ? `${categoryLabel(campaign.category)} · ${platformLabels(campaign.allowed_platforms)}` : null, CAP_NOTE[capState.get(application.campaign_id) ?? '']]
                        .filter(Boolean)
                        .join(' · ') || undefined
                    }
                    icon={<Megaphone size={16} />}
                    key={application.id}
                    title={campaign?.title ?? '캠페인'}
                    trailing={
                      application.status === 'approved' && campaign ? (
                        <SubmitClipDialog
                          campaignId={application.campaign_id}
                          campaignTitle={campaign.title}
                          creatorId={user.id}
                          dailyLimit={campaign.daily_clip_limit}
                          leftToday={submissionsLeftToday(
                            campaign.daily_clip_limit,
                            clipsToday.filter((clip) => clip.campaign_id === application.campaign_id)
                          )}
                          platforms={campaign.allowed_platforms}
                        />
                      ) : (
                        <Badge>{status.label}</Badge>
                      )
                    }
                  />
                );
              })}
            </List>
          </section>
        )}

        <section>
          <SectionHeader description="지원하면 운영팀이 검토한 뒤 결과를 알려 드려요." title="지원 가능한 캠페인" />
          {available.length > 0 ? (
            <CardGrid>
              {available.map((campaign) => {
                const rate = cpmRangeLabel(ratesByCampaign.get(campaign.id) ?? []);
                return (
                  <MediaCard
                    footer={
                      <>
                        <ButtonLink href={siteUrl(`/campaigns/${campaign.id}`)} variant="secondary">
                          자세히
                        </ButtonLink>
                        <ApplyButton campaignId={campaign.id} creatorId={user.id} />
                      </>
                    }
                    image={campaign.cover_image_url}
                    key={campaign.id}
                    meta={`${categoryLabel(campaign.category)} · ${CREATOR_CONTENT_TYPE_LABEL[campaign.content_type] ?? campaign.content_type}`}
                    title={campaign.title}
                  >
                    {rate && <p className="cl-number cl-emphasis">{rate}</p>}
                    <p className="cl-meta-subtle">
                      {platformLabels(campaign.allowed_platforms)} · 검수 {campaign.review_sla_hours}시간 이내
                    </p>
                  </MediaCard>
                );
              })}
            </CardGrid>
          ) : (
            <Card>
              <EmptyState
                description={
                  campaigns.length > 0 ? '지금 열린 캠페인에는 모두 지원했어요. 새 캠페인이 열리면 여기에 보여요.' : '새 캠페인이 열리면 여기에 보여요.'
                }
                icon={<Megaphone size={24} />}
                title="지원할 수 있는 캠페인이 없어요"
              />
            </Card>
          )}
        </section>
      </Stack>
    </Page>
  );
}

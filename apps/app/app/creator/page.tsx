import Link from 'next/link';
import { CircleUserRound, Eye, Film, Megaphone, Send, Wallet } from 'lucide-react';
import { creatorChecklist, platformLabel, summarizeEarnings } from '@clipers/db';
import {
  Badge,
  ButtonLink,
  Card,
  Checklist,
  DataTable,
  EmptyState,
  Page,
  PageHeader,
  SectionHeader,
  StatCard,
  StatGrid,
  Stack,
  formatCompactNumber,
  formatKRW,
  greetingFor,
  type ChecklistItem,
} from '@clipers/ui';
import { getSession } from '@/lib/session';
import { CLIP_STATUS, statusDisplay } from '@/lib/status';

type RecentClip = { id: string; platform: string; status: string; submitted_at: string; campaign: { title: string } | null };

const ICON = { size: 18 };

export default async function CreatorHomePage() {
  const { supabase, user, profile } = await getSession();
  const [applications, clips, settlements, recentClips] = await Promise.all([
    supabase.from('campaign_applications').select('status').eq('creator_id', user.id),
    supabase.from('clips').select('status').eq('creator_id', user.id),
    supabase.from('settlements').select('amount, status, period, verified_views').eq('creator_id', user.id),
    supabase
      .from('clips')
      .select('id, platform, status, submitted_at, campaign:campaigns!clips_campaign_id_fkey(title)')
      .eq('creator_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(5),
  ]);

  const applicationRows = applications.data ?? [];
  const clipRows = clips.data ?? [];
  const settlementRows = settlements.data ?? [];
  const earnings = summarizeEarnings(settlementRows);
  const verifiedViews = settlementRows.reduce((sum, row) => sum + Number(row.verified_views), 0);
  const steps = creatorChecklist({
    applications: applicationRows.length,
    clips: clipRows.length,
    settlements: settlementRows.length,
  });

  const STEP_CONTENT: Record<string, Omit<ChecklistItem, 'id' | 'done'>> = {
    account: { icon: <CircleUserRound {...ICON} />, title: '계정 만들기', description: '가입과 프로필 설정을 마쳤어요.' },
    apply: {
      icon: <Megaphone {...ICON} />,
      title: '캠페인에 지원하기',
      description: '관심 있는 캠페인에 지원하면 운영팀이 검토해요.',
      action: <ButtonLink href="/creator/campaigns" size="sm" variant="secondary">캠페인 보기</ButtonLink>,
    },
    submit: {
      icon: <Send {...ICON} />,
      title: '첫 클립 제출하기',
      description: '승인된 캠페인에 게시한 영상 링크를 제출하세요.',
      action: <ButtonLink href="/creator/campaigns" size="sm" variant="secondary">제출하기</ButtonLink>,
    },
    settle: {
      icon: <Wallet {...ICON} />,
      title: '첫 정산 받기',
      description: '검수를 통과한 클립의 조회수는 매주 정산돼요.',
    },
  };
  const checklistItems: ChecklistItem[] = steps.map((step) => ({ id: step.id, done: step.done, ...STEP_CONTENT[step.id] }));
  const setupComplete = steps.every((step) => step.done);
  const recent = (recentClips.data ?? []) as unknown as RecentClip[];

  return (
    <Page>
      <PageHeader description="오늘도 좋은 영상 기대할게요." title={`${greetingFor(new Date())}, ${profile.display_name}님`} />
      <Stack>
        {!setupComplete && (
          <Checklist description="네 단계만 마치면 첫 정산을 받을 수 있어요." items={checklistItems} title="시작하기" />
        )}

        <StatGrid>
          <StatCard highlight icon={<Wallet {...ICON} />} label="누적 정산액" tone="brand" value={formatKRW(earnings.total)} />
          <StatCard icon={<Eye {...ICON} />} label="검증 조회수" tone="sky" value={formatCompactNumber(verifiedViews)} />
          <StatCard
            icon={<Megaphone {...ICON} />}
            label="참여 캠페인"
            tone="violet"
            value={applicationRows.filter((row) => row.status === 'approved').length}
          />
          <StatCard icon={<Film {...ICON} />} label="제출한 클립" tone="amber" value={clipRows.length} />
        </StatGrid>

        <section>
          <SectionHeader
            action={recent.length > 0 ? <Link className="cl-link" href="/creator/submissions">전체 보기</Link> : undefined}
            title="최근 제출"
          />
          {recent.length > 0 ? (
            <DataTable
              columns={[
                { key: 'campaign', header: '캠페인', render: (clip) => clip.campaign?.title ?? '캠페인' },
                { key: 'platform', header: '플랫폼', render: (clip) => platformLabel(clip.platform) },
                {
                  key: 'submitted',
                  header: '제출일',
                  render: (clip) => new Date(clip.submitted_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }),
                },
                {
                  key: 'status',
                  header: '상태',
                  render: (clip) => {
                    const status = statusDisplay(CLIP_STATUS, clip.status);
                    return <Badge tone={status.tone}>{status.label}</Badge>;
                  },
                },
              ]}
              empty=""
              label="최근 제출한 클립"
              rowKey={(clip) => clip.id}
              rows={recent}
            />
          ) : (
            <Card>
              <EmptyState
                action={<ButtonLink href="/creator/campaigns" variant="primary">캠페인 둘러보기</ButtonLink>}
                description="캠페인에 지원하고 승인되면 영상 링크를 제출할 수 있어요."
                icon={<Film size={24} />}
                title="아직 제출한 클립이 없어요"
              />
            </Card>
          )}
        </section>
      </Stack>
    </Page>
  );
}

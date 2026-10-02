'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Clapperboard, Plus, Scissors, X } from 'lucide-react';
import {
  CAMPAIGN_DESCRIPTION_MAX,
  CAMPAIGN_REQUIREMENTS_MAX,
  CAMPAIGN_TITLE_MAX,
  DAILY_CLIP_LIMIT_OPTIONS,
  INTEREST_GROUPS,
  categoryLabel,
  INTERESTS,
  MAX_REFERENCE_LINKS,
  PLATFORMS,
  REVIEW_SLA_OPTIONS,
  campaignDraftProgress,
  clipCapToCreatorPayout,
  dailyClipLimitLabel,
  dailyClipLimitValue,
  expectedViews,
  filledReferenceLinks,
  firstCampaignDraftError,
  platformLabels,
  type CampaignDraft,
  type CampaignPricing,
} from '@clipers/db';
import {
  Button,
  Card,
  Chip,
  Dropzone,
  Field,
  IconButton,
  Input,
  OptionCard,
  ProgressBar,
  Select,
  StickyFooter,
  SummaryList,
  Textarea,
  formatKRW,
} from '@clipers/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

const MAX_COVER_BYTES = 5 * 1024 * 1024;
const CONTENT_TYPES = [
  { id: 'clipping', label: '클리핑', description: '제공한 영상을 크리에이터가 짧게 편집해 올려요.', icon: <Scissors size={18} /> },
  { id: 'ugc', label: 'UGC', description: '크리에이터가 제품·서비스를 직접 소개하는 영상을 만들어요.', icon: <Clapperboard size={18} /> },
] as const;

type Props = {
  brandId: string;
  campaignId?: string;
  initial: CampaignDraft;
  initialCoverUrl?: string | null;
  pricing: CampaignPricing;
};

export default function CampaignForm({ brandId, campaignId, initial, initialCoverUrl = null, pricing }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<CampaignDraft>(initial);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(initialCoverUrl);
  const [coverError, setCoverError] = useState('');
  const [saving, setSaving] = useState<'draft' | 'next' | null>(null);
  const [saveError, setSaveError] = useState('');

  const update = (patch: Partial<CampaignDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const firstError = firstCampaignDraftError(draft);
  const progress = campaignDraftProgress(draft);
  const budget = Number(draft.totalBudget) || 0;
  const views = expectedViews(budget, pricing);

  useEffect(() => {
    if (!coverFile) return;
    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  const categoryGroups = useMemo(
    () => INTEREST_GROUPS.map((group) => ({ ...group, options: INTERESTS.filter((interest) => interest.group === group.id) })),
    []
  );

  function chooseCover(file: File) {
    setCoverError('');
    if (!file.type.startsWith('image/')) return setCoverError('이미지 파일만 올릴 수 있어요.');
    if (file.size > MAX_COVER_BYTES) return setCoverError('5MB 이하 이미지를 올려 주세요.');
    setCoverFile(file);
  }

  async function save(intent: 'draft' | 'next') {
    if (firstError) return;
    setSaving(intent);
    setSaveError('');
    try {
      const supabase = getSupabaseBrowserClient();
      const fields = {
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        content_type: draft.contentType,
        category: draft.category,
        allowed_platforms: draft.platforms,
        total_budget: Number(draft.totalBudget),
        review_sla_hours: Number(draft.reviewSlaHours),
        daily_clip_limit: dailyClipLimitValue(draft),
        reference_links: filledReferenceLinks(draft.referenceLinks),
        content_requirements: draft.requirements.trim() || null,
      };

      let id = campaignId;
      if (id) {
        const { error } = await supabase.from('campaigns').update(fields).eq('id', id).eq('status', 'draft');
        if (error) throw error;
        const { error: deleteError } = await supabase.from('campaign_platform_rates').delete().eq('campaign_id', id);
        if (deleteError) throw deleteError;
      } else {
        const { data, error } = await supabase
          .from('campaigns')
          .insert({ ...fields, brand_id: brandId, track: 'self_serve', status: 'draft' })
          .select('id')
          .single();
        if (error) throw error;
        id = data.id as string;
      }

      // cpm_rate is overwritten from the campaign's creator rate by a database trigger.
      const maxPayout = clipCapToCreatorPayout(Number(draft.maxPayoutPerClip), pricing);
      const { error: ratesError } = await supabase
        .from('campaign_platform_rates')
        .insert(draft.platforms.map((platform) => ({ campaign_id: id, platform, cpm_rate: pricing.creatorCpm, max_payout: maxPayout })));
      if (ratesError) throw ratesError;

      if (coverFile) {
        const path = `${brandId}/${id}`;
        const { error: uploadError } = await supabase.storage.from('campaign-banners').upload(path, coverFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: publicUrl } = supabase.storage.from('campaign-banners').getPublicUrl(path);
        const { error: coverUpdateError } = await supabase
          .from('campaigns')
          .update({ cover_image_url: `${publicUrl.publicUrl}?v=${Date.now()}` })
          .eq('id', id);
        if (coverUpdateError) throw coverUpdateError;
      }

      router.push(intent === 'next' ? `/brand/campaigns/${id}` : '/brand/campaigns');
      router.refresh();
    } catch {
      setSaveError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
      setSaving(null);
    }
  }

  return (
    <div className="cl-editor">
      <header className="cl-editor__header">
        <Link className="cl-editor__back" href={campaignId ? `/brand/campaigns/${campaignId}` : '/brand/campaigns'}>
          <ChevronLeft size={18} />
          {campaignId ? '캠페인' : '캠페인 목록'}
        </Link>
        <h1 className="cl-editor__title">{campaignId ? '캠페인 수정' : '새 캠페인'}</h1>
        <span className="cl-meta cl-number cl-editor__count">
          {progress.done}/{progress.total} 완료
        </span>
      </header>
      <div className="cl-editor__progress">
        <ProgressBar bare label="작성 진행도" value={progress.done / progress.total} />
      </div>

      <div className="cl-editor__body">
        <div className="cl-editor__main">
          <Section description="크리에이터가 캠페인 목록에서 가장 먼저 보는 내용이에요." title="기본 정보">
            <Field count={draft.title.length} htmlFor="campaign-title" label="캠페인 이름" maxLength={CAMPAIGN_TITLE_MAX}>
              <Input
                id="campaign-title"
                maxLength={CAMPAIGN_TITLE_MAX}
                onChange={(event) => update({ title: event.target.value })}
                placeholder="예: 신곡 '여름밤' 숏폼 챌린지"
                value={draft.title}
              />
            </Field>
            <Field count={draft.description.length} htmlFor="campaign-description" label="설명" maxLength={CAMPAIGN_DESCRIPTION_MAX}>
              <Textarea
                id="campaign-description"
                maxLength={CAMPAIGN_DESCRIPTION_MAX}
                onChange={(event) => update({ description: event.target.value })}
                placeholder="어떤 브랜드·아티스트인지, 이번 캠페인으로 무엇을 알리고 싶은지 적어 주세요."
                value={draft.description}
              />
            </Field>
          </Section>

          <Section title="콘텐츠">
            <div aria-label="콘텐츠 유형" className="cl-option-grid" role="radiogroup">
              {CONTENT_TYPES.map((type) => (
                <OptionCard
                  description={type.description}
                  icon={type.icon}
                  key={type.id}
                  onSelect={() => update({ contentType: type.id })}
                  selected={draft.contentType === type.id}
                  title={type.label}
                />
              ))}
            </div>
            <Field htmlFor="campaign-category" label="카테고리">
              <Select id="campaign-category" onChange={(event) => update({ category: event.target.value })} value={draft.category}>
                <option value="">카테고리 선택</option>
                {categoryGroups.map((group) => (
                  <optgroup key={group.id} label={group.label}>
                    {group.options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
          </Section>

          <Section description="캠페인 카드와 상세 페이지 상단에 보여요. 16:9 비율을 권장해요." title="썸네일">
            {coverPreview && <img alt="썸네일 미리보기" className="cl-cover-preview" src={coverPreview} />}
            <Dropzone
              accept="image/*"
              fileName={coverFile?.name}
              hint="PNG, JPG · 5MB 이하"
              onFile={chooseCover}
              title={coverPreview ? '다른 이미지로 바꾸기' : '이미지를 끌어다 놓거나 눌러서 고르기'}
            />
            {coverError && (
              <p className="cl-alert cl-tone-tomato" role="alert">
                {coverError}
              </p>
            )}
          </Section>

          <Section description="크리에이터가 영상을 올릴 수 있는 플랫폼이에요." title="플랫폼">
            <div aria-label="플랫폼" className="cl-chip-group" role="group">
              {PLATFORMS.map((platform) => {
                const selected = draft.platforms.includes(platform.value);
                return (
                  <Chip
                    key={platform.value}
                    onToggle={() =>
                      update({
                        platforms: selected
                          ? draft.platforms.filter((value) => value !== platform.value)
                          : [...draft.platforms, platform.value],
                      })
                    }
                    selected={selected}
                  >
                    {platform.label}
                  </Chip>
                );
              })}
            </div>
          </Section>

          <Section description={`검증된 조회수 1천 회당 ${formatKRW(pricing.brandCpm)}씩 예산이 쓰여요. 쓰지 않은 예산은 남아 있어요.`} title="예산">
            <div className="cl-form-row">
              <Field hint={views > 0 ? `예상 조회수 약 ${views.toLocaleString('ko-KR')}회` : '최소 1,000,000원'} htmlFor="campaign-budget" label="총예산 (원, 부가세 별도)">
                <Input
                  id="campaign-budget"
                  inputMode="numeric"
                  min={0}
                  onChange={(event) => update({ totalBudget: event.target.value })}
                  placeholder="1000000"
                  type="number"
                  value={draft.totalBudget}
                />
              </Field>
              <Field hint="영상 하나가 예산을 독차지하지 않도록 막아요. 최소 3,000원" htmlFor="campaign-clip-cap" label="클립당 최대 예산 (원)">
                <Input
                  id="campaign-clip-cap"
                  inputMode="numeric"
                  min={0}
                  onChange={(event) => update({ maxPayoutPerClip: event.target.value })}
                  placeholder="300000"
                  type="number"
                  value={draft.maxPayoutPerClip}
                />
              </Field>
            </div>
            <p className="cl-meta">한 크리에이터에게 예산이 몰리지 않도록, 한 명이 받을 수 있는 금액에도 상한이 있어요.</p>
            <Field hint="제출된 영상을 운영팀이 이 시간 안에 검수해요." htmlFor="campaign-sla" label="검수 기간">
              <Select id="campaign-sla" onChange={(event) => update({ reviewSlaHours: event.target.value })} value={draft.reviewSlaHours}>
                {REVIEW_SLA_OPTIONS.map((hours) => (
                  <option key={hours} value={String(hours)}>
                    {hours}시간
                  </option>
                ))}
              </Select>
            </Field>
            <Field hint="한 크리에이터가 하루에 올릴 수 있는 영상 수예요. 반려된 영상은 세지 않아요." htmlFor="campaign-daily-limit" label="크리에이터 1명당 하루 제출 한도">
              <Select id="campaign-daily-limit" onChange={(event) => update({ dailyClipLimit: event.target.value })} value={draft.dailyClipLimit}>
                {DAILY_CLIP_LIMIT_OPTIONS.map((count) => (
                  <option key={count} value={String(count)}>
                    {count}개
                  </option>
                ))}
                <option value="none">제한 없음</option>
              </Select>
            </Field>
          </Section>

          <Section description="원본 영상, 음원, 브랜드 가이드 같은 링크를 넣어 주세요." title="참고 링크">
            {draft.referenceLinks.map((link, index) => (
              <div className="cl-link-row" key={index}>
                <Input
                  aria-label={`참고 링크 ${index + 1}`}
                  onChange={(event) =>
                    update({ referenceLinks: draft.referenceLinks.map((value, position) => (position === index ? event.target.value : value)) })
                  }
                  placeholder="https://"
                  type="url"
                  value={link}
                />
                {draft.referenceLinks.length > 1 && (
                  <IconButton
                    label={`참고 링크 ${index + 1} 삭제`}
                    onClick={() => update({ referenceLinks: draft.referenceLinks.filter((_, position) => position !== index) })}
                  >
                    <X size={16} />
                  </IconButton>
                )}
              </div>
            ))}
            {draft.referenceLinks.length < MAX_REFERENCE_LINKS && (
              <div>
                <Button icon={<Plus size={15} />} onClick={() => update({ referenceLinks: [...draft.referenceLinks, ''] })} size="sm" variant="ghost">
                  링크 추가
                </Button>
              </div>
            )}
          </Section>

          <Section description="꼭 지켜야 하는 조건을 적어 주세요. 검수 기준이 돼요." title="콘텐츠 요구사항">
            <Field count={draft.requirements.length} htmlFor="campaign-requirements" label="요구사항" maxLength={CAMPAIGN_REQUIREMENTS_MAX}>
              <Textarea
                id="campaign-requirements"
                maxLength={CAMPAIGN_REQUIREMENTS_MAX}
                onChange={(event) => update({ requirements: event.target.value })}
                placeholder={'예: 음원 후렴을 15초 이상 사용\n영상 설명에 #여름밤챌린지 포함'}
                value={draft.requirements}
              />
            </Field>
          </Section>
        </div>

        <aside className="cl-editor__aside">
          <Card title="요약">
            <SummaryList
              rows={[
                { label: '과금 방식', value: `조회수 1천 회당 ${formatKRW(pricing.brandCpm)}` },
                { label: '공개 범위', value: '공개 · 지원서 심사 후 참여' },
                { label: '이름', value: draft.title.trim() || '—' },
                { label: '유형', value: CONTENT_TYPES.find((type) => type.id === draft.contentType)?.label ?? '—' },
                { label: '카테고리', value: draft.category ? categoryLabel(draft.category) : '—' },
                { label: '플랫폼', value: draft.platforms.length > 0 ? platformLabels(draft.platforms) : '—' },
                { label: '예산', value: budget > 0 ? formatKRW(budget) : '—' },
                { label: '예상 조회수', value: views > 0 ? `${views.toLocaleString('ko-KR')}회` : '—' },
                { label: '하루 제출 한도', value: dailyClipLimitLabel(dailyClipLimitValue(draft)) },
              ]}
            />
          </Card>
        </aside>
      </div>

      <StickyFooter message={saveError || firstError}>
        <Button disabled={!!firstError || saving !== null} onClick={() => void save('draft')} variant="secondary">
          {saving === 'draft' ? '저장 중…' : '임시저장'}
        </Button>
        <Button disabled={!!firstError || saving !== null} onClick={() => void save('next')} variant="primary">
          {saving === 'next' ? '저장 중…' : '다음: 입금 안내'}
        </Button>
      </StickyFooter>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card description={description} title={title}>
      <div className="cl-stack-tight">{children}</div>
    </Card>
  );
}

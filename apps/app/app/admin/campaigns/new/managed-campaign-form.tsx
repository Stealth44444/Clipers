'use client';

import { useActionState } from 'react';
import { DAILY_CLIP_LIMIT_OPTIONS, INTERESTS, MANAGED_DEFAULT_PRICING, PLATFORMS, REVIEW_SLA_OPTIONS } from '@clipers/db';
import { Button, Card, Field, Input, Select, Textarea } from '@clipers/ui';
import { createManagedCampaign, type ManagedCampaignState } from './actions';

export type BrandOption = { id: string; label: string };

/** Contract terms for a brand's campaign; the same checks as the brand's own form, plus the contract rates. */
export default function ManagedCampaignForm({ brands }: { brands: BrandOption[] }) {
  const [state, formAction, pending] = useActionState<ManagedCampaignState, FormData>(createManagedCampaign, null);

  return (
    <form action={formAction} className="cl-stack">
      <Card description="계약한 브랜드의 계정을 고르세요. 브랜드는 자기 화면에서 이 캠페인과 결과를 봐요." title="브랜드">
        <Field htmlFor="managed-brand" label="브랜드 계정">
          <Select defaultValue="" id="managed-brand" name="brandId" required>
            <option value="">브랜드 선택</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.label}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      <Card title="캠페인">
        <div className="cl-stack-tight">
          <Field htmlFor="managed-title" label="캠페인 이름">
            <Input id="managed-title" maxLength={80} name="title" required />
          </Field>
          <div className="cl-form-row">
            <Field htmlFor="managed-type" label="콘텐츠 유형">
              <Select defaultValue="clipping" id="managed-type" name="contentType">
                <option value="clipping">클리핑</option>
                <option value="ugc">UGC</option>
              </Select>
            </Field>
            <Field htmlFor="managed-category" label="카테고리">
              <Select defaultValue="" id="managed-category" name="category" required>
                <option value="">카테고리 선택</option>
                {INTERESTS.map((interest) => (
                  <option key={interest.id} value={interest.id}>
                    {interest.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field htmlFor="managed-description" label="설명">
            <Textarea id="managed-description" maxLength={2000} name="description" />
          </Field>
          <Field htmlFor="managed-requirements" label="요구사항">
            <Textarea id="managed-requirements" maxLength={2000} name="requirements" />
          </Field>
          <Field hint="여러 개면 줄을 바꾸거나 띄어서 넣어 주세요." htmlFor="managed-links" label="참고 링크">
            <Textarea id="managed-links" name="referenceLinks" />
          </Field>
          <fieldset className="cl-inline">
            <legend className="cl-field__label">플랫폼</legend>
            {PLATFORMS.map((platform) => (
              <label className="cl-inline" key={platform.value}>
                <input name="platforms" type="checkbox" value={platform.value} /> {platform.label}
              </label>
            ))}
          </fieldset>
        </div>
      </Card>

      <Card description="계약한 조건대로 넣어 주세요. 크리에이터 단가는 마켓에 공개되고, 브랜드 단가는 공개되지 않아요." title="예산과 단가">
        <div className="cl-stack-tight">
          <div className="cl-form-row">
            <Field hint="부가세 별도" htmlFor="managed-budget" label="총예산">
              <Input id="managed-budget" inputMode="numeric" min={1000000} name="totalBudget" required type="number" />
            </Field>
            <Field hint="브랜드 지출 기준" htmlFor="managed-cap" label="클립당 최대 예산">
              <Input id="managed-cap" inputMode="numeric" min={1} name="maxPayoutPerClip" required type="number" />
            </Field>
          </div>
          <div className="cl-form-row">
            <Field hint="검증 조회수 1천 회당" htmlFor="managed-brand-cpm" label="브랜드 단가">
              <Input defaultValue={MANAGED_DEFAULT_PRICING.brandCpm} id="managed-brand-cpm" inputMode="numeric" min={1} name="brandCpm" required type="number" />
            </Field>
            <Field hint="검증 조회수 1천 회당" htmlFor="managed-creator-cpm" label="크리에이터 단가">
              <Input defaultValue={MANAGED_DEFAULT_PRICING.creatorCpm} id="managed-creator-cpm" inputMode="numeric" min={1} name="creatorCpm" required type="number" />
            </Field>
          </div>
          <div className="cl-form-row">
            <Field htmlFor="managed-sla" label="검수 기간">
              <Select defaultValue="48" id="managed-sla" name="reviewSlaHours">
                {REVIEW_SLA_OPTIONS.map((hours) => (
                  <option key={hours} value={hours}>
                    제출 후 {hours}시간 이내
                  </option>
                ))}
              </Select>
            </Field>
            <Field htmlFor="managed-daily" label="하루 제출 한도">
              <Select defaultValue="3" id="managed-daily" name="dailyClipLimit">
                {DAILY_CLIP_LIMIT_OPTIONS.map((limit) => (
                  <option key={limit} value={limit}>
                    1명당 하루 {limit}개
                  </option>
                ))}
                <option value="none">제한 없음</option>
              </Select>
            </Field>
          </div>
        </div>
      </Card>

      {state && (
        <p className="cl-alert cl-tone-tomato" role="alert">
          {state.message}
        </p>
      )}
      <div>
        <Button disabled={pending} type="submit" variant="primary">
          {pending ? '만드는 중…' : '입금 확인 대기로 만들기'}
        </Button>
      </div>
    </form>
  );
}

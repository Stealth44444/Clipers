'use client';

import { useActionState } from 'react';
import { Button, Field, Input, Select, StatusDot, Textarea } from '@clipers/ui';
import { submitInquiry, type ContactState } from '@/app/contact/actions';
import { INQUIRY_INDUSTRIES, INQUIRY_LIMITS } from '@/lib/inquiry';

const INITIAL: ContactState = { status: 'idle', errors: {} };

export default function ContactForm({ sourcePath, industry }: { sourcePath?: string; industry?: string }) {
  const [state, action, pending] = useActionState(submitInquiry, INITIAL);

  if (state.status === 'done') {
    return (
      <div className="cl-contact__done" role="status">
        <StatusDot tone="green">문의를 받았어요</StatusDot>
        <p>영업일 기준으로 이메일로 답해 드릴게요.</p>
      </div>
    );
  }

  const error = (field: keyof ContactState['errors']) => state.errors[field] ?? null;
  const typed = (field: string) => state.values?.[field];

  return (
    <form action={action} className="cl-contact__form" key={state.attempt ?? 0} noValidate>
      <input name="sourcePath" type="hidden" value={sourcePath ?? ''} />
      {/* Honeypot: hidden from people and screen readers; bots fill every field. */}
      <div aria-hidden className="cl-contact__trap">
        <label>
          웹사이트
          <input autoComplete="off" name="website" tabIndex={-1} type="text" />
        </label>
      </div>

      <div className="cl-contact__row">
        <Field error={error('company')} htmlFor="contact-company" label="회사·기관명">
          <Input autoComplete="organization" defaultValue={typed('company')} id="contact-company" maxLength={INQUIRY_LIMITS.company} name="company" required />
        </Field>
        <Field error={error('contactName')} htmlFor="contact-name" label="담당자 이름">
          <Input autoComplete="name" defaultValue={typed('contactName')} id="contact-name" maxLength={INQUIRY_LIMITS.contactName} name="contactName" required />
        </Field>
      </div>
      <div className="cl-contact__row">
        <Field error={error('email')} htmlFor="contact-email" label="이메일">
          <Input autoComplete="email" defaultValue={typed('email')} id="contact-email" maxLength={INQUIRY_LIMITS.email} name="email" required type="email" />
        </Field>
        <Field error={error('phone')} hint="선택" htmlFor="contact-phone" label="전화번호">
          <Input autoComplete="tel" defaultValue={typed('phone')} id="contact-phone" maxLength={INQUIRY_LIMITS.phone} name="phone" type="tel" />
        </Field>
      </div>
      <Field error={error('industry')} htmlFor="contact-industry" label="업종">
        <Select defaultValue={typed('industry') ?? industry ?? ''} id="contact-industry" name="industry" required>
          <option disabled value="">
            업종을 골라 주세요
          </option>
          {INQUIRY_INDUSTRIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
      </Field>
      <Field error={error('message')} htmlFor="contact-message" label="문의 내용">
        <Textarea
          defaultValue={typed('message')}
          id="contact-message"
          maxLength={INQUIRY_LIMITS.message}
          name="message"
          placeholder="알리고 싶은 영상이나 제품, 생각 중인 일정과 예산을 적어 주시면 더 빠르게 답해 드릴 수 있어요."
          required
          rows={6}
        />
      </Field>

      <label className="cl-contact__consent">
        <input name="consent" required type="checkbox" />
        <span>
          개인정보 수집·이용에 동의해요. <small>수집 항목: 회사·기관명, 담당자 이름, 이메일, 전화번호(선택) · 목적: 상담 문의 답변 · 보유 기간: 답변 후 1년 뒤 삭제. 동의하지 않으면 문의를 남길 수 없어요.</small>
        </span>
      </label>
      {error('consent') && <p className="cl-field__error">{error('consent')}</p>}

      {state.status === 'error' && state.message && (
        <p className="cl-contact__message" role="alert">
          {state.message}
        </p>
      )}
      <Button disabled={pending} size="lg" type="submit" variant="primary">
        {pending ? '보내는 중…' : '문의 보내기'}
      </Button>
    </form>
  );
}

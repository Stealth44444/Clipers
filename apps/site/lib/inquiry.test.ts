import { describe, expect, it } from 'vitest';
import { INQUIRY_INDUSTRIES, inquirySlackText, validateInquiry } from './inquiry';

const valid = {
  company: '오토랩',
  contactName: '김담당',
  email: 'team@autolab.kr',
  phone: '',
  industry: '브랜드·소비재·D2C',
  message: '신차 런칭 영상으로 클리핑 캠페인을 열고 싶어요.',
  consent: 'on',
  website: '',
};

describe('validateInquiry', () => {
  it('accepts a complete inquiry and trims it', () => {
    const result = validateInquiry({ ...valid, company: '  오토랩  ' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.company).toBe('오토랩');
      expect(result.value.phone).toBeNull();
    }
  });

  it('reports each problem in Korean', () => {
    const result = validateInquiry({ ...valid, company: '', email: 'not-an-email', industry: '우주', message: '짧아요', consent: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual({
        company: '회사·기관명을 입력해 주세요.',
        email: '이메일 주소를 확인해 주세요.',
        industry: '업종을 골라 주세요.',
        message: '문의 내용을 10자 이상 적어 주세요.',
        consent: '개인정보 수집·이용에 동의해 주세요.',
      });
    }
  });

  it('flags the honeypot as spam without listing it as an error', () => {
    const result = validateInquiry({ ...valid, website: 'http://spam.example' });
    expect(result).toEqual({ ok: false, spam: true, errors: {} });
  });

  it('lists the advertiser industries plus 기타', () => {
    expect(INQUIRY_INDUSTRIES).toHaveLength(12);
    expect(INQUIRY_INDUSTRIES.at(-1)).toBe('기타');
  });
});

describe('inquirySlackText', () => {
  it('summarises the inquiry for the ops channel', () => {
    const result = validateInquiry(valid);
    if (!result.ok) throw new Error('expected valid');
    expect(inquirySlackText(result.value)).toContain('새 상담 문의 — 오토랩 (브랜드·소비재·D2C)');
    expect(inquirySlackText(result.value)).toContain('team@autolab.kr');
  });
});

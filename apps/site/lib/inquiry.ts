// Contact-form input, checked the same way on every submit. `website` is a honeypot: people never see it, bots fill it.

export const INQUIRY_INDUSTRIES = [
  '브랜드·소비재·D2C',
  '방송국·OTT·제작사',
  '영화 제작·배급사',
  '음반사·기획사·아티스트',
  '스트리머·유튜버',
  '게임사',
  '앱·스타트업·커뮤니티',
  '웹툰·출판·교육',
  '스포츠·공연·페스티벌',
  '지자체·관광',
  '에이전시·MCN',
  '기타',
] as const;

export const INQUIRY_LIMITS = { company: 100, contactName: 50, email: 200, phone: 30, message: 2000 } as const;

export type InquiryField = 'company' | 'contactName' | 'email' | 'phone' | 'industry' | 'message' | 'consent';

export type Inquiry = {
  company: string;
  contactName: string;
  email: string;
  phone: string | null;
  industry: string;
  message: string;
};

export type InquiryResult =
  | { ok: true; value: Inquiry }
  | { ok: false; spam?: true; errors: Partial<Record<InquiryField, string>> };

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export function validateInquiry(input: Record<string, unknown>): InquiryResult {
  if (text(input.website)) return { ok: false, spam: true, errors: {} };

  const value: Inquiry = {
    company: text(input.company),
    contactName: text(input.contactName),
    email: text(input.email),
    phone: text(input.phone) || null,
    industry: text(input.industry),
    message: text(input.message),
  };
  const errors: Partial<Record<InquiryField, string>> = {};

  if (!value.company) errors.company = '회사·기관명을 입력해 주세요.';
  else if (value.company.length > INQUIRY_LIMITS.company) errors.company = `회사·기관명은 ${INQUIRY_LIMITS.company}자 이하로 적어 주세요.`;

  if (!value.contactName) errors.contactName = '담당자 이름을 입력해 주세요.';
  else if (value.contactName.length > INQUIRY_LIMITS.contactName) errors.contactName = `담당자 이름은 ${INQUIRY_LIMITS.contactName}자 이하로 적어 주세요.`;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) || value.email.length > INQUIRY_LIMITS.email) errors.email = '이메일 주소를 확인해 주세요.';

  if (value.phone && value.phone.length > INQUIRY_LIMITS.phone) errors.phone = '전화번호를 확인해 주세요.';

  if (!(INQUIRY_INDUSTRIES as readonly string[]).includes(value.industry)) errors.industry = '업종을 골라 주세요.';

  if (value.message.length < 10) errors.message = '문의 내용을 10자 이상 적어 주세요.';
  else if (value.message.length > INQUIRY_LIMITS.message) errors.message = `문의 내용은 ${INQUIRY_LIMITS.message.toLocaleString('ko-KR')}자 이하로 적어 주세요.`;

  if (text(input.consent) !== 'on') errors.consent = '개인정보 수집·이용에 동의해 주세요.';

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value };
}

export function inquirySlackText(inquiry: Inquiry): string {
  return [
    `:incoming_envelope: 새 상담 문의 — ${inquiry.company} (${inquiry.industry})`,
    `담당자: ${inquiry.contactName} · ${inquiry.email}${inquiry.phone ? ` · ${inquiry.phone}` : ''}`,
    inquiry.message,
  ].join('\n');
}
